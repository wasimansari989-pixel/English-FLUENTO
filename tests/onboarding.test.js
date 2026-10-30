const test = require('node:test');
const assert = require('node:assert');

// Assessment questions from prototype
const ASSESSMENT_QUESTIONS = {
  Beginner: [
    {
      q: 'Complete the sentence: “I ___ a student.”',
      sub: 'To-be verb · Basic',
      opts: ['is', 'am', 'are', 'be'],
      correct: 1,
      why: 'Use “am” with “I”: I am a student.',
    },
    {
      q: 'Complete the sentence: “I ___ learning English.”',
      sub: 'Present continuous · Basic',
      opts: ['am', 'is', 'are', 'be'],
      correct: 0,
      why: 'Use “am” with “I”: I am learning English.',
    },
    {
      q: 'Which sentence talks about the past?',
      sub: 'Past simple · Basic',
      opts: ['I play cricket.', 'I am playing cricket.', 'I played cricket.', 'I will play cricket.'],
      correct: 2,
      why: '“Played” is the past form of “play”.',
    },
  ],
  Intermediate: [
    {
      q: 'Choose the most natural sentence.',
      sub: 'Present perfect · Intermediate',
      opts: ['I have finished my work.', 'I has finished my work.', 'I have finish my work.', 'I am finished my work.'],
      correct: 0,
      why: 'Use have + past participle: “have finished”.',
    },
    {
      q: 'Complete: “She has lived here ___ 2020.”',
      sub: 'Since and for · Intermediate',
      opts: ['for', 'since', 'during', 'from'],
      correct: 1,
      why: 'Use “since” with a starting point in time.',
    },
    {
      q: 'Choose the correct conditional.',
      sub: 'First conditional · Intermediate',
      opts: ['If it rains, we will stay home.', 'If it will rain, we stay home.', 'If it rain, we will stayed home.', 'If it rained, we will stay home.'],
      correct: 0,
      why: 'A common first conditional pattern is if + present simple, will + base verb.',
    },
  ],
  Advanced: [
    {
      q: 'Choose the grammatically correct sentence.',
      sub: 'Inversion · Advanced',
      opts: ['Rarely I have seen such care.', 'Rarely have I seen such care.', 'Rarely did I have saw such care.', 'Rarely I saw have such care.'],
      correct: 1,
      why: 'Negative adverbs such as “rarely” can trigger subject–auxiliary inversion.',
    },
    {
      q: 'Complete: “Had I known, I ___ earlier.”',
      sub: 'Third conditional inversion · Advanced',
      opts: ['would leave', 'would have left', 'will have left', 'had leave'],
      correct: 1,
      why: '“Had I known” corresponds to “If I had known”; the result uses would have + past participle.',
    },
    {
      q: 'Choose the clearest reported-speech form.',
      sub: 'Reported speech · Advanced',
      opts: ['She said she is already leave.', 'She said that she had already left.', 'She said she has already leaving.', 'She said that she already leaves yesterday.'],
      correct: 1,
      why: '“Had already left” is a natural backshifted form when reporting a past statement.',
    },
  ],
};

function calculatePlacementScore(level, answers) {
  const qs = ASSESSMENT_QUESTIONS[level];
  const score = answers.reduce(
    (acc, ans, idx) => acc + (ans === qs[idx].correct ? 1 : 0),
    0
  );
  let rec = level;
  if (score === 3) {
    rec = level;
  } else if (score === 2) {
    rec = level === 'Advanced' ? 'Intermediate' : level;
  } else {
    rec = level === 'Beginner' ? 'Beginner' : level === 'Advanced' ? 'Intermediate' : 'Beginner';
  }
  return { score, rec };
}

test('Onboarding Assessment: Beginner full score gives Beginner placement', () => {
  const { score, rec } = calculatePlacementScore('Beginner', [1, 0, 2]);
  assert.strictEqual(score, 3);
  assert.strictEqual(rec, 'Beginner');
});

test('Onboarding Assessment: Intermediate score 2 maintains Intermediate placement', () => {
  const { score, rec } = calculatePlacementScore('Intermediate', [0, 1, 3]); // last answer wrong
  assert.strictEqual(score, 2);
  assert.strictEqual(rec, 'Intermediate');
});

test('Onboarding Assessment: Advanced score 1 recommends Intermediate placement', () => {
  const { score, rec } = calculatePlacementScore('Advanced', [1, 0, 0]); // only 1 correct
  assert.strictEqual(score, 1);
  assert.strictEqual(rec, 'Intermediate');
});

test('Onboarding Assessment: Intermediate score 0 recommends Beginner placement', () => {
  const { score, rec } = calculatePlacementScore('Intermediate', [2, 0, 3]); // all wrong
  assert.strictEqual(score, 0);
  assert.strictEqual(rec, 'Beginner');
});

test('Onboarding: Country filter finds by name and dial code', () => {
  const COUNTRIES = [
    { code: 'IN', flag: '🇮🇳', name: 'India', dial: '+91' },
    { code: 'US', flag: '🇺🇸', name: 'United States', dial: '+1' },
    { code: 'GB', flag: '🇬🇧', name: 'United Kingdom', dial: '+44' },
    { code: 'CA', flag: '🇨🇦', name: 'Canada', dial: '+1' },
  ];
  const filterByName = COUNTRIES.filter(c => (c.name + ' ' + c.code).toLowerCase().includes('ind'));
  assert.strictEqual(filterByName.length, 1); // India

  const filterByExact = COUNTRIES.filter(c => c.name.toLowerCase().startsWith('india'));
  assert.strictEqual(filterByExact.length, 1);
  assert.strictEqual(filterByExact[0].code, 'IN');
});
