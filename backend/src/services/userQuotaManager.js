const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const DATA_FILE = path.join(__dirname, '../../data/user_quotas.json');

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

class UserQuotaManager {
  constructor() {
    this.userDailyLimit = parseInt(process.env.AI_DAILY_QUESTION_LIMIT_PER_USER || '10', 10);
    this.targetUsers = parseInt(process.env.AI_DAILY_TARGET_USERS || '10', 10);
    this.globalDailyTarget = parseInt(process.env.AI_DAILY_TARGET_ANSWERS || '100', 10);
    this.maxPerMinute = parseInt(process.env.AI_MAX_REQUESTS_PER_MINUTE || '15', 10);
    this.reloadConfig();
    this.state = this._loadState();
  }

  reloadConfig() {
    this.userDailyLimit = parseInt(process.env.AI_DAILY_QUESTION_LIMIT_PER_USER || '10', 10);
    this.targetUsers = parseInt(process.env.AI_DAILY_TARGET_USERS || '10', 10);
    this.globalDailyTarget = parseInt(process.env.AI_DAILY_TARGET_ANSWERS || '100', 10);
    this.maxPerMinute = parseInt(process.env.AI_MAX_REQUESTS_PER_MINUTE || '15', 10);
    this.maxInputChars = parseInt(process.env.AI_MAX_INPUT_CHARACTERS || '1500', 10);
  }

  _loadState() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        const today = getTodayKey();
        if (parsed.date === today) {
          // Clear any dangling reservations from server restarts
          if (parsed.users) {
            for (const uid of Object.keys(parsed.users)) {
              parsed.users[uid].reserved = 0;
            }
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to read user quotas file, initializing fresh state:', e.message);
    }

    return {
      date: getTodayKey(),
      globalSuccessfulAnswers: 0,
      users: {}
    };
  }

  _saveState() {
    try {
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.state, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to save user quota state:', e.message);
    }
  }

  _checkRollover() {
    const today = getTodayKey();
    if (this.state.date !== today) {
      this.state = {
        date: today,
        globalSuccessfulAnswers: 0,
        users: {}
      };
      this._saveState();
    }
  }

  _getUserRecord(userId) {
    if (!this.state.users[userId]) {
      this.state.users[userId] = {
        successfulAnswers: 0,
        reserved: 0,
        lastRequestTimestamp: 0,
        minuteWindowStart: Date.now(),
        minuteRequestCount: 0
      };
    }
    return this.state.users[userId];
  }

  getTotalReserved() {
    let total = 0;
    for (const uid of Object.keys(this.state.users)) {
      total += this.state.users[uid].reserved || 0;
    }
    return total;
  }

  reserve(userId = 'default_user', inputLength = 0) {
    this._checkRollover();
    this.reloadConfig();

    if (inputLength > this.maxInputChars) {
      return {
        allowed: false,
        error: `Input is too long (${inputLength} characters). Maximum allowed is ${this.maxInputChars} characters.`
      };
    }

    const user = this._getUserRecord(userId);
    const now = Date.now();

    // Short-window per-minute rate limiting
    if (now - user.minuteWindowStart > 60000) {
      user.minuteWindowStart = now;
      user.minuteRequestCount = 0;
    }

    if (user.minuteRequestCount >= this.maxPerMinute) {
      return {
        allowed: false,
        error: 'Too many requests in a short time. Please wait 1 minute before asking another question.'
      };
    }

    // Individual daily user limit check
    const currentEffective = user.successfulAnswers + user.reserved;
    if (currentEffective >= this.userDailyLimit) {
      return {
        allowed: false,
        error: `Daily limit of ${this.userDailyLimit} AI answers reached for today. Limit resets tomorrow. All 600 formulas, bookmarks, and search remain available offline!`
      };
    }

    // Global daily capacity check
    const totalReserved = this.getTotalReserved();
    const effectiveGlobal = this.state.globalSuccessfulAnswers + totalReserved;
    if (effectiveGlobal >= this.globalDailyTarget) {
      return {
        allowed: false,
        error: `Global AI capacity reached for today (${this.globalDailyTarget} answers). You can continue studying all 600 offline formulas!`
      };
    }

    // Fair share reservation:
    // If remaining global capacity is running low (< 20% of target), prevent single heavy users
    // who already had >= 5 answers from taking slots reserved for fresh users (who have < 2).
    const remainingGlobal = this.globalDailyTarget - effectiveGlobal;
    const reservedPoolForNewUsers = Math.floor(this.targetUsers * 0.2) * 2; // e.g., 8 slots
    if (remainingGlobal <= reservedPoolForNewUsers && user.successfulAnswers >= 5) {
      return {
        allowed: false,
        error: `Daily shared AI capacity is reserved for remaining active learners. Please continue practicing with offline formulas!`
      };
    }

    // Atomic reservation
    user.reserved++;
    user.minuteRequestCount++;
    user.lastRequestTimestamp = now;

    this._saveState();

    return {
      allowed: true,
      remainingToday: Math.max(0, this.userDailyLimit - (user.successfulAnswers + user.reserved))
    };
  }

  commit(userId = 'default_user') {
    this._checkRollover();
    const user = this._getUserRecord(userId);
    user.reserved = Math.max(0, user.reserved - 1);
    user.successfulAnswers++;
    this.state.globalSuccessfulAnswers++;
    this._saveState();

    return {
      successfulAnswers: user.successfulAnswers,
      remainingToday: Math.max(0, this.userDailyLimit - user.successfulAnswers)
    };
  }

  release(userId = 'default_user') {
    this._checkRollover();
    const user = this._getUserRecord(userId);
    user.reserved = Math.max(0, user.reserved - 1);
    this._saveState();

    return {
      successfulAnswers: user.successfulAnswers,
      remainingToday: Math.max(0, this.userDailyLimit - user.successfulAnswers)
    };
  }

  getUserQuota(userId = 'default_user') {
    this._checkRollover();
    this.reloadConfig();
    const user = this._getUserRecord(userId);
    return {
      userId,
      date: this.state.date,
      count: user.successfulAnswers,
      limit: this.userDailyLimit,
      remaining: Math.max(0, this.userDailyLimit - user.successfulAnswers)
    };
  }

  getGlobalMetrics() {
    this._checkRollover();
    const activeUserCount = Object.keys(this.state.users).length;
    let usersExhausted = 0;
    for (const uid of Object.keys(this.state.users)) {
      if (this.state.users[uid].successfulAnswers >= this.userDailyLimit) {
        usersExhausted++;
      }
    }

    return {
      date: this.state.date,
      globalSuccessfulAnswers: this.state.globalSuccessfulAnswers,
      globalDailyTarget: this.globalDailyTarget,
      userDailyLimit: this.userDailyLimit,
      targetUsers: this.targetUsers,
      activeUsersCount: activeUserCount,
      usersExhaustedCount: usersExhausted,
      totalPendingReservations: this.getTotalReserved()
    };
  }

  // Helper for test cleanup
  reset() {
    this.state = {
      date: getTodayKey(),
      globalSuccessfulAnswers: 0,
      users: {}
    };
    this._saveState();
  }
}

module.exports = new UserQuotaManager();
