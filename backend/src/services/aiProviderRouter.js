const GroqProvider = require('../providers/GroqProvider');
const GeminiProvider = require('../providers/GeminiProvider');
const MockProvider = require('../providers/MockProvider');

const providerQuotaManager = require('./providerQuotaManager');
const userQuotaManager = require('./userQuotaManager');
const aiCacheService = require('./aiCacheService');

class AIProviderRouter {
  constructor() {
    this.fallbackCount = 0;
    this.primaryProviderName = (process.env.AI_PRIMARY_PROVIDER || 'groq').toLowerCase();
    this.fallbackProviderName = (process.env.AI_FALLBACK_PROVIDER || 'gemini').toLowerCase();
    this.automaticPaidFallback = process.env.AI_AUTOMATIC_PAID_FALLBACK === 'true'; // Strictly false by default

    this._initProviders();
  }

  _initProviders() {
    // Groq
    if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your_groq_api_key_here') {
      this.groq = new GroqProvider();
    } else {
      this.groq = null;
    }

    // Gemini
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
      this.gemini = new GeminiProvider();
    } else {
      this.gemini = null;
    }

    this.mock = new MockProvider();
  }

  getProviderInstance(name) {
    if (name === 'groq') return this.groq || this.mock;
    if (name === 'gemini') return this.gemini || this.mock;
    return this.mock;
  }

  isEligibleFallback(err) {
    if (!err) return false;
    return (
      err.isRateLimit === true ||
      err.isQuotaExhausted === true ||
      err.isTemporary === true ||
      err.isTimeout === true ||
      err.status === 429 ||
      (err.status >= 500 && err.status < 600)
    );
  }

  /**
   * Central execution method for all AI operations.
   */
  async execute({
    type,
    userId = 'default_user',
    systemPrompt,
    userPrompt,
    context = null,
    formulaId = null,
    mode = 'beginner',
    skipCache = false
  }) {
    if (process.env.AI_ENABLED === 'false') {
      const err = new Error('AI features are currently disabled by the administrator. All offline formulas remain available.');
      err.status = 503;
      throw err;
    }

    const inputLength = (userPrompt || '').length + (typeof context === 'string' ? context.length : 0);

    // 1. Response Caching Check
    const cacheKey = aiCacheService.generateKey({
      type,
      prompt: userPrompt,
      formulaId,
      mode,
      model: this.primaryProviderName
    });

    if (!skipCache) {
      const cached = aiCacheService.get(cacheKey);
      if (cached) {
        // Cache hit: does NOT consume user daily allowance or provider quota!
        const userQuota = userQuotaManager.getUserQuota(userId);
        return {
          rawResponse: cached,
          isCached: true,
          provider: 'cache',
          fallbackUsed: false,
          remainingToday: userQuota.remaining
        };
      }
    }

    // 2. Atomic User Quota Reservation
    const reservation = userQuotaManager.reserve(userId, inputLength);
    if (!reservation.allowed) {
      const quotaErr = new Error(reservation.error);
      quotaErr.status = 429;
      throw quotaErr;
    }

    let primaryErr = null;
    let fallbackUsed = false;
    let result = null;
    let successfulProvider = null;

    // 3. Attempt Primary Provider (Groq)
    const primaryAvail = providerQuotaManager.isProviderAvailable(this.primaryProviderName);
    if (primaryAvail.available) {
      try {
        const primary = this.getProviderInstance(this.primaryProviderName);
        providerQuotaManager.recordAttempt(this.primaryProviderName);

        result = await primary.generateText({ systemPrompt, userPrompt, context });
        providerQuotaManager.recordSuccess(this.primaryProviderName, result);
        successfulProvider = this.primaryProviderName;
      } catch (err) {
        primaryErr = err;
        providerQuotaManager.recordFailure(this.primaryProviderName, err);
        console.warn(`Primary provider (${this.primaryProviderName}) failed:`, err.message);

        // If auth error, do not conceal broken config
        if (err.isAuthError) {
          userQuotaManager.release(userId);
          const fatalAuthErr = new Error(`Primary AI configuration error: Authentication failed for ${this.primaryProviderName}. Please check administrator credentials.`);
          fatalAuthErr.status = 500;
          fatalAuthErr.isAuthError = true;
          throw fatalAuthErr;
        }

        // Check if eligible for fallback
        if (!this.isEligibleFallback(err)) {
          userQuotaManager.release(userId);
          throw err;
        }
      }
    } else {
      console.warn(`Primary provider (${this.primaryProviderName}) is unavailable: ${primaryAvail.reason}`);
      primaryErr = new Error(primaryAvail.reason);
    }

    // 4. Fallback Provider (Gemini) if primary failed or was unavailable
    if (!result) {
      const fallbackAvail = providerQuotaManager.isProviderAvailable(this.fallbackProviderName);

      if (!fallbackAvail.available) {
        // Both providers are exhausted or unavailable
        userQuotaManager.release(userId);
        const exhaustedErr = new Error(
          'Both AI providers are temporarily busy or reached quota. All 600 formulas, bookmarks, and search are still fully functional offline!'
        );
        exhaustedErr.status = 503;
        exhaustedErr.bothUnavailable = true;
        throw exhaustedErr;
      }

      try {
        const fallback = this.getProviderInstance(this.fallbackProviderName);
        providerQuotaManager.recordAttempt(this.fallbackProviderName);

        console.log(`Routing request to fallback provider (${this.fallbackProviderName})...`);
        result = await fallback.generateText({ systemPrompt, userPrompt, context });
        providerQuotaManager.recordSuccess(this.fallbackProviderName, result);

        this.fallbackCount++;
        fallbackUsed = true;
        successfulProvider = this.fallbackProviderName;
      } catch (fallbackErr) {
        providerQuotaManager.recordFailure(this.fallbackProviderName, fallbackErr);
        userQuotaManager.release(userId);

        console.error(`Fallback provider (${this.fallbackProviderName}) also failed:`, fallbackErr.message);
        const bothFailedErr = new Error(
          'Both AI providers are temporarily unavailable. Your offline formulas and quizzes remain accessible.'
        );
        bothFailedErr.status = 503;
        bothFailedErr.bothUnavailable = true;
        throw bothFailedErr;
      }
    }

    // 5. Commit User Quota on confirmed success
    const commitResult = userQuotaManager.commit(userId);

    // Extract text whether returned as string or object
    const rawText = typeof result === 'string' ? result : (result.text || '');

    // 6. Save in Cache
    if (!skipCache && rawText) {
      aiCacheService.set(cacheKey, rawText);
    }

    return {
      rawResponse: rawText,
      isCached: false,
      provider: successfulProvider,
      fallbackUsed,
      remainingToday: commitResult.remainingToday
    };
  }

  getAdminReport() {
    const userMetrics = userQuotaManager.getGlobalMetrics();
    const providerMetrics = providerQuotaManager.getMetrics();
    const cacheMetrics = aiCacheService.getMetrics();

    return {
      timestamp: new Date().toISOString(),
      date: userMetrics.date,
      configuration: {
        primaryProvider: this.primaryProviderName,
        fallbackProvider: this.fallbackProviderName,
        userDailyLimit: userMetrics.userDailyLimit,
        targetUsers: userMetrics.targetUsers,
        globalDailyTarget: userMetrics.globalDailyTarget,
        automaticPaidFallback: this.automaticPaidFallback
      },
      usageSummary: {
        successfulUserAnswers: userMetrics.globalSuccessfulAnswers,
        activeUsers: userMetrics.activeUsersCount,
        usersExhaustedLimit: userMetrics.usersExhaustedCount,
        totalFallbacks: this.fallbackCount
      },
      providers: {
        groq: {
          model: providerMetrics.groq.configuredModel,
          circuitState: providerMetrics.groq.circuitState,
          requests: providerMetrics.groq.requestCount,
          successes: providerMetrics.groq.successCount,
          failures: providerMetrics.groq.failureCount,
          inputTokens: providerMetrics.groq.inputTokens,
          outputTokens: providerMetrics.groq.outputTokens,
          knownRemainingQuota: providerMetrics.groq.knownRemainingQuota,
          cooldownUntil: providerMetrics.groq.cooldownUntil,
          lastErrorCategory: providerMetrics.groq.lastErrorCategory,
          lastErrorTime: providerMetrics.groq.lastErrorTime
        },
        gemini: {
          model: providerMetrics.gemini.configuredModel,
          circuitState: providerMetrics.gemini.circuitState,
          requests: providerMetrics.gemini.requestCount,
          successes: providerMetrics.gemini.successCount,
          failures: providerMetrics.gemini.failureCount,
          inputTokens: providerMetrics.gemini.inputTokens,
          outputTokens: providerMetrics.gemini.outputTokens,
          knownRemainingQuota: providerMetrics.gemini.knownRemainingQuota,
          cooldownUntil: providerMetrics.gemini.cooldownUntil,
          lastErrorCategory: providerMetrics.gemini.lastErrorCategory,
          lastErrorTime: providerMetrics.gemini.lastErrorTime
        }
      },
      cache: cacheMetrics
    };
  }
}

module.exports = new AIProviderRouter();
