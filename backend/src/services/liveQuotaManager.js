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

    // TESTING / CHECKING MODE: Limit system bypassed/commented out for smooth testing
    return {
      userId,
      testMode: true,
      maxSessionSeconds: 36000,
      dailySecondsLimit: 36000,
      usedTodaySeconds: 0,
      remainingTodaySeconds: 36000,
      globalSecondsLimit: 360000,
      globalSecondsUsed: 0,
      activeConcurrentSessions: 0,
      maxConcurrentSessions: 999,
      isAllowed: true
    };
  }

  canStartSession(userId) {
    this._checkAndResetDay();
    this.reloadConfig();

    // TESTING / CHECKING MODE: Limit system bypassed/commented out for smooth testing
    return {
      allowed: true,
      sessionMaxSeconds: 36000,
      userRemainingToday: 36000
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
