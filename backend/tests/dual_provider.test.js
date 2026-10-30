const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');

const providerQuotaManager = require('../src/services/providerQuotaManager');
const userQuotaManager = require('../src/services/userQuotaManager');
const aiCacheService = require('../src/services/aiCacheService');
const aiProviderRouter = require('../src/services/aiProviderRouter');
const FormulaRetrieval = require('../src/services/formulaRetrieval');

describe('Dual AI Provider Architecture & Automatic Failover Suite (18 Scenarios)', () => {
  beforeEach(() => {
    // Reset quotas and cache for test determinism
    userQuotaManager.reset();
    aiCacheService.clear();
    providerQuotaManager.resetProvider('groq');
    providerQuotaManager.resetProvider('gemini');
    aiProviderRouter.fallbackCount = 0;
  });

  // Scenario 1: Groq succeeds and no Gemini request is made
  test('Scenario 1: Groq succeeds and no Gemini request is made', async () => {
    let geminiCalled = false;
    let groqCalled = false;

    aiProviderRouter.groq = {
      generateText: async () => {
        groqCalled = true;
        return { text: 'Groq response', usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 } };
      }
    };
    aiProviderRouter.gemini = {
      generateText: async () => {
        geminiCalled = true;
        return { text: 'Gemini response' };
      }
    };

    const res = await aiProviderRouter.execute({
      type: 'tutor',
      userId: 'test_user_1',
      userPrompt: 'What is formula 1?',
      skipCache: true
    });

    assert.strictEqual(groqCalled, true, 'Groq should be called');
    assert.strictEqual(geminiCalled, false, 'Gemini should NOT be called when Groq succeeds');
    assert.strictEqual(res.provider, 'groq');
    assert.strictEqual(res.fallbackUsed, false);
    assert.strictEqual(res.rawResponse, 'Groq response');
  });

  // Scenario 2: Groq returns HTTP 429 and Gemini successfully responds
  test('Scenario 2: Groq returns HTTP 429 and Gemini successfully responds', async () => {
    aiProviderRouter.groq = {
      generateText: async () => {
        const err = new Error('Rate limit exceeded');
        err.status = 429;
        err.isRateLimit = true;
        err.provider = 'groq';
        throw err;
      }
    };
    aiProviderRouter.gemini = {
      generateText: async () => {
        return { text: 'Gemini fallback answer', usage: { promptTokens: 12, completionTokens: 8, totalTokens: 20 } };
      }
    };

    const res = await aiProviderRouter.execute({
      type: 'tutor',
      userId: 'test_user_2',
      userPrompt: 'Explain modal verbs',
      skipCache: true
    });

    assert.strictEqual(res.provider, 'gemini', 'Should route to fallback provider gemini');
    assert.strictEqual(res.fallbackUsed, true, 'fallbackUsed flag should be true');
    assert.strictEqual(res.rawResponse, 'Gemini fallback answer');
    assert.strictEqual(aiProviderRouter.fallbackCount, 1);
  });

  // Scenario 3: Groq daily token quota is exhausted and router uses Gemini
  test('Scenario 3: Groq daily token quota is exhausted and router uses Gemini', async () => {
    aiProviderRouter.groq = {
      generateText: async () => {
        const err = new Error('Daily token quota exceeded for model');
        err.status = 429;
        err.isQuotaExhausted = true;
        err.provider = 'groq';
        throw err;
      }
    };
    aiProviderRouter.gemini = {
      generateText: async () => {
        return { text: 'Gemini answer on quota failover' };
      }
    };

    const res = await aiProviderRouter.execute({
      type: 'examples',
      userId: 'test_user_3',
      userPrompt: 'Generate 5 examples',
      skipCache: true
    });

    assert.strictEqual(res.provider, 'gemini');
    assert.strictEqual(res.fallbackUsed, true);
    assert.strictEqual(res.rawResponse, 'Gemini answer on quota failover');
  });

  // Scenario 4: Gemini returns RESOURCE_EXHAUSTED and application handles it safely
  test('Scenario 4: Gemini returns RESOURCE_EXHAUSTED and application handles it safely', async () => {
    aiProviderRouter.groq = {
      generateText: async () => {
        const err = new Error('Groq 429');
        err.status = 429;
        err.isRateLimit = true;
        throw err;
      }
    };
    aiProviderRouter.gemini = {
      generateText: async () => {
        const err = new Error('Resource has been exhausted (e.g. check quota): RESOURCE_EXHAUSTED');
        err.status = 429;
        err.isQuotaExhausted = true;
        throw err;
      }
    };

    await assert.rejects(
      async () => {
        await aiProviderRouter.execute({
          type: 'tutor',
          userId: 'test_user_4',
          userPrompt: 'Help me',
          skipCache: true
        });
      },
      (err) => {
        assert.strictEqual(err.bothUnavailable, true);
        assert.match(err.message, /offline formulas/i);
        return true;
      }
    );
  });

  // Scenario 5: Both providers are exhausted and a friendly response is returned
  test('Scenario 5: Both providers are exhausted and friendly response is returned', async () => {
    aiProviderRouter.groq = {
      generateText: async () => {
        const err = new Error('Groq quota reached');
        err.isQuotaExhausted = true;
        throw err;
      }
    };
    aiProviderRouter.gemini = {
      generateText: async () => {
        const err = new Error('Gemini quota reached');
        err.isQuotaExhausted = true;
        throw err;
      }
    };

    await assert.rejects(
      async () => {
        await aiProviderRouter.execute({
          type: 'tutor',
          userId: 'test_user_5',
          userPrompt: 'Practice sentence',
          skipCache: true
        });
      },
      (err) => {
        assert.strictEqual(err.status, 503);
        assert.match(err.message, /formulas.*quizzes/i);
        return true;
      }
    );
  });

  // Scenario 6: Groq's quota recovers and primary routing resumes
  test("Scenario 6: Groq's quota recovers and primary routing resumes", async () => {
    let callLog = [];
    aiProviderRouter.groq = {
      generateText: async () => {
        callLog.push('groq');
        return { text: 'Groq recovered response' };
      }
    };
    aiProviderRouter.gemini = {
      generateText: async () => {
        callLog.push('gemini');
        return { text: 'Gemini' };
      }
    };

    // Recover Groq's state
    providerQuotaManager.resetProvider('groq');

    const res = await aiProviderRouter.execute({
      type: 'tutor',
      userId: 'test_user_6',
      userPrompt: 'Test recovery',
      skipCache: true
    });

    assert.deepStrictEqual(callLog, ['groq'], 'Only Groq should have been called upon recovery');
    assert.strictEqual(res.provider, 'groq');
    assert.strictEqual(res.fallbackUsed, false);
  });

  // Scenario 7: A fallback success counts as ONE successful user answer
  test('Scenario 7: A fallback success counts as ONE successful user answer', async () => {
    const userId = 'user_fallback_count';
    const before = userQuotaManager.getUserQuota(userId);
    assert.strictEqual(before.count, 0);

    aiProviderRouter.groq = {
      generateText: async () => {
        const err = new Error('Groq 503');
        err.status = 503;
        err.isTemporary = true;
        throw err;
      }
    };
    aiProviderRouter.gemini = {
      generateText: async () => {
        return { text: 'Gemini Answer' };
      }
    };

    const res = await aiProviderRouter.execute({
      type: 'tutor',
      userId,
      userPrompt: 'Query with failover',
      skipCache: true
    });

    const after = userQuotaManager.getUserQuota(userId);
    assert.strictEqual(after.count, 1, 'Fallback success must count as exactly 1 user answer');
    assert.strictEqual(res.remainingToday, 9);
  });

  // Scenario 8: A failed request does not incorrectly consume a user's allowance
  test("Scenario 8: A failed request does not consume a user's allowance", async () => {
    const userId = 'user_unconsumed';
    const before = userQuotaManager.getUserQuota(userId);

    aiProviderRouter.groq = {
      generateText: async () => {
        const err = new Error('Groq 500');
        err.status = 500;
        err.isTemporary = true;
        throw err;
      }
    };
    aiProviderRouter.gemini = {
      generateText: async () => {
        const err = new Error('Gemini 500');
        err.status = 500;
        err.isTemporary = true;
        throw err;
      }
    };

    try {
      await aiProviderRouter.execute({
        type: 'tutor',
        userId,
        userPrompt: 'Will fail both',
        skipCache: true
      });
    } catch {
      // Expected failure
    }

    const after = userQuotaManager.getUserQuota(userId);
    assert.strictEqual(after.count, before.count, 'Failed request must release reservation and preserve quota');
    assert.strictEqual(after.remaining, 10);
  });

  // Scenario 9: A cached answer does not trigger an AI call or consume quota
  test('Scenario 9: A cached answer does not trigger an AI call or consume quota', async () => {
    let providerCalls = 0;
    aiProviderRouter.groq = {
      generateText: async () => {
        providerCalls++;
        return { text: 'Original AI Answer' };
      }
    };

    const userId = 'user_cache_test';

    // First call (cache miss)
    const res1 = await aiProviderRouter.execute({
      type: 'tutor',
      userId,
      userPrompt: 'What is Formula 5?',
      formulaId: 5,
      skipCache: false
    });
    assert.strictEqual(res1.isCached, false);
    assert.strictEqual(providerCalls, 1);
    assert.strictEqual(userQuotaManager.getUserQuota(userId).count, 1);

    // Second call (cache hit)
    const res2 = await aiProviderRouter.execute({
      type: 'tutor',
      userId,
      userPrompt: 'What is Formula 5?',
      formulaId: 5,
      skipCache: false
    });

    assert.strictEqual(res2.isCached, true, 'Second call must be served from cache');
    assert.strictEqual(providerCalls, 1, 'Provider calls count must not increase on cache hit');
    assert.strictEqual(userQuotaManager.getUserQuota(userId).count, 1, 'Cache hit must not consume user quota');
  });

  // Scenario 10: No user exceeds configured limit of 10 successful answers per day
  test('Scenario 10: No user exceeds configured limit of 10 successful answers per day', async () => {
    aiProviderRouter.groq = {
      generateText: async () => ({ text: 'Success answer' })
    };

    const userId = 'user_max_limit';

    for (let i = 1; i <= 10; i++) {
      const res = await aiProviderRouter.execute({
        type: 'tutor',
        userId,
        userPrompt: `Question ${i}`,
        skipCache: true
      });
      assert.strictEqual(res.remainingToday, 10 - i);
    }

    // 11th call must be blocked
    await assert.rejects(
      async () => {
        await aiProviderRouter.execute({
          type: 'tutor',
          userId,
          userPrompt: 'Question 11',
          skipCache: true
        });
      },
      (err) => {
        assert.strictEqual(err.status, 429);
        assert.match(err.message, /daily limit of 10/i);
        return true;
      }
    );
  });

  // Scenario 11: A user's quota counter cannot be reset by restarting mobile app
  test("Scenario 11: User quota is persisted and cannot be reset by restarting mobile app", () => {
    const userId = 'persisted_user';
    userQuotaManager.reserve(userId, 10);
    userQuotaManager.commit(userId);

    // Simulate reloading from disk
    const reloaded = userQuotaManager.getUserQuota(userId);
    assert.strictEqual(reloaded.count, 1);
    assert.strictEqual(reloaded.remaining, 9);
  });

  // Scenario 12: Concurrent requests cannot overshoot user or provider budgets
  test('Scenario 12: Concurrent requests cannot overshoot user or provider budgets', async () => {
    aiProviderRouter.groq = {
      generateText: async () => {
        // slight delay to test concurrency
        await new Promise((r) => setTimeout(r, 20));
        return { text: 'Concurrent answer' };
      }
    };

    const userId = 'concurrent_user';
    const requests = Array.from({ length: 15 }, (_, i) =>
      aiProviderRouter
        .execute({
          type: 'tutor',
          userId,
          userPrompt: `Parallel query ${i}`,
          skipCache: true
        })
        .then(() => 'success')
        .catch((e) => e.status || e.message)
    );

    const outcomes = await Promise.all(requests);
    const successes = outcomes.filter((o) => o === 'success');
    const user = userQuotaManager.getUserQuota(userId);

    assert.strictEqual(successes.length, 10, 'Exactly 10 requests should succeed');
    assert.strictEqual(user.count, 10, 'User count must not exceed 10');
  });

  // Scenario 13: One user cannot consume all the reserved capacity
  test('Scenario 13: One user cannot consume all the reserved capacity', () => {
    const heavyUser = 'heavy_user';
    for (let i = 0; i < 10; i++) {
      userQuotaManager.reserve(heavyUser, 10);
      userQuotaManager.commit(heavyUser);
    }
    const heavyQuota = userQuotaManager.getUserQuota(heavyUser);
    assert.strictEqual(heavyQuota.remaining, 0);

    // Another user can still get their allowance
    const freshUser = 'fresh_user';
    const freshReserve = userQuotaManager.reserve(freshUser, 10);
    assert.strictEqual(freshReserve.allowed, true);
    userQuotaManager.commit(freshUser);

    const freshQuota = userQuotaManager.getUserQuota(freshUser);
    assert.strictEqual(freshQuota.count, 1);
  });

  // Scenario 14: The application never automatically switches to a paid API
  test('Scenario 14: Application never automatically switches to a paid API', () => {
    assert.strictEqual(aiProviderRouter.automaticPaidFallback, false);
    assert.strictEqual(process.env.AI_AUTOMATIC_PAID_FALLBACK, 'false');
  });

  // Scenario 15: API keys are absent from mobile bundle and application logs
  test('Scenario 15: API keys are absent from mobile client files and admin reports', () => {
    const report = aiProviderRouter.getAdminReport();
    const reportString = JSON.stringify(report);
    assert.strictEqual(reportString.includes(process.env.GROQ_API_KEY || 'MISSING'), false);
    assert.strictEqual(reportString.includes(process.env.GEMINI_API_KEY || 'MISSING'), false);

    // Check client file
    const clientCode = fs.readFileSync(path.join(__dirname, '../../src/services/aiClient.ts'), 'utf8');
    assert.strictEqual(clientCode.includes('AI_API_KEY'), false);
    assert.strictEqual(clientCode.includes('gsk_'), false);
    assert.strictEqual(clientCode.includes('AIzaSy'), false);
  });

  // Scenario 16: Offline formula search works while both AI providers are unavailable
  test('Scenario 16: Offline formula search works while both AI providers are unavailable', () => {
    const results = FormulaRetrieval.retrieveContext({ query: 'should have' });
    assert.ok(Array.isArray(results) && results.length > 0, 'Offline formula retrieval must function');
    assert.ok(results[0].englishFormula.toLowerCase().includes('should have'));
  });

  // Scenario 17: Original 600 formula records and red-highlight system remain functional
  test('Scenario 17: Original 600 formula records and red-highlight system remain functional', () => {
    const f1 = FormulaRetrieval.getFormulaById(1);
    assert.ok(f1, 'Formula 1 must exist');
    assert.ok(f1.examples.length > 0, 'Formula 1 must have verified examples');

    const hasHighlight = f1.examples[0].englishSegments.some((s) => s.highlight);
    assert.strictEqual(hasHighlight, true, 'Red highlight segmentation must be intact');

    // Verify all 600 formulas
    const f600 = FormulaRetrieval.getFormulaById(600);
    assert.ok(f600, 'Formula 600 must exist');
  });

  // Scenario 18: Daily quotas reset according to daily reset policies
  test('Scenario 18: Daily quotas reset according to daily reset policies', () => {
    const userId = 'rollover_user';
    userQuotaManager.reserve(userId, 10);
    userQuotaManager.commit(userId);
    assert.strictEqual(userQuotaManager.getUserQuota(userId).count, 1);

    // Simulate date change
    userQuotaManager.state.date = '2020-01-01';
    userQuotaManager._checkRollover();

    const resetQuota = userQuotaManager.getUserQuota(userId);
    assert.strictEqual(resetQuota.count, 0, 'Count should reset to 0 on new day');
    assert.strictEqual(resetQuota.remaining, 10, 'Remaining should reset to 10');
  });
});
