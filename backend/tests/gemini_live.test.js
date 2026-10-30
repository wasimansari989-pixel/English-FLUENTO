require('dotenv').config();
const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert');

const liveQuotaManager = require('../src/services/liveQuotaManager');
const geminiLiveService = require('../src/services/geminiLiveService');
const { buildLiveTutorSystemInstruction } = require('../src/prompts/liveTutorPrompt');

describe('Gemini Live API & Voice Quota Tests', () => {

  test('buildLiveTutorSystemInstruction creates beginner prompt with simple Hinglish instructions', () => {
    const prompt = buildLiveTutorSystemInstruction({
      mode: 'beginner',
      topic: 'daily_life'
    });

    assert.ok(prompt.includes('MODE: BEGINNER'), 'Should contain beginner mode');
    assert.ok(prompt.includes('Hinglish'), 'Should recommend Hinglish');
    assert.ok(prompt.includes('NEVER use difficult Sanskritized grammar terms'), 'Should forbid difficult grammar terms');
    assert.ok(prompt.includes('[[CORRECTION:'), 'Should instruct formatting correction marker');
  });

  test('buildLiveTutorSystemInstruction creates intermediate and conversation modes with kitchen topic', () => {
    const promptKitchen = buildLiveTutorSystemInstruction({
      mode: 'beginner',
      topic: 'kitchen'
    });
    assert.ok(promptKitchen.includes('Kitchen activities, cooking food'), 'Should include kitchen topic description');

    const promptInter = buildLiveTutorSystemInstruction({
      mode: 'intermediate',
      topic: 'travel'
    });
    assert.ok(promptInter.includes('MODE: INTERMEDIATE'));

    const promptConv = buildLiveTutorSystemInstruction({
      mode: 'conversation',
      topic: 'shopping'
    });
    assert.ok(promptConv.includes('MODE: CONVERSATION ONLY'));
  });

  test('buildLiveTutorSystemInstruction includes formula context when provided', () => {
    const prompt = buildLiveTutorSystemInstruction({
      mode: 'beginner',
      topic: 'daily_life',
      formulaContext: {
        id: 42,
        englishFormula: 'Subject + should have + V3',
        hindiMeaning: 'karna chahiye tha'
      }
    });

    assert.ok(prompt.includes('Formula #42'), 'Should include formula id');
    assert.ok(prompt.includes('Subject + should have + V3'), 'Should include english formula');
  });

  test('liveQuotaManager accurately tracks user daily voice seconds and session caps', () => {
    const testUser = 'user_test_voice_' + Date.now();
    const initialStatus = liveQuotaManager.getUserVoiceStatus(testUser);
    assert.strictEqual(initialStatus.usedTodaySeconds, 0);
    assert.strictEqual(initialStatus.isAllowed, true);

    const check = liveQuotaManager.canStartSession(testUser);
    assert.strictEqual(check.allowed, true);
    assert.strictEqual(check.sessionMaxSeconds > 0, true);

    // Register active session
    const sessionId = 'test_sess_' + Date.now();
    const sessionDuration = check.sessionMaxSeconds;
    liveQuotaManager.registerActiveSession(sessionId, testUser, sessionDuration);

    // End session with 45 seconds used
    liveQuotaManager.endSession(sessionId, 45);

    const afterStatus = liveQuotaManager.getUserVoiceStatus(testUser);
    assert.strictEqual(afterStatus.usedTodaySeconds, 45);
    assert.strictEqual(afterStatus.remainingTodaySeconds, liveQuotaManager.dailySecondsPerUser - 45);
  });

  test('geminiLiveService provisions ephemeral token and hides permanent key', async () => {
    if (!process.env.GEMINI_API_KEY) {
      console.log('Skipping live token API test (no GEMINI_API_KEY set)');
      return;
    }
    const testUser = 'user_live_prov_' + Date.now();
    const session = await geminiLiveService.provisionSession({
      userId: testUser,
      mode: 'beginner',
      topic: 'ordering_food'
    });

    assert.ok(session.sessionId, 'Session ID must exist');
    assert.ok(session.token, 'Ephemeral token must exist');
    assert.ok(session.wsUrl.startsWith('wss://'), 'wsUrl must be WebSocket URL');
    assert.ok(!session.wsUrl.includes(process.env.GEMINI_API_KEY), 'Permanent API key MUST NOT appear in client wsUrl');
    assert.strictEqual(session.model, 'models/gemini-3.8-live');
    assert.ok(session.sessionMaxSeconds > 0, 'Session max seconds must be positive');

    // Clean up session
    geminiLiveService.reportSessionUsage({ sessionId: session.sessionId, durationSeconds: 5 });
  });

});
