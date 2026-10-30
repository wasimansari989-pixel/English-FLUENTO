import { SentenceFormula } from '../../types/formula';
import { QuizQuestion, QuizQuestionType, ExplanationMode } from '../../types/ai';
import { getAllFormulas, getFormulaById } from '../../search/formulaSearch';

export interface SmartQuizOptions {
  count?: number;
  formulaId?: number;
  category?: string;
  helpingVerb?: string;
  difficulty?: ExplanationMode;
  weakFormulaIds?: number[];
  allowedTypes?: QuizQuestionType[];
}

export function generateDeterministicQuestions(options: SmartQuizOptions): QuizQuestion[] {
  const {
    count = 10,
    formulaId,
    category,
    helpingVerb,
    difficulty = 'beginner',
    weakFormulaIds = [],
    allowedTypes,
  } = options;

  const all = getAllFormulas();
  let pool = all;

  // 1. Filter by specific formula if requested
  if (formulaId) {
    const single = getFormulaById(formulaId);
    if (single) pool = [single];
  } else if (category && category !== 'All') {
    pool = all.filter(
      (f) => f.category === category || (f.categories && f.categories.includes(category))
    );
  } else if (helpingVerb) {
    pool = all.filter(
      (f) => f.helpingVerbs && f.helpingVerbs.includes(helpingVerb.toLowerCase())
    );
  } else if (weakFormulaIds.length > 0) {
    // Prioritize weak formulas user made mistakes on
    const weakList = weakFormulaIds.map((id) => getFormulaById(id)).filter(Boolean) as SentenceFormula[];
    if (weakList.length > 0) {
      pool = weakList;
    }
  }

  // 2. Filter by difficulty if pool is large
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

  if (pool.length === 0) pool = all;

  const questions: QuizQuestion[] = [];
  const questionTypes: QuizQuestionType[] = allowedTypes && allowedTypes.length > 0
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

  const usedFormulaExampleKeys = new Set<string>();

  for (let i = 0; i < count; i++) {
    // Pick formula with anti-duplication
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
    const qId = `q-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`;

    // 1. Hindi to English Translation
    if (type === 'hindi-to-english') {
      const distractors: string[] = [];
      let tries = 0;
      while (distractors.length < 3 && tries < 30) {
        tries++;
        const randF = all[Math.floor(Math.random() * all.length)];
        if (randF.id !== formula.id && randF.examples && randF.examples.length > 0) {
          const randEx =
            randF.examples[0].originalEnglish ||
            randF.examples[0].englishSegments.map((s) => s.text).join('');
          if (!distractors.includes(randEx) && randEx !== english) {
            distractors.push(randEx);
          }
        }
      }
      const optionsShuffled = [english, ...distractors].sort(() => Math.random() - 0.5);

      questions.push({
        id: qId,
        type: 'hindi-to-english',
        prompt: `इस वाक्य का सही English अनुवाद क्या होगा?`,
        hindiSubtext: `"${hindi}"`,
        options: optionsShuffled,
        correctAnswer: english,
        explanationHindi: `इस वाक्य में Formula #${formula.id} "${formula.englishFormula}" इस्तेमाल होता है, जिसका अर्थ "${formula.hindiMeaning}" होता है।`,
        formulaId: formula.id,
        difficulty,
        isAIGenerated: false,
      });
    }

    // 2. English to Hindi Understanding
    else if (type === 'english-to-hindi') {
      const distractors: string[] = [];
      let tries = 0;
      while (distractors.length < 3 && tries < 30) {
        tries++;
        const randF = all[Math.floor(Math.random() * all.length)];
        if (randF.id !== formula.id && randF.examples && randF.examples.length > 0) {
          const randEx =
            randF.examples[0].originalHindi ||
            randF.examples[0].hindiSegments.map((s) => s.text).join('');
          if (!distractors.includes(randEx) && randEx !== hindi) {
            distractors.push(randEx);
          }
        }
      }
      const optionsShuffled = [hindi, ...distractors].sort(() => Math.random() - 0.5);

      questions.push({
        id: qId,
        type: 'english-to-hindi',
        prompt: `What is the correct Hindi meaning of this English sentence?`,
        hindiSubtext: `"${english}"`,
        options: optionsShuffled,
        correctAnswer: hindi,
        explanationHindi: `English structure "${formula.englishFormula}" का सही हिंदी अर्थ "(${formula.hindiMeaning})" है।`,
        formulaId: formula.id,
        difficulty,
        isAIGenerated: false,
      });
    }

    // 3. Choose Formula
    else if (type === 'choose-formula') {
      const distractors: string[] = [];
      let tries = 0;
      while (distractors.length < 3 && tries < 30) {
        tries++;
        const randF = all[Math.floor(Math.random() * all.length)];
        if (
          randF.id !== formula.id &&
          !distractors.includes(randF.englishFormula) &&
          randF.englishFormula !== formula.englishFormula
        ) {
          distractors.push(randF.englishFormula);
        }
      }
      const optionsShuffled = [formula.englishFormula, ...distractors].sort(() => Math.random() - 0.5);

      questions.push({
        id: qId,
        type: 'choose-formula',
        prompt: `इस वाक्य के लिए सही Sentence Formula कौन सा है?`,
        hindiSubtext: `"${english}"\n(${hindi})`,
        options: optionsShuffled,
        correctAnswer: formula.englishFormula,
        explanationHindi: `Formula #${formula.id}: "${formula.englishFormula}" — ${formula.hindiMeaning}`,
        formulaId: formula.id,
        difficulty,
        isAIGenerated: false,
      });
    }

    // 4. Fill in the Blank
    else if (type === 'fill-blank') {
      const hlSeg = example.englishSegments.find((s) => s.highlight);
      const targetPhrase = hlSeg ? hlSeg.text.trim() : (formula.helpingVerbs[0] || 'to');
      const blankedEnglish = english.replace(
        new RegExp(targetPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
        '_______'
      );

      const candidateDistractors = [
        'will be',
        'had to',
        'cannot',
        'used to',
        'am able to',
        'need to',
        'was going to',
        'would have',
        'has been',
        'is to',
      ].filter((d) => d.toLowerCase() !== targetPhrase.toLowerCase());

      const distractors = candidateDistractors.slice(0, 3);
      const optionsShuffled = [targetPhrase, ...distractors].sort(() => Math.random() - 0.5);

      questions.push({
        id: qId,
        type: 'fill-blank',
        prompt: `खाली जगह भरें (Fill in the blank):`,
        hindiSubtext: `"${blankedEnglish}"\n(Hindi: "${hindi}")`,
        options: optionsShuffled,
        correctAnswer: targetPhrase,
        explanationHindi: `सही construction "${targetPhrase}" है, जो Formula #${formula.id} (${formula.hindiMeaning}) से आता है।`,
        formulaId: formula.id,
        difficulty,
        isAIGenerated: false,
      });
    }

    // 5. Helping Verb Practice
    else if (type === 'helping-verb') {
      const verb = formula.helpingVerbs[0] || 'is';
      const distractors = ['has', 'have', 'had', 'was', 'were', 'will', 'did', 'do', 'could', 'should']
        .filter((v) => v.toLowerCase() !== verb.toLowerCase())
        .slice(0, 3);
      const optionsShuffled = [verb, ...distractors].sort(() => Math.random() - 0.5);

      questions.push({
        id: qId,
        type: 'helping-verb',
        prompt: `इस Formula/Sentence में कौन सा Helping Verb उपयोग होता है?`,
        hindiSubtext: `Formula #${formula.id}: ${formula.englishFormula}\n(Hindi: ${formula.hindiMeaning})`,
        options: optionsShuffled,
        correctAnswer: verb,
        explanationHindi: `Formula #${formula.id} में Helping Verb "${verb}" का उपयोग होता है।`,
        formulaId: formula.id,
        difficulty,
        isAIGenerated: false,
      });
    }

    // 6. Correct Sentence Selection (Grammatically correct among common mistakes)
    else if (type === 'correct-sentence') {
      const correctOption = english;
      // Intentionally generate realistic common errors without breaking English sense
      const badOption1 = english.replace(/\b(is|am|are|was|were)\b/i, '');
      const badOption2 = english.replace(/\bhas\b/i, 'have').replace(/\bhave\b/i, 'has');
      const badOption3 = english.replace(/\b(went|bought|came|saw)\b/i, (m) => `did ${m}`);

      const uniqueDistractors = Array.from(new Set([badOption1, badOption2, badOption3]))
        .filter((s) => s.trim() !== correctOption.trim())
        .slice(0, 3);

      while (uniqueDistractors.length < 3) {
        uniqueDistractors.push(`He ${english}`);
      }

      const optionsShuffled = [correctOption, ...uniqueDistractors].sort(() => Math.random() - 0.5);

      questions.push({
        id: qId,
        type: 'correct-sentence',
        prompt: `इनमें से कौन सा वाक्य व्याकरण (Grammar) के अनुसार बिल्कुल सही है?`,
        hindiSubtext: `अर्थ: "${hindi}"`,
        options: optionsShuffled,
        correctAnswer: correctOption,
        explanationHindi: `सही वाक्य "${correctOption}" है। Formula #${formula.id} (${formula.englishFormula}) सही संरचना सिखाता है।`,
        formulaId: formula.id,
        difficulty,
        isAIGenerated: false,
      });
    }

    // 7. Grammar Correction
    else if (type === 'grammar-correction') {
      const correctSentence = english;
      const incorrectSentence = english.replace(/\bhas\b/i, 'have').replace(/\bis\b/i, 'are');

      const distractors = [
        english.replace(/\bto\b/i, 'for'),
        english.replace(/\bthe\b/i, 'a'),
        english.replace(/\s+/g, ' '),
      ].filter((s) => s.trim().toLowerCase() !== correctSentence.trim().toLowerCase()).slice(0, 3);

      while (distractors.length < 3) {
        distractors.push(english.replace(/\.$/, ' yesterday.'));
      }

      const optionsShuffled = [correctSentence, ...distractors].sort(() => Math.random() - 0.5);

      questions.push({
        id: qId,
        type: 'grammar-correction',
        prompt: `इस अशुद्ध वाक्य का सही रूप क्या होगा?`,
        hindiSubtext: `गलत वाक्य: "${incorrectSentence || english}"\n(अर्थ: "${hindi}")`,
        options: optionsShuffled,
        correctAnswer: correctSentence,
        explanationHindi: `Formula #${formula.id} के अनुसार सही रूप "${correctSentence}" है।`,
        formulaId: formula.id,
        difficulty,
        isAIGenerated: false,
      });
    }

    // 8. Tense Practice
    else if (type === 'tense-practice') {
      const isPast = formula.englishFormula.toLowerCase().includes('past') || formula.englishFormula.toLowerCase().includes('had') || formula.englishFormula.toLowerCase().includes('was');
      const targetTense = isPast ? 'Past Tense (भूतकाल)' : 'Present Tense (वर्तमानकाल)';

      const distractors = [
        english.replace(/\b(is|am)\b/i, 'will be'),
        english.replace(/\b(was|were)\b/i, 'will be'),
        english.replace(/\b(have|has)\b/i, 'will have'),
      ].filter((s) => s.trim().toLowerCase() !== english.trim().toLowerCase()).slice(0, 3);

      while (distractors.length < 3) {
        distractors.push(`Tomorrow, ${english.toLowerCase()}`);
      }

      const optionsShuffled = [english, ...distractors].sort(() => Math.random() - 0.5);

      questions.push({
        id: qId,
        type: 'tense-practice',
        prompt: `इस समय/काल (${targetTense}) के लिए सही वाक्य चुनें:`,
        hindiSubtext: `हिंदी अर्थ: "${hindi}"`,
        options: optionsShuffled,
        correctAnswer: english,
        explanationHindi: `इस स्थिति में ${targetTense} के लिए Formula #${formula.id} "${formula.englishFormula}" लागू होता है।`,
        formulaId: formula.id,
        difficulty,
        isAIGenerated: false,
      });
    }

    // 9. Vocabulary Practice
    else {
      const hlSeg = example.englishSegments.find((s) => s.highlight);
      const vocabWord = hlSeg ? hlSeg.text.trim() : (formula.helpingVerbs[0] || 'important');
      const hlHin = example.hindiSegments.find((s) => s.highlight)?.text.trim() || formula.hindiMeaning;

      const distractors = ['कल (Yesterday)', 'हमेशा (Always)', 'कभी नहीं (Never)', 'शायद (Perhaps)', 'तुरंत (Immediately)']
        .filter((d) => !d.includes(hlHin))
        .slice(0, 3);

      const optionsShuffled = [hlHin, ...distractors].sort(() => Math.random() - 0.5);

      questions.push({
        id: qId,
        type: 'vocabulary-practice',
        prompt: `शब्द "${vocabWord}" का इस वाक्य में सही हिंदी अर्थ क्या है?`,
        hindiSubtext: `वाक्य: "${english}"`,
        options: optionsShuffled,
        correctAnswer: hlHin,
        explanationHindi: `"${vocabWord}" का सही अर्थ "${hlHin}" है (Formula #${formula.id})।`,
        formulaId: formula.id,
        difficulty,
        isAIGenerated: false,
      });
    }
  }

  return questions;
}
