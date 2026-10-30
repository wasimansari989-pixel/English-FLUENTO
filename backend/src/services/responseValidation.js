function extractJson(text) {
  if (!text) return null;
  // If wrapped in ```json ... ```, extract content
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const target = codeBlockMatch ? codeBlockMatch[1] : text;

  // Try direct parse
  try {
    return JSON.parse(target);
  } catch {
    // Try finding the first '{' or '[' and last '}' or ']'
    const firstBrace = target.indexOf('{');
    const firstBracket = target.indexOf('[');
    const start = (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) ? firstBrace : firstBracket;

    const lastBrace = target.lastIndexOf('}');
    const lastBracket = target.lastIndexOf(']');
    const end = Math.max(lastBrace, lastBracket);

    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(target.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function buildSegments(fullText, corePhraseOrPhrases) {
  if (!fullText) return [];
  const phrases = Array.isArray(corePhraseOrPhrases)
    ? corePhraseOrPhrases
    : [corePhraseOrPhrases];

  for (const phrase of phrases) {
    if (!phrase) continue;
    const lowerFull = fullText.toLowerCase();
    const lowerCore = phrase.toLowerCase().trim();
    if (!lowerCore) continue;

    const idx = lowerFull.indexOf(lowerCore);
    if (idx !== -1) {
      const before = fullText.slice(0, idx);
      const matched = fullText.slice(idx, idx + lowerCore.length);
      const after = fullText.slice(idx + lowerCore.length);
      const segs = [];
      if (before) segs.push({ text: before, highlight: false });
      segs.push({ text: matched, highlight: true, alignmentGroup: 'g1' });
      if (after) segs.push({ text: after, highlight: false });
      return segs;
    }
  }
  return [{ text: fullText, highlight: false }];
}

function getCorePhrases(formula) {
  const engKeys = new Set();
  const hinKeys = new Set();

  if (formula && formula.examples && formula.examples.length > 0) {
    for (const ex of formula.examples) {
      (ex.englishSegments || []).forEach(s => {
        if (s.highlight && s.text.trim()) engKeys.add(s.text.trim());
      });
      (ex.hindiSegments || []).forEach(s => {
        if (s.highlight && s.text.trim()) hinKeys.add(s.text.trim());
      });
    }
  }

  if (Array.isArray(formula?.helpingVerbs)) {
    formula.helpingVerbs.forEach(v => {
      if (v && v.length > 1) engKeys.add(v.trim());
    });
  }

  const engList = Array.from(engKeys);
  const hinList = Array.from(hinKeys);

  return {
    coreEng: engList.length > 0 ? engList[0] : '',
    coreHin: hinList.length > 0 ? hinList[0] : '',
    engKeys: engList,
    hinKeys: hinList
  };
}

function getSmartFallbackExamples(formula, count = 5) {
  const formulaId = formula ? formula.id : 1;
  const { coreEng, coreHin, engKeys = [], hinKeys = [] } = getCorePhrases(formula);
  const formulaStr = (formula?.englishFormula || '').toLowerCase();
  const meaningStr = (formula?.hindiMeaning || '').toLowerCase();

  // Formula 3: Sub + had + things
  if (formulaStr.includes('had + things') || (formulaStr.includes('had') && meaningStr.includes('था'))) {
    const hadList = [
      { eng: 'I had an important meeting yesterday.', hin: 'मेरे पास कल एक जरूरी मीटिंग थी।' },
      { eng: 'She had some doubts about this question.', hin: 'उसके पास इस सवाल को लेकर कुछ संदेह था।' },
      { eng: 'We had enough time to finish our project.', hin: 'हमारे पास अपना प्रोजेक्ट पूरा करने के लिए पर्याप्त समय था।' },
      { eng: 'They had a great opportunity to travel.', hin: 'उनके पास यात्रा करने का एक शानदार अवसर था।' },
      { eng: 'My friend had an extra ticket for the match.', hin: 'मेरे दोस्त के पास मैच का एक अतिरिक्त टिकट था।' }
    ];
    return hadList.slice(0, count).map(v => ({
      englishSentence: v.eng,
      hindiTranslation: v.hin,
      formulaId,
      grammarNote: 'भूतकाल में किसी वस्तु या परिस्थिति के पास होने के लिए had का प्रयोग होता है।',
      hindiSegments: buildSegments(v.hin, ['पास', 'थी', 'था']),
      englishSegments: buildSegments(v.eng, 'had'),
      isAIGenerated: true
    }));
  }

  // Formula 2: Sub + have/has + things
  if (formulaStr.includes('have/has + things') || (formulaStr.includes('have') && meaningStr.includes('पास'))) {
    const haveList = [
      { eng: 'I have an important meeting today.', hin: 'मेरे पास आज एक जरूरी मीटिंग है।' },
      { eng: 'She has a brilliant idea for the project.', hin: 'उसके पास प्रोजेक्ट के लिए एक शानदार विचार है।' },
      { eng: 'We have enough time to discuss this topic.', hin: 'हमारे पास इस विषय पर चर्चा करने के लिए पर्याप्त समय है।' },
      { eng: 'They have a big library in their college.', hin: 'उनके पास उनके कॉलेज में एक बड़ी लाइब्रेरी है।' },
      { eng: 'He has great confidence in his team.', hin: 'उसके पास अपनी टीम पर पूरा भरोसा है।' }
    ];
    return haveList.slice(0, count).map(v => ({
      englishSentence: v.eng,
      hindiTranslation: v.hin,
      formulaId,
      grammarNote: 'वर्तमान में किसी वस्तु या विचार के पास होने के लिए have/has का प्रयोग होता है।',
      hindiSegments: buildSegments(v.hin, ['पास', 'है']),
      englishSegments: buildSegments(v.eng, ['have', 'has']),
      isAIGenerated: true
    }));
  }

  // Formula 34: What is the need to + V1
  if (coreEng.toLowerCase().includes('what is the need to') || formulaStr.includes('what is the need to')) {
    const needList = [
      { eng: 'What is the need to worry so much?', hin: 'इतनी चिंता करने की क्या जरूरत है?' },
      { eng: 'What is the need to leave so early?', hin: 'इतनी जल्दी निकलने की क्या जरूरत है?' },
      { eng: 'What is the need to fight over small things?', hin: 'छोटी बातों पर लड़ने की क्या जरूरत है?' },
      { eng: 'What is the need to spend extra money?', hin: 'अतिरिक्त पैसे खर्च करने की क्या जरूरत है?' },
      { eng: 'What is the need to explain everything again?', hin: 'सब कुछ दोबारा समझाने की क्या जरूरत है?' }
    ];
    return needList.slice(0, count).map((v) => ({
      englishSentence: v.eng,
      hindiTranslation: v.hin,
      formulaId,
      grammarNote: 'जब किसी काम की जरूरत पर सवाल पूछना हो तो इस संरचना का प्रयोग करें।',
      hindiSegments: buildSegments(v.hin, coreHin || 'क्या जरूरत है'),
      englishSegments: buildSegments(v.eng, coreEng || 'What is the need to'),
      isAIGenerated: true
    }));
  }

  // Formula 295 / 297: going to
  if (coreEng.toLowerCase().includes('going to') || formulaStr.includes('going to')) {
    const isPast = formulaStr.includes('was') || formulaStr.includes('were');
    const goingVariations = isPast
      ? [
          { eng: 'I was going to start a new business last month.', hin: 'मैं पिछले महीने एक नया व्यापार शुरू करने वाला था।' },
          { eng: 'She was going to call you yesterday evening.', hin: 'वह कल शाम आपको कॉल करने वाली थी।' },
          { eng: 'We were going to attend the annual conference.', hin: 'हम वार्षिक सम्मेलन में भाग लेने वाले थे।' },
          { eng: 'They were going to book a hotel room.', hin: 'वे एक होटल का कमरा बुक करने वाले थे।' },
          { eng: 'Rohan was going to buy a new smartphone.', hin: 'रोहन एक नया स्मार्टफोन खरीदने वाला था।' }
        ]
      : [
          { eng: 'I am going to start a new business soon.', hin: 'मैं जल्द ही एक नया व्यापार शुरू करने वाला हूँ।' },
          { eng: 'She is going to call you tonight.', hin: 'वह आज रात आपको कॉल करने वाली है।' },
          { eng: 'We are going to learn English today.', hin: 'हम आज अंग्रेजी सीखने वाले हैं।' },
          { eng: 'They are going to arrive at the airport soon.', hin: 'वे जल्द ही एयरपोर्ट पहुँचने वाले हैं।' },
          { eng: 'Rohan is going to buy a new car this week.', hin: 'रोहन इस हफ्ते एक नई कार खरीदने वाला है।' }
        ];

    return goingVariations.slice(0, count).map(v => ({
      englishSentence: v.eng,
      hindiTranslation: v.hin,
      formulaId,
      grammarNote: 'भविष्य या भूतकाल की योजनाओं के लिए going to का प्रयोग होता है।',
      hindiSegments: buildSegments(v.hin, coreHin || 'वाला'),
      englishSegments: buildSegments(v.eng, 'going to'),
      isAIGenerated: true
    }));
  }

  // Generic fresh conversational actions
  const genericVariations = [
    { engAction: 'complete the assignment on time', hinAction: 'समय पर असाइनमेंट पूरा करना' },
    { engAction: 'discuss the new project with the team', hinAction: 'टीम के साथ नए प्रोजेक्ट पर चर्चा करना' },
    { engAction: 'reach the railway station before 5 PM', hinAction: 'शाम 5 बजे से पहले रेलवे स्टेशन पहुँचना' },
    { engAction: 'learn English grammar rules daily', hinAction: 'रोजाना अंग्रेजी व्याकरण के नियम सीखना' },
    { engAction: 'help our friends in difficult times', hinAction: 'कठिन समय में अपने दोस्तों की मदद करना' }
  ];

  const primaryEng = coreEng || (engKeys[0] || 'practice');
  const primaryHin = coreHin || (hinKeys[0] || 'अभ्यास');

  return genericVariations.slice(0, count).map((v, i) => {
    const eng = i % 2 === 0
      ? `We must ${primaryEng} to ${v.engAction}.`
      : `You should ${primaryEng} when you ${v.engAction}.`;
    const hin = `हमें ${v.hinAction} के लिए ${primaryHin} चाहिए।`;
    return {
      englishSentence: eng,
      hindiTranslation: hin,
      formulaId,
      grammarNote: `फॉर्मूला #${formulaId} का नया अभ्यास वाक्य।`,
      hindiSegments: buildSegments(hin, hinKeys.length > 0 ? hinKeys : primaryHin),
      englishSegments: buildSegments(eng, engKeys.length > 0 ? engKeys : primaryEng),
      isAIGenerated: true
    };
  });
}

const ResponseValidation = {
  getCorePhrases,
  buildSegments,
  getSmartFallbackExamples,

  validateSentenceCorrection(rawText, originalInput) {
    const parsed = extractJson(rawText);
    if (parsed && typeof parsed === 'object') {
      return {
        original: parsed.original || originalInput,
        corrected: parsed.corrected || originalInput,
        isCorrect: typeof parsed.isCorrect === 'boolean' ? parsed.isCorrect : false,
        explanationHindi: parsed.explanationHindi || 'वाक्य की व्याकरणिक संरचना और हेल्पिंग वर्ब पर ध्यान दें।',
        hindiMeaning: parsed.hindiMeaning || null,
        betterAlternative: parsed.betterAlternative || null,
        grammarTags: Array.isArray(parsed.grammarTags) ? parsed.grammarTags : ['english-grammar'],
        suggestedFormulaIds: Array.isArray(parsed.suggestedFormulaIds) ? parsed.suggestedFormulaIds.map(Number).filter(n => !isNaN(n)) : [],
        practiceExample: parsed.practiceExample || null
      };
    }

    return {
      original: originalInput,
      corrected: originalInput,
      isCorrect: true,
      explanationHindi: 'यह वाक्य व्याकरण के सामान्य नियमों के अनुसार ठीक प्रतीत होता है।',
      hindiMeaning: null,
      betterAlternative: null,
      grammarTags: ['general-english'],
      suggestedFormulaIds: [],
      practiceExample: null
    };
  },

  validateGeneratedExamples(rawText, formulaOrId = 1) {
    const formula = typeof formulaOrId === 'object' ? formulaOrId : { id: formulaOrId };
    const { coreEng, coreHin, engKeys = [], hinKeys = [] } = getCorePhrases(formula);

    const parsed = extractJson(rawText);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const validated = parsed
        .filter(item => item && (item.englishSentence || item.english))
        .map((item) => {
          const eng = (item.englishSentence || item.english || '').trim();
          const hin = (item.hindiTranslation || item.hindi || '').trim();

          // Auto-correct segments with rich candidate keys
          let engSegments = item.englishSegments;
          if (!Array.isArray(engSegments) || !engSegments.some(s => s.highlight)) {
            engSegments = buildSegments(eng, engKeys.length > 0 ? engKeys : coreEng);
          }

          let hindiSegments = item.hindiSegments;
          if (!Array.isArray(hindiSegments) || !hindiSegments.some(s => s.highlight)) {
            hindiSegments = buildSegments(hin, hinKeys.length > 0 ? hinKeys : coreHin);
          }

          return {
            englishSentence: eng,
            hindiTranslation: hin,
            formulaId: item.formulaId || formula.id || 1,
            grammarNote: item.grammarNote || `फॉर्मूला #${formula.id || 1} का उदाहरण`,
            hindiSegments,
            englishSegments: engSegments,
            isAIGenerated: true
          };
        });

      if (validated.length > 0) {
        return validated;
      }
    }

    return getSmartFallbackExamples(formula, 5);
  },

  validateQuizQuestions(rawText, defaultFormulaId = 1) {
    const parsed = extractJson(rawText);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((q, idx) => ({
        id: q.id || `quiz-${Date.now()}-${idx}`,
        type: q.type || 'hindi-to-english',
        prompt: q.prompt || 'Choose the correct option:',
        hindiSubtext: q.hindiSubtext || '',
        options: Array.isArray(q.options) && q.options.length >= 2 ? q.options : ['Option A', 'Option B'],
        correctAnswer: q.correctAnswer || (q.options ? q.options[0] : ''),
        explanationHindi: q.explanationHindi || 'सही उत्तर व्याकरण और फॉर्मूले के अनुसार है।',
        formulaId: q.formulaId || defaultFormulaId,
        difficulty: q.difficulty || 'beginner',
        isAIGenerated: true
      }));
    }

    return [];
  }
};

module.exports = ResponseValidation;
