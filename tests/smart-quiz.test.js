const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const formulas = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/formulas.json'), 'utf8'));

// Smart Quiz Generator (Logic mirroring quizService.ts)
function generateDeterministicQuestions(options = {}) {
  const {
    count = 10,
    formulaId,
    category,
    helpingVerb,
    difficulty = 'beginner',
    weakFormulaIds = [],
    allowedTypes,
  } = options;

  let pool = formulas;

  if (formulaId) {
    const single = pool.find((f) => f.id === formulaId);
    if (single) pool = [single];
  } else if (category && category !== 'All') {
    pool = pool.filter(
      (f) => f.category === category || (f.categories && f.categories.includes(category))
    );
  } else if (helpingVerb) {
    pool = pool.filter(
      (f) => f.helpingVerbs && f.helpingVerbs.includes(helpingVerb.toLowerCase())
    );
  } else if (weakFormulaIds.length > 0) {
    const weakList = weakFormulaIds.map((id) => pool.find((f) => f.id === id)).filter(Boolean);
    if (weakList.length > 0) {
      pool = weakList;
    }
  }

  if (!formulaId && pool.length > 30) {
    if (difficulty === 'beginner') {
      const beginnerPool = pool.filter((f) => f.id <= 150);
      if (beginnerPool.length >= 10) pool = beginnerPool;
    } else if (difficulty === 'intermediate') {
      const interPool = pool.filter((f) => f.id > 100 && f.id <= 400);
      if (interPool.length >= 10) pool = interPool;
    } else if (difficulty === 'advanced') {
      const advPool = pool.filter((f) => f.id > 300);
      if (advPool.length >= 10) pool = advPool;
    }
  }

  if (pool.length === 0) pool = formulas;

  const questions = [];
  const questionTypes = allowedTypes && allowedTypes.length > 0
    ? allowedTypes
    : [
        'hindi-to-english',
        'english-to-hindi',
        'choose-formula',
        'fill-blank',
        'helping-verb',
        'correct-sentence',
        'grammar-correction',
        'tense-practice',
        'vocabulary-practice',
      ];

  const usedFormulaExampleKeys = new Set();

  for (let i = 0; i < count; i++) {
    let attempts = 0;
    let formula = pool[Math.floor(Math.random() * pool.length)];
    while (attempts < 10 && usedFormulaExampleKeys.has(`f_${formula.id}`) && pool.length > count) {
      formula = pool[Math.floor(Math.random() * pool.length)];
      attempts++;
    }
    usedFormulaExampleKeys.add(`f_${formula.id}`);

    if (!formula.examples || formula.examples.length === 0) continue;

    const example = formula.examples[Math.floor(Math.random() * formula.examples.length)];
    const hindi = example.originalHindi || example.hindiSegments.map((s) => s.text).join('');
    const english = example.originalEnglish || example.englishSegments.map((s) => s.text).join('');

    const type = questionTypes[i % questionTypes.length];
    const qId = `q-${Date.now()}-${i}`;

    let prompt = '';
    let correctAnswer = '';
    let optionsList = [];
    let explanationHindi = '';

    if (type === 'hindi-to-english') {
      prompt = `Translate to English:\n"${hindi}"`;
      correctAnswer = english;
      const distractors = ['I will do this tomorrow.', 'They were playing cricket outside.', 'She has finished her homework.'];
      optionsList = [correctAnswer, ...distractors].sort(() => Math.random() - 0.5);
      explanationHindi = `इस वाक्य के लिए सही अनुवाद: "${english}" (Formula #${formula.id})`;
    } else if (type === 'english-to-hindi') {
      prompt = `Select the correct Hindi meaning:\n"${english}"`;
      correctAnswer = hindi;
      const distractors = ['वह घर जा रहा था।', 'हम खाना खा चुके हैं।', 'तुम कब आओगे?'];
      optionsList = [correctAnswer, ...distractors].sort(() => Math.random() - 0.5);
      explanationHindi = `अंग्रेजी वाक्य "${english}" का सही अर्थ है: "${hindi}"`;
    } else if (type === 'fill-blank') {
      const words = english.split(' ');
      const blankWord = words[Math.min(1, words.length - 1)];
      prompt = `Fill in the blank:\n"${english.replace(blankWord, '_____')}"`;
      correctAnswer = blankWord;
      const distractors = ['had', 'are', 'doing'].filter(w => w.toLowerCase() !== blankWord.toLowerCase());
      optionsList = [correctAnswer, ...distractors.slice(0, 3)].sort(() => Math.random() - 0.5);
      explanationHindi = `रिक्त स्थान में "${correctAnswer}" आएगा।`;
    } else if (type === 'correct-sentence') {
      prompt = `Choose the grammatically correct sentence:`;
      correctAnswer = english;
      const distractors = [`He ${english.toLowerCase()}`, `Do ${english.toLowerCase()} yesterday`, `Not ${english.toLowerCase()}`];
      optionsList = [correctAnswer, ...distractors].sort(() => Math.random() - 0.5);
      explanationHindi = `व्याकरण के अनुसार सही वाक्य: "${english}"`;
    } else if (type === 'grammar-correction') {
      prompt = `Identify the correction for: "${english.replace('is', 'are')}"`;
      correctAnswer = english;
      const distractors = [`Did ${english}`, `Will be ${english}`, `Having ${english}`];
      optionsList = [correctAnswer, ...distractors].sort(() => Math.random() - 0.5);
      explanationHindi = `सही रूप "${english}" है।`;
    } else if (type === 'tense-practice') {
      prompt = `Identify the tense or grammar structure used:\n"${english}"`;
      correctAnswer = formula.category || 'General Sentence';
      const distractors = ['Past Continuous', 'Present Perfect', 'Future Simple', 'Modal Auxiliary'].filter(c => c !== correctAnswer);
      optionsList = [correctAnswer, ...distractors.slice(0, 3)].sort(() => Math.random() - 0.5);
      explanationHindi = `यह वाक्य "${correctAnswer}" श्रेणी (Formula #${formula.id}) का उदाहरण है।`;
    } else if (type === 'vocabulary-practice') {
      const words = english.split(' ');
      const targetWord = words[words.length - 1].replace(/[.,!?]/g, '');
      prompt = `What does the word "${targetWord}" mean in this context?\n"${english}"`;
      correctAnswer = hindi;
      const distractors = ['समय से पहले पहुंचना', 'नियमों का उल्लंघन करना', 'गहरी नींद में सोना'];
      optionsList = [correctAnswer, ...distractors].sort(() => Math.random() - 0.5);
      explanationHindi = `वाक्य के संदर्भ में सही भाव: "${hindi}"`;
    } else {
      prompt = `Which formula matches:\n"${english}"`;
      correctAnswer = formula.englishFormula;
      const distractors = ['Subject + V1 + Object', 'Subject + was/were + V4 + Object', 'Subject + will + V1'];
      optionsList = [correctAnswer, ...distractors].sort(() => Math.random() - 0.5);
      explanationHindi = `सही फॉर्मूला: ${formula.englishFormula}`;
    }

    questions.push({
      id: qId,
      type,
      prompt,
      options: optionsList,
      correctAnswer,
      explanationHindi,
      formulaId: formula.id,
      difficulty,
    });
  }

  return questions;
}

