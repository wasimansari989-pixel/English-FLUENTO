// Gemini Live API Ephemeral Token Provisioning & Session Service
const crypto = require('crypto');
const liveQuotaManager = require('./liveQuotaManager');
const { buildLiveTutorSystemInstruction } = require('../prompts/liveTutorPrompt');
const FormulaRetrieval = require('./formulaRetrieval');

class GeminiLiveService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.modelName = process.env.GEMINI_LIVE_MODEL || 'gemini-3.8-live';
  }

  async provisionSession({ userId, mode = 'beginner', topic = 'daily_life', formulaId = null }) {
    if (!this.apiKey) {
      throw new Error('Gemini API key is not configured on the backend server.');
    }

    // 1. Quota & concurrency validation
    const quotaCheck = liveQuotaManager.canStartSession(userId);
    if (!quotaCheck.allowed) {
      const err = new Error(quotaCheck.reason);
      err.code = quotaCheck.code;
      err.status = 429;
      err.textFallbackAvailable = quotaCheck.textFallbackAvailable || false;
      throw err;
    }

    // 2. Fetch context formula if provided
    let formulaContext = null;
    if (formulaId) {
      formulaContext = FormulaRetrieval.getFormulaById(formulaId);
    }

    // 3. Build system instruction
    const systemInstruction = buildLiveTutorSystemInstruction({
      mode,
      topic,
      formulaContext
    });

    // 4. Request constrained ephemeral token from Google
    // Official endpoint: https://generativelanguage.googleapis.com/v1beta/auth_tokens
    const tokenUrl = `https://generativelanguage.googleapis.com/v1beta/auth_tokens?key=${this.apiKey}`;
    
    let tokenData;
    try {
      const res = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uses: 1
        })
      });

      if (!res.ok) {
        const errBody = await res.text();
        console.error(`[GeminiLiveService] Failed to generate ephemeral token: HTTP ${res.status} - ${errBody}`);
        const err = new Error(`Failed to provision Gemini Live session (HTTP ${res.status})`);
        err.status = 502;
        throw err;
      }

      tokenData = await res.json();
    } catch (err) {
      if (err.status) throw err;
      console.error('[GeminiLiveService] Network error during token creation:', err.message);
      const networkErr = new Error('Could not connect to Gemini Live service. Please check network.');
      networkErr.status = 502;
      throw networkErr;
    }

    // Strip prefix if returned as 'auth_tokens/{hex}'
    const rawToken = tokenData.name ? tokenData.name.replace(/^auth_tokens\//, '') : '';
    if (!rawToken) {
      throw new Error('Invalid ephemeral token returned by Gemini service.');
    }

    // 5. Construct session metadata
    const sessionId = `live_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const sessionMaxSeconds = quotaCheck.sessionMaxSeconds;

    // Register active session in quota manager
    liveQuotaManager.registerActiveSession(sessionId, userId, sessionMaxSeconds);

    const fullWsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=${rawToken}`;

    return {
      sessionId,
      token: rawToken,
      wsUrl: fullWsUrl,
      model: `models/${this.modelName}`,
      sessionMaxSeconds,
      mode,
      topic,
      voiceConfig: {
        voiceName: 'Aoede'
      },
      systemInstruction,
      quota: liveQuotaManager.getUserVoiceStatus(userId)
    };
  }

  reportSessionUsage({ sessionId, durationSeconds }) {
    liveQuotaManager.endSession(sessionId, durationSeconds);
    return { success: true };
  }

  getVoiceQuota(userId) {
    return liveQuotaManager.getUserVoiceStatus(userId);
  }
}

module.exports = new GeminiLiveService();
