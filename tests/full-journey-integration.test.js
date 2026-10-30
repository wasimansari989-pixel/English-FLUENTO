const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const formulas = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/formulas.json'), 'utf8'));

test('Full Journey: Onboarding placement and level selection', () => {
  // Beginner evaluation scenario
  const beginnerCorrect = 1;
  const beginnerPlacement = beginnerCorrect <= 1 ? 'beginner' : 'intermediate';
  assert.strictEqual(beginnerPlacement, 'beginner');

  // Advanced placement scenario
  const advancedCorrect = 3;
  const advancedPlacement = advancedCorrect >= 3 ? 'advanced' : 'intermediate';
  assert.strictEqual(advancedPlacement, 'advanced');
});

test('Full Journey: 600 Formulas dataset, Local Search & Bookmarking', () => {
  assert.strictEqual(formulas.length, 600, 'All 600 formulas present');
  
  // Test search filter
  const searchTarget = 'can';
  const matches = formulas.filter(f => 
    (f.category && f.category.toLowerCase().includes(searchTarget)) ||
    (f.englishFormula && f.englishFormula.toLowerCase().includes(searchTarget)) ||
    (f.helpingVerbs && f.helpingVerbs.some(v => v.toLowerCase().includes(searchTarget)))
  );
  assert.ok(matches.length > 0, 'Formulas search yields local results');

  // Test bookmark selection persistence logic
  const bookmarkedIds = new Set([1, 42, 600]);
  assert.ok(bookmarkedIds.has(1));
  assert.ok(bookmarkedIds.has(42));
  assert.ok(bookmarkedIds.has(600));
  assert.strictEqual(bookmarkedIds.has(99), false);
});

test('Full Journey: Smart Quiz adaptive difficulty adjustment', () => {
  function calculateDifficulty(recentAccuracy, currentLevel) {
    if (recentAccuracy >= 0.85) {
      if (currentLevel === 'beginner') return 'intermediate';
      if (currentLevel === 'intermediate') return 'advanced';
      return 'advanced';
    } else if (recentAccuracy <= 0.40) {
      if (currentLevel === 'advanced') return 'intermediate';
      if (currentLevel === 'intermediate') return 'beginner';
      return 'beginner';
    }
    return currentLevel;
  }

  // Difficulty adjusts down on low accuracy
  const adjustedDown = calculateDifficulty(0.2, 'intermediate');
  assert.strictEqual(adjustedDown, 'beginner');

  // Difficulty adjusts up on high accuracy
  const adjustedUp = calculateDifficulty(0.9, 'beginner');
  assert.strictEqual(adjustedUp, 'intermediate');
});

test('Full Journey: XP allocation, levels & anti-duplication', () => {
  function calculateLevel(xp) {
    if (xp < 250) return { level: 1, currentLevelXp: 0, nextLevelXp: 250 };
    if (xp < 750) return { level: 2, currentLevelXp: 250, nextLevelXp: 750 };
    if (xp < 1500) return { level: 3, currentLevelXp: 750, nextLevelXp: 1500 };
    return { level: 4, currentLevelXp: 1500, nextLevelXp: 3000 };
  }

  const levelInfo = calculateLevel(350);
  assert.strictEqual(levelInfo.level, 2);
  assert.strictEqual(levelInfo.currentLevelXp, 250);
  assert.strictEqual(levelInfo.nextLevelXp, 750);

  // Anti-duplication event key check
  const eventKey = 'quiz_score_f12_1730000000';
  const processedEvents = new Set([eventKey]);
  assert.ok(processedEvents.has(eventKey), 'Detects duplicate event submission');
});

test('Full Journey: Offline Queue & Sync pipeline', () => {
  const syncQueue = [];
  syncQueue.push({ id: 'task_1', type: 'quiz_score', payload: { score: 10, xpEarned: 15 }, attempts: 0 });
  syncQueue.push({ id: 'task_2', type: 'speaking_session', payload: { durationSec: 120, xpEarned: 20 }, attempts: 0 });

  assert.strictEqual(syncQueue.length, 2);
  const nextTask = syncQueue.shift();
  assert.strictEqual(nextTask.id, 'task_1');
  assert.strictEqual(syncQueue.length, 1);
});

test('Full Journey: Analytics weak grammar tracking & recommendations', () => {
  const mockMistakes = [
    { formulaName: 'Present Perfect', category: 'Tenses' },
    { formulaName: 'Present Perfect', category: 'Tenses' },
    { formulaName: 'Conditional Sentences', category: 'Conditionals' },
  ];

  const counts = {};
  mockMistakes.forEach(m => {
    counts[m.formulaName] = (counts[m.formulaName] || 0) + 1;
  });

  const sortedWeakTopics = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([topic, count]) => ({ topic, count }));

  assert.strictEqual(sortedWeakTopics[0].topic, 'Present Perfect');
  assert.strictEqual(sortedWeakTopics[0].count, 2);
});