test('Smart Quiz: Generates all 9 question types with valid structure', () => {
  const qs = generateDeterministicQuestions({ count: 18 });
  assert.strictEqual(qs.length, 18);

  const encounteredTypes = new Set();
  for (const q of qs) {
    encounteredTypes.add(q.type);
    assert.ok(q.prompt && q.prompt.length > 0, `Question ${q.id} missing prompt`);
    assert.ok(Array.isArray(q.options) && q.options.length >= 2, `Question ${q.id} options invalid`);
    assert.ok(q.options.includes(q.correctAnswer), `Correct answer '${q.correctAnswer}' missing from options in ${q.id}`);
    assert.ok(q.explanationHindi && q.explanationHindi.length > 0, `Question ${q.id} missing explanation`);
    assert.ok(q.formulaId >= 1 && q.formulaId <= 600, `Question ${q.id} formulaId out of bounds: ${q.formulaId}`);
  }

  assert.ok(encounteredTypes.size >= 8, `Expected at least 8 unique types, got ${encounteredTypes.size}`);
});

test('Smart Quiz: Difficulty adjustment targets appropriate formula ranges', () => {
  const beginner = generateDeterministicQuestions({ count: 10, difficulty: 'beginner' });
  const beginnerIds = beginner.map((q) => q.formulaId);
  assert.ok(beginnerIds.every((id) => id <= 150), 'All beginner formulas must have ID <= 150');

  const advanced = generateDeterministicQuestions({ count: 10, difficulty: 'advanced' });
  const advancedIds = advanced.map((q) => q.formulaId);
  assert.ok(advancedIds.every((id) => id > 300), 'All advanced formulas must have ID > 300');
});

test('Smart Quiz: Prioritizes weak formula IDs', () => {
  const weakTarget = [25, 45, 99];
  const weakQs = generateDeterministicQuestions({ count: 6, weakFormulaIds: weakTarget });
  const returnedIds = weakQs.map((q) => q.formulaId);
  assert.ok(returnedIds.every((id) => weakTarget.includes(id)), 'All questions must come from weak pool');
});

test('Smart Quiz: Adaptive streak logic simulation', () => {
  let difficulty = 'beginner';
  let streak = 0;

  function simulateAnswer(isCorrect) {
    if (isCorrect) {
      streak = streak >= 0 ? streak + 1 : 1;
      if (streak >= 3 && difficulty !== 'advanced') {
        difficulty = difficulty === 'beginner' ? 'intermediate' : 'advanced';
        streak = 0;
      }
    } else {
      streak = streak <= 0 ? streak - 1 : -1;
      if (streak <= -2 && difficulty !== 'beginner') {
        difficulty = difficulty === 'advanced' ? 'intermediate' : 'beginner';
        streak = 0;
      }
    }
    return difficulty;
  }

  // 3 correct answers -> should promote from beginner to intermediate
  simulateAnswer(true);
  simulateAnswer(true);
  assert.strictEqual(difficulty, 'beginner');
  simulateAnswer(true);
  assert.strictEqual(difficulty, 'intermediate', 'Expected promotion to intermediate after 3 correct');

  // Another 3 correct answers -> should promote to advanced
  simulateAnswer(true);
  simulateAnswer(true);
  simulateAnswer(true);
  assert.strictEqual(difficulty, 'advanced', 'Expected promotion to advanced after 3 more correct');

  // 2 consecutive mistakes -> should ease down to intermediate
  simulateAnswer(false);
  simulateAnswer(false);
  assert.strictEqual(difficulty, 'intermediate', 'Expected downgrade to intermediate after 2 mistakes');
});

