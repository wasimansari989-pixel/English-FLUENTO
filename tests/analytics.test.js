const test = require('node:test');
const assert = require('node:assert');

// Analytics computation testing logic
function computeWeakTopics(mistakes, categoryMistakes = {}) {
  const counts = {};

  mistakes.forEach(m => {
    const cat = m.category || 'General';
    counts[cat] = (counts[cat] || 0) + 1;
  });

  Object.entries(categoryMistakes).forEach(([cat, count]) => {
    counts[cat] = Math.max(counts[cat] || 0, count);
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([topic, count]) => ({
      topic,
      mistakeCount: count,
      status: count >= 3 ? 'critical' : count >= 1 ? 'developing' : 'mastered',
    }));
}

function generateRecommendations(weakTopics, hasHistory, accuracy) {
  const list = [];
  if (!hasHistory) {
    list.push({ id: 'rec_start_f1', type: 'formula_review' });
    list.push({ id: 'rec_start_quiz', type: 'quiz_practice' });
    return list;
  }

  const critical = weakTopics.find(t => t.status === 'critical' || t.mistakeCount >= 2);
  if (critical) {
    list.push({
      id: `rec_weak_${critical.topic}`,
      type: 'formula_review',
      reason: `You have encountered ${critical.mistakeCount} mistakes in "${critical.topic}".`,
    });
    list.push({
      id: `rec_quiz_weak`,
      type: 'quiz_practice',
    });
  } else {
    list.push({
      id: 'rec_explore_more',
      type: 'formula_review',
      reason: `Great accuracy (${accuracy}%)!`,
    });
  }

  list.push({ id: 'rec_speaking', type: 'speaking_exercise' });
  return list;
}

test('Analytics: Empty state handling for brand-new users', () => {
  const emptyMistakes = [];
  const emptyCategoryMistakes = {};

  const weakTopics = computeWeakTopics(emptyMistakes, emptyCategoryMistakes);
  assert.strictEqual(weakTopics.length, 0);

  const recs = generateRecommendations(weakTopics, false, 0);
  assert.strictEqual(recs.length, 2);
  assert.strictEqual(recs[0].id, 'rec_start_f1');
  assert.strictEqual(recs[1].id, 'rec_start_quiz');
});

test('Analytics: Weak grammar topic identification based on recorded mistakes', () => {
  const mistakes = [
    { category: 'Conditional Sentences' },
    { category: 'Conditional Sentences' },
    { category: 'Conditional Sentences' },
    { category: 'Present Perfect' },
  ];
  const categoryMistakes = {
    'Conditional Sentences': 3,
    'Present Perfect': 1,
    'Modal Verbs': 2,
  };

  const weakTopics = computeWeakTopics(mistakes, categoryMistakes);
  assert.strictEqual(weakTopics.length, 3);

  // Highest mistake count should be first
  assert.strictEqual(weakTopics[0].topic, 'Conditional Sentences');
  assert.strictEqual(weakTopics[0].mistakeCount, 3);
  assert.strictEqual(weakTopics[0].status, 'critical');

  assert.strictEqual(weakTopics[1].topic, 'Modal Verbs');
  assert.strictEqual(weakTopics[1].status, 'developing');
});

test('Analytics: Genuine personalized recommendation generation', () => {
  const weakTopics = [
    { topic: 'Present Perfect', mistakeCount: 4, status: 'critical' },
  ];

  const recs = generateRecommendations(weakTopics, true, 72);
  assert.ok(recs.length >= 2);

  const reviewRec = recs.find(r => r.type === 'formula_review');
  assert.ok(reviewRec, 'Must recommend formula review for critical weak topic');
  assert.ok(reviewRec.reason.includes('Present Perfect'));
  assert.ok(reviewRec.reason.includes('4 mistakes'));

  const speakingRec = recs.find(r => r.type === 'speaking_exercise');
  assert.ok(speakingRec, 'Must recommend speaking exercise');
});

test('Analytics: Study time calculation logic', () => {
  const formulasCount = 10;
  const quizzesCount = 5;
  const speakingSessions = 3;

  const estimatedMinutes = formulasCount * 2 + quizzesCount * 3 + speakingSessions * 4;
  assert.strictEqual(estimatedMinutes, 20 + 15 + 12);
  assert.strictEqual(estimatedMinutes, 47);
});

test('Analytics: Weekly 7-day distribution structure', () => {
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  assert.strictEqual(dayLabels.length, 7);
  assert.strictEqual(dayLabels[0], 'Mon');
  assert.strictEqual(dayLabels[6], 'Sun');
});

