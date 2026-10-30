import { SentenceFormula } from '../../types/formula';
import { QuizQuestion, QuizQuestionType, ExplanationMode } from '../../types/ai';
import { getAllFormulas, getFormulaById } from '../../search/formulaSearch';

export function generateDeterministicQuestions(options: {
  count?: number;
  formulaId?: number;
  category?: string;
  helpingVerb?: string;
  difficulty?: ExplanationMode;
}): QuizQuestion[] {
  const { count = 10, formulaId, category, helpingVerb, difficulty = 'beginner' } = options;
  const all = getAllFormulas();
  let pool = all;

  if (formulaId) {
    const single = getFormulaById(formulaId);
    if (single) pool = [single];
  } else if (category && category !== 'All') {
    pool = all.filter(f => f.category === category || (f.categories && f.categories.includes(category)));
  } else if (helpingVerb) {
    pool = all.filter(f => f.helpingVerbs && f.helpingVerbs.includes(helpingVerb.toLowerCase()));
  }

  if (pool.length === 0) pool = all;

  const questions: QuizQuestion[] = [];
  const questionTypes: QuizQuestionType[] = [
    'hindi-to-english',
    'english-to-hindi',
    'choose-formula',
    'fill-blank',
    'helping-verb'
  ];

  for (let i = 0; i < count; i++) {
    // Pick a random formula from pool
    const formula = pool[Math.floor(Math.random() * pool.length)];
    if (!formula.examples || formula.examples.length === 0) continue;

    const example = formula.examples[Math.floor(Math.random() * formula.examples.length)];
    const hindi = example.originalHindi || example.hindiSegments.map(s => s.text).join('');
    const english = example.originalEnglish || example.englishSegments.map(s => s.text).join('');

    const type = questionTypes[i % questionTypes.length];

    if (type === 'hindi-to-english') {
      // Pick 3 distractors from other formulas
      const distractors: string[] = [];
      while (distractors.length < 3) {
        const randF = all[Math.floor(Math.random() * all.length)];
        if (randF.id !== formula.id && randF.examples && randF.examples.length > 0) {
          const randEx = randF.examples[0].originalEnglish || randF.examples[0].englishSegments.map(s => s.text).join('');
          if (!distractors.includes(randEx) && randEx !== english) {
            distractors.push(randEx);
          }
        }
      }
      const optionsShuffled = [english, ...distractors].sort(() => Math.random() - 0.5);

      questions.push({
        id: `q-${Date.now()}-${i}`,
        type: 'hindi-to-english',
        prompt: `इस वाक्य का सही English अनुवाद क्या होगा?`,
        hindiSubtext: `"${hindi}"`,
        options: optionsShuffled,
        correctAnswer: english,
        explanationHindi: `इस वाक्य में Formula #${formula.id} "${formula.englishFormula}" इस्तेमाल होता है, जिसका अर्थ "${formula.hindiMeaning}" होता है.`,
        formulaId: formula.id,
        difficulty,
        isAIGenerated: false
      });
    } else if (type === 'english-to-hindi') {
      const distractors: string[] = [];
      while (distractors.length < 3) {
        const randF = all[Math.floor(Math.random() * all.length)];
        if (randF.id !== formula.id && randF.examples && randF.examples.length > 0) {
          const randEx = randF.examples[0].originalHindi || randF.examples[0].hindiSegments.map(s => s.text).join('');
          if (!distractors.includes(randEx) && randEx !== hindi) {
            distractors.push(randEx);
          }
        }
      }
      const optionsShuffled = [hindi, ...distractors].sort(() => Math.random() - 0.5);

      questions.push({
        id: `q-${Date.now()}-${i}`,
        type: 'english-to-hindi',
        prompt: `What is the correct Hindi meaning of this English sentence?`,
        hindiSubtext: `"${english}"`,
        options: optionsShuffled,
        correctAnswer: hindi,
        explanationHindi: `English structure "${formula.englishFormula}" का सही हिंदी अर्थ "(${formula.hindiMeaning})" है.`,
        formulaId: formula.id,
        difficulty,
        isAIGenerated: false
      });
    } else if (type === 'choose-formula') {
      const distractors: string[] = [];
      while (distractors.length < 3) {
        const randF = all[Math.floor(Math.random() * all.length)];
        if (randF.id !== formula.id && !distractors.includes(randF.englishFormula) && randF.englishFormula !== formula.englishFormula) {
          distractors.push(randF.englishFormula);
        }
      }
      const optionsShuffled = [formula.englishFormula, ...distractors].sort(() => Math.random() - 0.5);

      questions.push({
        id: `q-${Date.now()}-${i}`,
        type: 'choose-formula',
        prompt: `इस वाक्य के लिए सही Sentence Formula कौन सा है?`,
        hindiSubtext: `"${english}" (${hindi})`,
        options: optionsShuffled,
        correctAnswer: formula.englishFormula,
        explanationHindi: `Formula #${formula.id}: "${formula.englishFormula}" - ${formula.hindiMeaning}`,
        formulaId: formula.id,
        difficulty,
        isAIGenerated: false
      });
    } else if (type === 'fill-blank') {
      // Find highlighted segment in English
      const hlSeg = example.englishSegments.find(s => s.highlight);
      const targetPhrase = hlSeg ? hlSeg.text.trim() : (formula.helpingVerbs[0] || 'to');
      const blankedEnglish = english.replace(new RegExp(targetPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '_______');

      const distractors = ['will be', 'had to', 'cannot', 'used to', 'am able to', 'need to']
        .filter(d => d.toLowerCase() !== targetPhrase.toLowerCase())
        .slice(0, 3);

      const optionsShuffled = [targetPhrase, ...distractors].sort(() => Math.random() - 0.5);

      questions.push({
        id: `q-${Date.now()}-${i}`,
        type: 'fill-blank',
        prompt: `खाली जगह भरें (Fill in the blank):`,
        hindiSubtext: `"${blankedEnglish}"\n(Hindi: "${hindi}")`,
        options: optionsShuffled,
        correctAnswer: targetPhrase,
        explanationHindi: `सही construction "${targetPhrase}" है, जो Formula #${formula.id} (${formula.hindiMeaning}) से आता है.`,
        formulaId: formula.id,
        difficulty,
        isAIGenerated: false
      });
    } else {
      // Helping verb question
      const verb = formula.helpingVerbs[0] || 'is';
      const distractors = ['has', 'have', 'had', 'was', 'were', 'will', 'did', 'do']
        .filter(v => v.toLowerCase() !== verb.toLowerCase())
        .slice(0, 3);
      const optionsShuffled = [verb, ...distractors].sort(() => Math.random() - 0.5);

      questions.push({
        id: `q-${Date.now()}-${i}`,
        type: 'helping-verb',
        prompt: `इस Formula/Sentence में कौन सा Helping Verb उपयोग होता है?`,
        hindiSubtext: `Formula #${formula.id}: ${formula.englishFormula}\n(Hindi: ${formula.hindiMeaning})`,
        options: optionsShuffled,
        correctAnswer: verb,
        explanationHindi: `Formula #${formula.id} में Helping Verb "${verb}" का उपयोग होता है.`,
        formulaId: formula.id,
        difficulty,
        isAIGenerated: false
      });
    }
  }

  return questions;
}
