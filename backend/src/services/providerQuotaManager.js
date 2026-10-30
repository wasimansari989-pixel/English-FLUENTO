const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../../data/provider_quotas.json');

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

class ProviderQuotaManager {
  constructor() {
    this.state = this._loadState();
  }

  _getInitialProviderState(providerName) {
    const isGroq = providerName === 'groq';
    return {
      providerName,
      configuredModel: isGroq ? (process.env.GROQ_MODEL || 'openai/gpt-oss-120b') : (process.env.GEMINI_MODEL || 'gemini-3.8-flash'),
      dailyRequestLimit: isGroq ? 14400 : 1500, // Safe free-tier estimates
      requestCount: 0,
      successCount: 0,
      failureCount: 0,
      inputTokens: 0,
      outputTokens: 0,
      knownRemainingQuota: null,
      circuitState: 'CLOSED', // 'CLOSED' | 'OPEN' | 'HALF_OPEN'
      cooldownUntil: null,
      lastErrorCategory: null,
      lastErrorTime: null,
      lastResetDate: getTodayKey()
    };
  }

  _loadState() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        const today = getTodayKey();

        // Initialize missing providers or reset if date changed
        const providers = ['groq', 'gemini'];
        for (const p of providers) {
          if (!parsed[p]) {
            parsed[p] = this._getInitialProviderState(p);
          } else if (parsed[p].lastResetDate !== today) {
            // New day reset
            parsed[p].requestCount = 0;
            parsed[p].successCount = 0;
            parsed[p].failureCount = 0;
            parsed[p].inputTokens = 0;
            parsed[p].outputTokens = 0;
            parsed[p].lastResetDate = today;
            // Retain circuit state if cooldown is still in future
            if (parsed[p].cooldownUntil && Date.now() >= parsed[p].cooldownUntil) {
              parsed[p].circuitState = 'CLOSED';
              parsed[p].cooldownUntil = null;
            }
          }
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to read provider quota state file, using fresh state:', e.message);
    }

    return {
      groq: this._getInitialProviderState('groq'),
      gemini: this._getInitialProviderState('gemini')
    };
  }

  _saveState() {
    try {
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.state, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to save provider quota state:', e.message);
    }
  }

  _checkRollover(p) {
    const today = getTodayKey();
    if (this.state[p].lastResetDate !== today) {
      this.state[p].requestCount = 0;
      this.state[p].successCount = 0;
      this.state[p].failureCount = 0;
      this.state[p].inputTokens = 0;
      this.state[p].outputTokens = 0;
      this.state[p].lastResetDate = today;
      if (this.state[p].cooldownUntil && Date.now() >= this.state[p].cooldownUntil) {
        this.state[p].circuitState = 'CLOSED';
        this.state[p].cooldownUntil = null;
      }
      this._saveState();
    }
  }

  isProviderAvailable(providerName) {
    const p = providerName.toLowerCase();
    if (!this.state[p]) {
      this.state[p] = this._getInitialProviderState(p);
    }
    this._checkRollover(p);

    const info = this.state[p];
    const now = Date.now();

    // Check circuit breaker
    if (info.circuitState === 'OPEN') {
      if (info.cooldownUntil && now >= info.cooldownUntil) {
        // Cooldown passed -> transition to HALF_OPEN to allow a trial request
        info.circuitState = 'HALF_OPEN';
        info.cooldownUntil = null;
        this._saveState();
        return { available: true, state: 'HALF_OPEN', reason: 'Cooldown expired. Testing provider recovery.' };
      }
      return {
        available: false,
        state: 'OPEN',
        reason: `Provider ${p} is in cooldown until ${new Date(info.cooldownUntil).toISOString()} due to ${info.lastErrorCategory}`
      };
    }

    return { available: true, state: info.circuitState };
  }

  recordAttempt(providerName) {
    const p = providerName.toLowerCase();
    if (!this.state[p]) this.state[p] = this._getInitialProviderState(p);
    this._checkRollover(p);
    this.state[p].requestCount++;
    this._saveState();
  }

  recordSuccess(providerName, { usage = {}, rateLimits = {} } = {}) {
    const p = providerName.toLowerCase();
    if (!this.state[p]) this.state[p] = this._getInitialProviderState(p);
    this._checkRollover(p);

    const info = this.state[p];
    info.successCount++;
    info.inputTokens += usage.promptTokens || 0;
    info.outputTokens += usage.completionTokens || 0;

    // Reset circuit breaker to healthy CLOSED state
    info.circuitState = 'CLOSED';
    info.cooldownUntil = null;

    if (rateLimits.remainingRequests !== null && rateLimits.remainingRequests !== undefined) {
      info.knownRemainingQuota = parseInt(rateLimits.remainingRequests, 10);
    }

    this._saveState();
  }

  recordFailure(providerName, error) {
    const p = providerName.toLowerCase();
    if (!this.state[p]) this.state[p] = this._getInitialProviderState(p);
    this._checkRollover(p);

    const info = this.state[p];
    info.failureCount++;
    info.lastErrorTime = new Date().toISOString();

    const now = Date.now();
    let cooldownMs = 30000; // default 30s
    let category = 'UNKNOWN_ERROR';

    if (error.isRateLimit) {
      category = 'RATE_LIMIT_429';
      // If retry-after header provided
      if (error.retryAfter) {
        const parsed = parseInt(error.retryAfter, 10);
        cooldownMs = !isNaN(parsed) ? parsed * 1000 : 60000;
      } else {
        cooldownMs = 60000; // 1 minute
      }
    } else if (error.isQuotaExhausted) {
      category = 'QUOTA_EXHAUSTED';
      // Provider daily quota exhausted -> longer cooldown (e.g. 10 minutes or till next reset)
      cooldownMs = 10 * 60 * 1000;
    } else if (error.isAuthError) {
      category = 'AUTH_ERROR';
      cooldownMs = 24 * 60 * 60 * 1000; // 24 hours (requires admin key fix)
    } else if (error.isTimeout) {
      category = 'TIMEOUT';
      cooldownMs = 15000; // 15 seconds
    } else if (error.isTemporary) {
      category = 'SERVER_5XX';
      cooldownMs = 30000; // 30 seconds
    }

    info.lastErrorCategory = category;
    info.circuitState = 'OPEN';
    info.cooldownUntil = now + cooldownMs;

    this._saveState();
  }

  // Force reset a provider state (useful for tests or manual admin trigger)
  resetProvider(providerName) {
    const p = providerName.toLowerCase();
    this.state[p] = this._getInitialProviderState(p);
    this._saveState();
  }

  getMetrics() {
    this._checkRollover('groq');
    this._checkRollover('gemini');
    return {
      groq: { ...this.state.groq },
      gemini: { ...this.state.gemini }
    };
  }
}

module.exports = new ProviderQuotaManager();
