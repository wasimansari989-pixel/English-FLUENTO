const test = require('node:test');
const assert = require('node:assert');
const ResponseValidation = require('../backend/src/services/responseValidation');
const QuotaService = require('../backend/src/services/quotaService');

test('AI Schema: Sentence correction validation handles clean JSON', () => {
  const jsonStr = JSON.stringify({
    original: "He have been working.",
    corrected: "He has been working.",
    isCorrect: false,
    explanationHindi: "He के साथ has use hota hai.",
    grammarTags: ["has been"],
    suggestedFormulaIds: [207]
  });

  const parsed = ResponseValidation.validateSentenceCorrection(jsonStr, "He have been working.");
  assert.strictEqual(parsed.original, "He have been working.");
  assert.strictEqual(parsed.corrected, "He has been working.");
  assert.strictEqual(parsed.isCorrect, false);
  assert.deepStrictEqual(parsed.suggestedFormulaIds, [207]);
});

test('AI Schema: Sentence correction validation recovers from markdown code blocks', () => {
  const markdownWrapped = "```json\n" + JSON.stringify({
    original: "I is ready.",
    corrected: "I am ready.",
    isCorrect: false,
    explanationHindi: "I के साथ am use hota hai.",
    grammarTags: ["am/is/are"],
    suggestedFormulaIds: [5]
  }) + "\n```";

  const parsed = ResponseValidation.validateSentenceCorrection(markdownWrapped, "I is ready.");
  assert.strictEqual(parsed.corrected, "I am ready.");
  assert.strictEqual(parsed.isCorrect, false);
  assert.deepStrictEqual(parsed.suggestedFormulaIds, [5]);
});

test('AI Schema: Response validation safe fallback on corrupt input', () => {
  const corrupt = "This is not valid json at all!";
  const parsed = ResponseValidation.validateSentenceCorrection(corrupt, "Some test sentence.");
  assert.ok(parsed);
  assert.strictEqual(parsed.original, "Some test sentence.");
  assert.strictEqual(typeof parsed.isCorrect, 'boolean');
});

test('AI Quota: QuotaService enforces limits and rejects oversize input', () => {
  // Test oversize input
  const hugeText = 'a'.repeat(1500);
  const overRes = QuotaService.checkAndRecordUsage('user-1', hugeText.length);
  assert.strictEqual(overRes.allowed, false);
  assert.ok(overRes.error.includes('too long'));

  // Normal input
  const normalRes = QuotaService.checkAndRecordUsage('user-2', 50);
  assert.strictEqual(normalRes.allowed, true);
  assert.ok(normalRes.remainingToday >= 0);
});
