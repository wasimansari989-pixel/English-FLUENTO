// Live Voice Quota & Concurrent Session Manager
// Enforces per-user daily limits, session length caps, and global budgets safely.

class LiveQuotaManager {
  constructor() {
    this.maxSessionSeconds = parseInt(process.env.LIVE_MAX_SESSION_SECONDS || '300', 10);
    this.dailySecondsPerUser = parseInt(process.env.LIVE_DAILY_SECONDS_PER_USER || '600', 10);
    this.globalDailySeconds = parseInt(process.env.LIVE_GLOBAL_DAILY_SECONDS || '3600', 10);
    this.maxConcurrentSessions = parseInt(process.env.LIVE_MAX_CONCURRENT_SESSIONS || '5', 10);

    // In-memory atomic stores
    this.currentDate = this._getTodayDateString();
    this.userDailySeconds = new Map(); // userId -> totalSecondsToday
    this.globalDailySecondsUsed = 0;
    this.activeSessions = new Map(); // sessionId -> { userId, startTime, maxSeconds, timer }
  }

  _getTodayDateString() {
    return new Date().toISOString().split('T')[0];
  }

  _checkAndResetDay() {
    const today = this._getTodayDateString();
    if (today !== this.currentDate) {
      console.log(`[LiveQuotaManager] New day detected (${today}). Resetting daily voice usage counters.`);
      this.currentDate = today;
      this.userDailySeconds.clear();
      this.globalDailySecondsUsed = 0;
    }
  }

  reloadConfig() {
    this.testMode = process.env.LIVE_TEST_MODE === 'true';
    this.maxSessionSeconds = parseInt(process.env.LIVE_MAX_SESSION_SECONDS || '300', 10);
    this.dailySecondsPerUser = parseInt(process.env.LIVE_DAILY_SECONDS_PER_USER || '600', 10);
    this.globalDailySeconds = parseInt(process.env.LIVE_GLOBAL_DAILY_SECONDS || '6000', 10);
    this.maxConcurrentSessions = parseInt(process.env.LIVE_MAX_CONCURRENT_SESSIONS || '3', 10);
  }

  resetAllUsage() {
    this.userDailySeconds.clear();
    this.globalDailySecondsUsed = 0;
    for (const [id, s] of this.activeSessions.entries()) {
      clearTimeout(s.timer);
    }
    this.activeSessions.clear();
    console.log('[LiveQuotaManager] All voice usage & active sessions reset for testing.');
  }

  getUserVoiceStatus(userId) {
    this._checkAndResetDay();
    this.reloadConfig();
    const usedSeconds = this.userDailySeconds.get(userId) || 0;
    const remainingSeconds = Math.max(0, this.dailySecondsPerUser - usedSeconds);
    const globalRemainingSeconds = Math.max(0, this.globalDailySeconds - this.globalDailySecondsUsed);

    if (this.testMode) {
      return {
        userId,
        testMode: true,
        maxSessionSeconds: this.maxSessionSeconds,
        dailySecondsLimit: this.dailySecondsPerUser,
        usedTodaySeconds: usedSeconds,
        remainingTodaySeconds: remainingSeconds,
        globalSecondsLimit: this.globalDailySeconds,
        globalSecondsUsed: this.globalDailySecondsUsed,
        activeConcurrentSessions: this.activeSessions.size,
        maxConcurrentSessions: this.maxConcurrentSessions,
        isAllowed: true
      };
    }

    return {
      userId,
      maxSessionSeconds: this.maxSessionSeconds,
      dailySecondsLimit: this.dailySecondsPerUser,
      usedTodaySeconds: usedSeconds,
      remainingTodaySeconds: Math.min(remainingSeconds, globalRemainingSeconds),
      globalSecondsLimit: this.globalDailySeconds,
      globalSecondsUsed: this.globalDailySecondsUsed,
      activeConcurrentSessions: this.activeSessions.size,
      maxConcurrentSessions: this.maxConcurrentSessions,
      isAllowed: remainingSeconds > 10 && globalRemainingSeconds > 10 && this.activeSessions.size < this.maxConcurrentSessions
    };
  }

  canStartSession(userId) {
    this._checkAndResetDay();
    this.reloadConfig();
    const status = this.getUserVoiceStatus(userId);

    // In Test Mode, always allow uninterrupted voice practice
    if (this.testMode) {
      return {
        allowed: true,
        sessionMaxSeconds: this.maxSessionSeconds,
        userRemainingToday: status.remainingTodaySeconds
      };
    }

    if (this.activeSessions.size >= this.maxConcurrentSessions) {
      return {
        allowed: false,
        reason: 'Too many concurrent voice sessions. Please wait a moment and try again.',
        code: 'MAX_CONCURRENT_EXCEEDED'
      };
    }

    if (status.remainingTodaySeconds <= 10) {
      return {
        allowed: false,
        reason: 'Daily voice practice quota reached. You can continue practicing with text AI Teacher!',
        code: 'USER_QUOTA_EXHAUSTED',
        textFallbackAvailable: true
      };
    }

    if (status.globalSecondsUsed >= this.globalDailySeconds) {
      return {
        allowed: false,
        reason: 'Global voice server budget reached for today. Please use text AI Teacher!',
        code: 'GLOBAL_QUOTA_EXHAUSTED',
        textFallbackAvailable: true
      };
    }

    const sessionMax = Math.min(this.maxSessionSeconds, status.remainingTodaySeconds);

    return {
      allowed: true,
      sessionMaxSeconds: sessionMax,
      userRemainingToday: status.remainingTodaySeconds
    };
  }

  registerActiveSession(sessionId, userId, maxSeconds) {
    this._checkAndResetDay();
    
    // Auto cleanup timer if client disconnects abruptly without calling end
    const timer = setTimeout(() => {
      this.endSession(sessionId, maxSeconds);
    }, (maxSeconds + 15) * 1000);

    this.activeSessions.set(sessionId, {
      userId,
      startTime: Date.now(),
      maxSeconds,
      timer
    });

    console.log(`[LiveQuotaManager] Session started: ${sessionId} for user ${userId} (Max: ${maxSeconds}s). Active: ${this.activeSessions.size}`);
  }

  endSession(sessionId, reportedSeconds) {
    this._checkAndResetDay();
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return;
    }

    clearTimeout(session.timer);
    this.activeSessions.delete(sessionId);

    // Calculate actual elapsed seconds safely
    const elapsedSeconds = Math.round((Date.now() - session.startTime) / 1000);
    let duration = elapsedSeconds;
    if (reportedSeconds && Number.isFinite(reportedSeconds) && reportedSeconds > 0) {
      duration = Math.round(reportedSeconds);
    }
    // Cap at sessionMaxSeconds and ensure minimum 1 second
    duration = Math.max(1, Math.min(session.maxSeconds, duration));

    // Update user tally
    const current = this.userDailySeconds.get(session.userId) || 0;
    this.userDailySeconds.set(session.userId, current + duration);

    // Update global tally
    this.globalDailySecondsUsed += duration;

    console.log(`[LiveQuotaManager] Session ended: ${sessionId}. Duration: ${duration}s. User ${session.userId} total today: ${current + duration}s. Active: ${this.activeSessions.size}`);
  }
}

module.exports = new LiveQuotaManager();
