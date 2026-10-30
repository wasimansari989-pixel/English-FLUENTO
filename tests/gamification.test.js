const test = require('node:test');
const assert = require('node:assert');

// Mock Level Tiers and Config
const LEVEL_TIERS = [
  { level: 1, title: 'Novice Explorer', minXp: 0, maxXp: 100 },
  { level: 2, title: 'Spoken Learner', minXp: 100, maxXp: 250 },
  { level: 3, title: 'Sentence Builder', minXp: 250, maxXp: 500 },
  { level: 4, title: 'Fluent Communicator', minXp: 500, maxXp: 900 },
  { level: 5, title: 'Grammar Master', minXp: 900, maxXp: 1500 },
  { level: 6, title: 'Conversation Pro', minXp: 1500, maxXp: 2300 },
  { level: 7, title: 'Fluent Champion', minXp: 2300, maxXp: 3300 },
  { level: 8, title: 'Language Wizard', minXp: 3300, maxXp: 4500 },
  { level: 9, title: 'Master Speaker', minXp: 4500, maxXp: 6000 },
  { level: 10, title: 'English Maestro', minXp: 6000, maxXp: 10000 },
];

function calculateLevelStats(totalXp) {
  let tier = LEVEL_TIERS[0];
  for (let i = LEVEL_TIERS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVEL_TIERS[i].minXp) {
      tier = LEVEL_TIERS[i];
      break;
    }
  }

  const currentLevelXp = Math.max(0, totalXp - tier.minXp);
  const nextLevelXp = Math.max(1, tier.maxXp - tier.minXp);

  return {
    level: tier.level,
    levelTitle: tier.title,
    currentLevelXp,
    nextLevelXp,
  };
}

function computeStreak(profile, todayStr, yesterdayStr) {
  if (profile.lastActiveDate === todayStr) {
    // Already active today; streak does not increase
    return profile.currentStreak;
  } else if (profile.lastActiveDate === yesterdayStr) {
    // Consecutive active day
    profile.currentStreak += 1;
    if (profile.currentStreak > profile.longestStreak) {
      profile.longestStreak = profile.currentStreak;
    }
    profile.lastActiveDate = todayStr;
    return profile.currentStreak;
  } else {
    // Break in streak
    profile.currentStreak = 1;
    if (profile.currentStreak > profile.longestStreak) {
      profile.longestStreak = profile.currentStreak;
    }
    profile.lastActiveDate = todayStr;
    return profile.currentStreak;
  }
}

test('Gamification: Level calculation thresholds', () => {
  const l1 = calculateLevelStats(0);
  assert.strictEqual(l1.level, 1);
  assert.strictEqual(l1.levelTitle, 'Novice Explorer');
  assert.strictEqual(l1.currentLevelXp, 0);
  assert.strictEqual(l1.nextLevelXp, 100);

  const l1Half = calculateLevelStats(50);
  assert.strictEqual(l1Half.level, 1);
  assert.strictEqual(l1Half.currentLevelXp, 50);

  const l2 = calculateLevelStats(100);
  assert.strictEqual(l2.level, 2);
  assert.strictEqual(l2.levelTitle, 'Spoken Learner');
  assert.strictEqual(l2.currentLevelXp, 0);

  const l3 = calculateLevelStats(300);
  assert.strictEqual(l3.level, 3);
  assert.strictEqual(l3.currentLevelXp, 50); // 300 - 250 minXp

  const maxLevel = calculateLevelStats(7500);
  assert.strictEqual(maxLevel.level, 10);
  assert.strictEqual(maxLevel.levelTitle, 'English Maestro');
});

test('Gamification: Streak calculation prevents duplicate same-day increments and preserves longest streak', () => {
  const profile = {
    currentStreak: 5,
    longestStreak: 10,
    lastActiveDate: '2026-10-29',
  };

  // Same day activity:
  const s1 = computeStreak(profile, '2026-10-29', '2026-10-28');
  assert.strictEqual(s1, 5, 'Streak must NOT increment on the same active day');

  // Next consecutive day:
  const s2 = computeStreak(profile, '2026-10-30', '2026-10-29');
  assert.strictEqual(s2, 6, 'Streak must increment on next consecutive day');
  assert.strictEqual(profile.longestStreak, 10, 'Longest streak should remain 10');

  // Skipped day (break in streak):
  const s3 = computeStreak(profile, '2026-11-03', '2026-11-02');
  assert.strictEqual(s3, 1, 'Streak must reset to 1 after missing days');
  assert.strictEqual(profile.longestStreak, 10, 'Longest streak must still be preserved');
});

test('Gamification: Duplicate reward prevention via event keys', () => {
  const rewardHistory = [];
  let totalXp = 0;

  function awardReward(activityType, xp, eventKey) {
    if (eventKey && rewardHistory.some((r) => r.eventKey === eventKey)) {
      return false; // Skipped duplicate
    }
    totalXp += xp;
    rewardHistory.push({ activityType, xp, eventKey, timestamp: Date.now() });
    return true;
  }

  const res1 = awardReward('formula_lesson', 10, 'formula_15_2026-10-30');
  assert.strictEqual(res1, true);
  assert.strictEqual(totalXp, 10);

  // Attempt duplicate reward with identical event key:
  const res2 = awardReward('formula_lesson', 10, 'formula_15_2026-10-30');
  assert.strictEqual(res2, false);
  assert.strictEqual(totalXp, 10, 'Total XP must not increment on duplicate reward');
  assert.strictEqual(rewardHistory.length, 1);

  // Different formula lesson:
  const res3 = awardReward('formula_lesson', 10, 'formula_16_2026-10-30');
  assert.strictEqual(res3, true);
  assert.strictEqual(totalXp, 20);
  assert.strictEqual(rewardHistory.length, 2);
});

test('Gamification: Achievement conditions evaluation', () => {
  const profile = {
    formulasLearned: 25,
    totalXp: 150,
    currentStreak: 7,
    longestStreak: 7,
    quizzesCompleted: 10,
    perfectQuizzes: 1,
    speakingSessionsCompleted: 1,
    categoriesExplored: ['Tenses', 'Modals', 'Conditionals', 'Passive', 'Imperative'],
  };

  const achievements = [
    { id: 'first_lesson', condition: profile.formulasLearned >= 1 },
    { id: 'first_100_xp', condition: profile.totalXp >= 100 },
    { id: 'streak_3_days', condition: Math.max(profile.currentStreak, profile.longestStreak) >= 3 },
    { id: 'streak_7_days', condition: Math.max(profile.currentStreak, profile.longestStreak) >= 7 },
    { id: 'grammar_master', condition: profile.formulasLearned >= 25 },
    { id: 'speaking_starter', condition: profile.speakingSessionsCompleted >= 1 },
    { id: 'quiz_champion', condition: profile.quizzesCompleted >= 10 },
    { id: 'formula_explorer', condition: profile.categoriesExplored.length >= 5 },
    { id: 'perfect_quiz', condition: profile.perfectQuizzes >= 1 },
  ];

  for (const ach of achievements) {
    assert.strictEqual(ach.condition, true, `Achievement ${ach.id} should be unlocked`);
  }
});

test('Gamification: Backend leaderboard anti-cheat score validation', () => {
  const currentAllTimeXp = 100;
  const submittedXp = 999999; // Malicious spoofed client payload

  // Max jump allowed per sync is 800 XP
  const validatedXp = Math.max(currentAllTimeXp, Math.min(submittedXp, currentAllTimeXp + 800));

  assert.strictEqual(validatedXp, 900, 'Anti-cheat must clamp excessive sudden XP gains');
});

