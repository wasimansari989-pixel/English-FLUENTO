const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const assert = require('node:assert');

const aiProviderRouter = require('../src/services/aiProviderRouter');
const GeminiProvider = require('../src/providers/GeminiProvider');
const userQuotaManager = require('../src/services/userQuotaManager');
const providerQuotaManager = require('../src/services/providerQuotaManager');

async function testLiveRealFallback() {
  console.log('Testing LIVE real Groq failure -> real Gemini fallback response...');

  // Reset quotas
  userQuotaManager.reset();
  providerQuotaManager.resetProvider('groq');
  providerQuotaManager.resetProvider('gemini');

  // Force Groq to return 429 Rate Limit
  aiProviderRouter.groq = {
    generateText: async () => {
      console.log('Simulating real Groq 429 rate limit...');
      const err = new Error('Groq rate limit: 429 Too Many Requests');
      err.status = 429;
      err.isRateLimit = true;
      err.provider = 'groq';
      throw err;
    }
  };

  // Use the REAL Gemini provider with the live configured API key
  aiProviderRouter.gemini = new GeminiProvider();

  const startTime = Date.now();
  const result = await aiProviderRouter.execute({
    type: 'tutor',
    userId: 'live_test_user',
    systemPrompt: 'You are an English tutor. Reply in 1 short sentence.',
    userPrompt: 'Hello, what is the meaning of "Can"?',
    skipCache: true
  });
  const duration = Date.now() - startTime;

  console.log('Live failover completed in:', duration + 'ms');
  console.log('Provider used:', result.provider);
  console.log('Fallback used:', result.fallbackUsed);
  console.log('Remaining user quota:', result.remainingToday);
  console.log('Live Gemini response snippet:', result.rawResponse.slice(0, 100));

  assert.strictEqual(result.provider, 'gemini', 'Real Gemini should have answered the query');
  assert.strictEqual(result.fallbackUsed, true, 'fallbackUsed must be true');
  assert.ok(result.rawResponse.length > 0, 'Gemini must have returned a non-empty response');
  assert.strictEqual(result.remainingToday, 9, 'User quota must be exactly 9 remaining');

  console.log('✅ CONFIRMED: Real Groq failure successfully triggered real Gemini live fallback!');
}

testLiveRealFallback().catch((e) => {
  console.error('Live failover test failed:', e);
  process.exit(1);
});
