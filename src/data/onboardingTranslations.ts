import { HeadingLineConfig } from '../components/neumorphic/FluentComponents';
import { AppLanguage, UserLevel } from '../database/userProfileRepository';

export interface QuizQuestion {
  q: string;
  sub: string;
  opts: string[];
  correct: number;
  why: string;
}

export interface OnboardingStrings {
  // Step 2: Language
  language: {
    topTitle: string;
    eyebrow: string;
    heading: HeadingLineConfig[];
    subtext: string;
    infoNote: string;
    continueBtn: string;
  };

  // Step 3: Account
  account: {
    topTitle: string;
    eyebrow: string;
    heading: HeadingLineConfig[];
    subtext: string;
    googleBtn: string;
    divider: string;
    emailLabel: string;
    emailPlaceholder: string;
    terms: string;
    emailBtn: string;
    guestBtn: string;
    toastGoogle: string;
    toastInvalidEmail: string;
    toastGuest: string;
    toastAccountReady: (email: string) => string;
  };

  // Step 4: Level
  level: {
    topTitle: string;
    eyebrow: string;
    heading: HeadingLineConfig[];
    subtext: string;
    levels: Record<UserLevel, { title: string; desc: string; sub: string }>;
    continueBtn: string;
    footerNote: string;
  };

  // Step 5: Assessment Intro
  assessmentIntro: {
    topTitle: string;
    eyebrow: string;
    heading: HeadingLineConfig[];
    subtext: (level: string) => string;
    statQuestions: string;
    statTime: string;
    statTimeVal: string;
    statPath: string;
    statPathVal: string;
    noPressureTitle: string;
    noPressureDesc: string;
    startBtn: string;
    skipBtn: string;
    footerNote: string;
  };

  // Step 6: Assessment
  assessment: {
    topTitle: string;
    trackChip: (level: string) => string;
    questionProgress: (current: number, total: number) => string;
    nextBtn: string;
    seeResultBtn: string;
    footerNote: string;
    toastSelectAnswer: string;
    questions: Record<UserLevel, QuizQuestion[]>;
  };

  // Step 7: Result
  result: {
    topTitle: string;
    eyebrow: string;
    heading: HeadingLineConfig[];
    subtext: (score: number, total: number) => string;
    statCorrect: string;
    statSuggested: string;
    statStep: string;
    statStepVal: string;
    reviewTitle: string;
    reviewChip: (level: string) => string;
    buildPlanBtn: string;
    tryAgainBtn: string;
  };

  // Step 8: Goal
  goal: {
    topTitle: string;
    eyebrow: string;
    heading: HeadingLineConfig[];
    subtext: string;
    goals: { min: number; emoji: string; title: string; desc: string }[];
    goalSummaryTitle: (min: number) => string;
    goalSummaryDesc: string;
    continueBtn: string;
  };

  // Step 9: Reminders
  reminders: {
    topTitle: string;
    eyebrow: string;
    heading: HeadingLineConfig[];
    subtext: string;
    cardTitle: string;
    cardSub: string;
    continueBtn: string;
    maybeLaterBtn: string;
    footerNote: string;
    toastOn: string;
    toastOff: string;
  };

  // Step 10: Formulas
  formulas: {
    topTitle: string;
    eyebrow: string;
    heading: HeadingLineConfig[];
    subtext: string;
    deckCategoryCollection: string;
    deckNoteCollection: string;
    deckCategoryPractice: string;
    deckNotePractice: string;
    deckCategoryTense: (tense: string) => string;
    deckNoteTense: string;
    tabs: { Present: string; Past: string; Future: string };
    chipExample: string;
    translationLabel: string;
    highlightLabel: string;
    feature1Title: string;
    feature1Desc: string;
    feature2Title: string;
    feature2Desc: string;
    continueBtn: string;
    formulaData: Record<
      'Present' | 'Past' | 'Future',
      {
        title: string;
        structure: string;
        translation: string;
        prefix: string;
        highlight: string;
        suffix: string;
      }
    >;
  };

  // Step 11: Ready
  ready: {
    topTitle: string;
    eyebrow: string;
    heading: HeadingLineConfig[];
    subtext: string;
    labelCountry: string;
    labelLanguage: string;
    labelLevel: string;
    labelGoal: string;
    labelReminder: string;
    goalValue: (min: number) => string;
    reminderOn: string;
    reminderOff: string;
    check1: string;
    check2: string;
    check3: string;
    startBtn: string;
    exploreBtn: string;
  };

  // Help alert
  help: {
    title: string;
    message: string;
  };
}

const HINDI_QUESTIONS: Record<UserLevel, QuizQuestion[]> = {
  Beginner: [
    {
      q: 'वाक्य पूरा करें: “I ___ a student.”',
      sub: 'To-be verb · Basic',
      opts: ['is', 'am', 'are', 'be'],
      correct: 1,
      why: '“I” के साथ “am” का प्रयोग होता है: I am a student.',
    },
    {
      q: 'वाक्य पूरा करें: “I ___ learning English.”',
      sub: 'Present continuous · Basic',
      opts: ['am', 'is', 'are', 'be'],
      correct: 0,
      why: '“I” के साथ “am” का प्रयोग होता है: I am learning English.',
    },
    {
      q: 'कौन सा वाक्य भूतकाल (past) की बात करता है?',
      sub: 'Past simple · Basic',
      opts: ['I play cricket.', 'I am playing cricket.', 'I played cricket.', 'I will play cricket.'],
      correct: 2,
      why: '“Played”, “play” का past tense रूप है।',
    },
  ],
  Intermediate: [
    {
      q: 'सबसे स्वाभाविक वाक्य चुनें।',
      sub: 'Present perfect · Intermediate',
      opts: ['I have finished my work.', 'I has finished my work.', 'I have finish my work.', 'I am finished my work.'],
      correct: 0,
      why: 'have + past participle (V3) आता है: “have finished”.',
    },
    {
      q: 'वाक्य पूरा करें: “She has lived here ___ 2020.”',
      sub: 'Since and for · Intermediate',
      opts: ['for', 'since', 'during', 'from'],
      correct: 1,
      why: 'शुरुआती समय बिंदु (starting point) के साथ “since” का प्रयोग होता है।',
    },
    {
      q: 'सही शर्त वाला वाक्य (conditional) चुनें।',
      sub: 'First conditional · Intermediate',
      opts: ['If it rains, we will stay home.', 'If it will rain, we stay home.', 'If it rain, we will stayed home.', 'If it rained, we will stay home.'],
      correct: 0,
      why: 'First conditional में if + present simple, will + base verb आता है।',
    },
  ],
  Advanced: [
    {
      q: 'व्याकरण के अनुसार सही वाक्य चुनें।',
      sub: 'Inversion · Advanced',
      opts: ['Rarely I have seen such care.', 'Rarely have I seen such care.', 'Rarely did I have saw such care.', 'Rarely I saw have such care.'],
      correct: 1,
      why: '“Rarely” जैसे नकारात्मक क्रियाविशेषणों (negative adverbs) से शुरू होने पर inversion होता है।',
    },
    {
      q: 'पूरा करें: “Had I known, I ___ earlier.”',
      sub: 'Third conditional inversion · Advanced',
      opts: ['would leave', 'would have left', 'will have left', 'had leave'],
      correct: 1,
      why: '“Had I known” का अर्थ “If I had known” है; इसके बाद would have + V3 आता है।',
    },
    {
      q: 'सबसे सटीक reported-speech वाक्य चुनें।',
      sub: 'Reported speech · Advanced',
      opts: ['She said she is already leave.', 'She said that she had already left.', 'She said she has already leaving.', 'She said that she already leaves yesterday.'],
      correct: 1,
      why: 'Past statement रिपोर्ट करते समय “had already left” सही backshifted रूप है।',
    },
  ],
};

const ENGLISH_QUESTIONS: Record<UserLevel, QuizQuestion[]> = {
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

const HINGLISH_QUESTIONS: Record<UserLevel, QuizQuestion[]> = {
  Beginner: [
    {
      q: 'Sentence complete karein: “I ___ a student.”',
      sub: 'To-be verb · Basic',
      opts: ['is', 'am', 'are', 'be'],
      correct: 1,
      why: '“I” ke saath “am” use hota hai: I am a student.',
    },
    {
      q: 'Sentence complete karein: “I ___ learning English.”',
      sub: 'Present continuous · Basic',
      opts: ['am', 'is', 'are', 'be'],
      correct: 0,
      why: '“I” ke saath “am” use hota hai: I am learning English.',
    },
    {
      q: 'Kaunsa sentence past ki baat karta hai?',
      sub: 'Past simple · Basic',
      opts: ['I play cricket.', 'I am playing cricket.', 'I played cricket.', 'I will play cricket.'],
      correct: 2,
      why: '“Played”, “play” ka past form hai.',
    },
  ],
  Intermediate: [
    {
      q: 'Sabse natural sentence choose karein.',
      sub: 'Present perfect · Intermediate',
      opts: ['I have finished my work.', 'I has finished my work.', 'I have finish my work.', 'I am finished my work.'],
      correct: 0,
      why: 'have + past participle use hota hai: “have finished”.',
    },
    {
      q: 'Complete karein: “She has lived here ___ 2020.”',
      sub: 'Since and for · Intermediate',
      opts: ['for', 'since', 'during', 'from'],
      correct: 1,
      why: 'Starting point of time ke liye “since” use hota hai.',
    },
    {
      q: 'Correct conditional sentence choose karein.',
      sub: 'First conditional · Intermediate',
      opts: ['If it rains, we will stay home.', 'If it will rain, we stay home.', 'If it rain, we will stayed home.', 'If it rained, we will stay home.'],
      correct: 0,
      why: 'First conditional pattern hota hai: if + present simple, will + base verb.',
    },
  ],
  Advanced: [
    {
      q: 'Grammatically correct sentence choose karein.',
      sub: 'Inversion · Advanced',
      opts: ['Rarely I have seen such care.', 'Rarely have I seen such care.', 'Rarely did I have saw such care.', 'Rarely I saw have such care.'],
      correct: 1,
      why: '“Rarely” jaise negative adverbs ke saath subject-auxiliary inversion hota hai.',
    },
    {
      q: 'Complete karein: “Had I known, I ___ earlier.”',
      sub: 'Third conditional inversion · Advanced',
      opts: ['would leave', 'would have left', 'will have left', 'had leave'],
      correct: 1,
      why: '“Had I known” means “If I had known”; result me would have + V3 aata hai.',
    },
    {
      q: 'Best reported-speech choose karein.',
      sub: 'Reported speech · Advanced',
      opts: ['She said she is already leave.', 'She said that she had already left.', 'She said she has already leaving.', 'She said that she already leaves yesterday.'],
      correct: 1,
      why: 'Past statement report karte time “had already left” correct backshifted form hai.',
    },
  ],
};

const SPANISH_QUESTIONS: Record<UserLevel, QuizQuestion[]> = {
  Beginner: [
    {
      q: 'Completa la oración: “I ___ a student.”',
      sub: 'Verbo to-be · Básico',
      opts: ['is', 'am', 'are', 'be'],
      correct: 1,
      why: 'Usa “am” con “I”: I am a student.',
    },
    {
      q: 'Completa la oración: “I ___ learning English.”',
      sub: 'Present continuous · Básico',
      opts: ['am', 'is', 'are', 'be'],
      correct: 0,
      why: 'Usa “am” con “I”: I am learning English.',
    },
    {
      q: '¿Qué oración habla del pasado?',
      sub: 'Past simple · Básico',
      opts: ['I play cricket.', 'I am playing cricket.', 'I played cricket.', 'I will play cricket.'],
      correct: 2,
      why: '“Played” es la forma en pasado de “play”.',
    },
  ],
  Intermediate: [
    {
      q: 'Elige la oración más natural.',
      sub: 'Present perfect · Intermedio',
      opts: ['I have finished my work.', 'I has finished my work.', 'I have finish my work.', 'I am finished my work.'],
      correct: 0,
      why: 'Usa have + participio pasado: “have finished”.',
    },
    {
      q: 'Completa: “She has lived here ___ 2020.”',
      sub: 'Since y for · Intermedio',
      opts: ['for', 'since', 'during', 'from'],
      correct: 1,
      why: 'Usa “since” con un punto de inicio en el tiempo.',
    },
    {
      q: 'Elige la oración condicional correcta.',
      sub: 'Primer condicional · Intermedio',
      opts: ['If it rains, we will stay home.', 'If it will rain, we stay home.', 'If it rain, we will stayed home.', 'If it rained, we will stay home.'],
      correct: 0,
      why: 'El primer condicional usa if + presente simple, will + verbo base.',
    },
  ],
  Advanced: [
    {
      q: 'Elige la oración gramaticalmente correcta.',
      sub: 'Inversión · Avanzado',
      opts: ['Rarely I have seen such care.', 'Rarely have I seen such care.', 'Rarely did I have saw such care.', 'Rarely I saw have such care.'],
      correct: 1,
      why: 'Adverbios negativos como “rarely” provocan inversión sujeto-auxiliar.',
    },
    {
      q: 'Completa: “Had I known, I ___ earlier.”',
      sub: 'Inversión de tercer condicional · Avanzado',
      opts: ['would leave', 'would have left', 'will have left', 'had leave'],
      correct: 1,
      why: '“Had I known” equivale a “If I had known”; el resultado usa would have + participio.',
    },
    {
      q: 'Elige la forma de estilo indirecto más clara.',
      sub: 'Reported speech · Avanzado',
      opts: ['She said she is already leave.', 'She said that she had already left.', 'She said she has already leaving.', 'She said that she already leaves yesterday.'],
      correct: 1,
      why: '“Had already left” es la forma correcta al reportar una declaración pasada.',
    },
  ],
};

export const ONBOARDING_TRANSLATIONS: Record<AppLanguage, OnboardingStrings> = {
  Hindi: {
    language: {
      topTitle: 'ऐप की भाषा',
      eyebrow: 'सेटअप का स्टेप 2',
      heading: ['अपनी भाषा', { embossed: 'चुनें।' }],
      subtext: 'वह भाषा चुनें जिसमें आप सीखने में सबसे सहज हों। आप इसे बाद में सेटिंग्स में बदल सकते हैं।',
      infoNote: 'सीखने की सामग्री आपको अंग्रेज़ी अभ्यास में मदद करेगी, जिसमें आपकी चुनी हुई भाषा में स्पष्टीकरण होगा।',
      continueBtn: 'जारी रखें →',
    },
    account: {
      topTitle: 'खाता सेटअप',
      eyebrow: 'सेटअप का स्टेप 3',
      heading: ['आपकी अंग्रेज़ी की', 'यात्रा शुरू होती है', { embossed: 'आपसे।' }],
      subtext: 'अपनी सीखने की प्रगति और सेव किए गए फ़ॉर्मूले एक जगह रखने के लिए एक खाता बनाएं।',
      googleBtn: 'Google के साथ जारी रखें',
      divider: 'या ईमेल से जारी रखें',
      emailLabel: 'ईमेल पता',
      emailPlaceholder: 'aap@example.com',
      terms: 'जारी रखकर, आप ऐप के नियमों और गोपनीयता नीति से सहमत होते हैं।',
      emailBtn: 'ईमेल से जारी रखें',
      guestBtn: 'बिना साइन इन किए आगे बढ़ें',
      toastGoogle: 'Google खाते से साइन इन किया गया।',
      toastInvalidEmail: 'कृपया एक मान्य ईमेल पता दर्ज करें।',
      toastGuest: 'अतिथि के रूप में आगे बढ़ रहे हैं।',
      toastAccountReady: (email) => `${email} के साथ खाता तैयार है`,
    },
    level: {
      topTitle: 'अंग्रेज़ी स्तर',
      eyebrow: 'सेटअप का स्टेप 4',
      heading: ['आज आपकी', { prefix: 'अंग्रेज़ी', embossed: 'कहाँ है?' }],
      subtext: 'वह स्तर चुनें जो आपके सबसे करीब हो। AI प्लेसमेंट चेक अभ्यास को आपके अनुसार तैयार करेगा।',
      levels: {
        Beginner: {
          title: 'Beginner (शुरुआती)',
          desc: 'मैं बिल्कुल बुनियादी स्तर से शुरू कर रहा हूँ।',
          sub: 'सरल वाक्य और रोज़मर्रा की अंग्रेज़ी।',
        },
        Intermediate: {
          title: 'Intermediate (मध्यम)',
          desc: 'मुझे पहले से थोड़ी अंग्रेज़ी आती है।',
          sub: 'प्रवाह, व्याकरण और आत्मविश्वास बढ़ाएं।',
        },
        Advanced: {
          title: 'Advanced (उन्नत)',
          desc: 'मैं आसानी से बातचीत कर सकता हूँ।',
          sub: 'सटीकता, बारीकियों और अभिव्यक्ति को निखारें।',
        },
      },
      continueBtn: 'मेरी पढ़ाई को पर्सनलाइज़ करें',
      footerNote: 'निश्चिंत नहीं हैं? सबसे नज़दीकी विकल्प चुनें। इसे बाद में बदल सकते हैं।',
    },
    assessmentIntro: {
      topTitle: 'स्तर जांच',
      eyebrow: 'आपका पर्सनल AI कोच',
      heading: ['आइए ढूंढते हैं आपका', { embossed: 'शुरुआती बिंदु।' }],
      subtext: (lvl) => `अपने ${lvl} स्तर के अनुसार 3 सवालों के जवाब दें। इसका नतीजा तय करेगा कि आपको कहाँ से शुरू करना चाहिए।`,
      statQuestions: 'नमूना सवाल',
      statTime: 'अनुमानित समय',
      statTimeVal: '2 मिनट',
      statPath: 'पर्सनलाइज़्ड रास्ता',
      statPathVal: 'AI',
      noPressureTitle: 'कोई तनाव नहीं',
      noPressureDesc: 'यह सिर्फ एक अभ्यास जांच है, कोई परीक्षा नहीं। आपको मददगार स्पष्टीकरण मिलेंगे।',
      startBtn: 'लेवल चेक शुरू करें',
      skipBtn: 'अभी के लिए छोड़ें',
      footerNote: 'जांचे गए नमूना सवाल और स्थानीय डायग्नोस्टिक स्कोरिंग।',
    },
    assessment: {
      topTitle: 'अभ्यास जांच',
      trackChip: (lvl) => `${lvl} ट्रैक`,
      questionProgress: (cur, tot) => `सवाल ${cur} का ${tot}`,
      nextBtn: 'अगला सवाल',
      seeResultBtn: 'मेरा परिणाम देखें',
      footerNote: 'सबसे सही जवाब चुनें। परिणाम में पूरा स्पष्टीकरण दिखाई देगा।',
      toastSelectAnswer: 'जारी रखने के लिए एक उत्तर चुनें।',
      questions: HINDI_QUESTIONS,
    },
    result: {
      topTitle: 'आपका परिणाम',
      eyebrow: 'आपकी प्रैक्टिस का सारांश',
      heading: ['शानदार काम,', { embossed: 'सीखने वाले।' }],
      subtext: (score, total) => `आपने नमूना सवालों में से ${score}/${total} के सही उत्तर दिए।`,
      statCorrect: 'सही उत्तर',
      statSuggested: 'सुझाया गया स्तर',
      statStep: 'शुरुआत',
      statStepVal: 'पहला कदम',
      reviewTitle: 'उत्तर समीक्षा',
      reviewChip: (lvl) => `${lvl} सेट`,
      buildPlanBtn: 'मेरा लर्निंग प्लान बनाएं',
      tryAgainBtn: 'फिर से कोशिश करें',
    },
    goal: {
      topTitle: 'दैनिक लक्ष्य',
      eyebrow: 'सेटअप का स्टेप 6',
      heading: ['अपनी अंग्रेज़ी के लिए', { embossed: 'समय निकालें।' }],
      subtext: 'एक दैनिक लक्ष्य चुनें जो आपकी दिनचर्या में फिट हो। छोटी, निरंतर पढ़ाई बड़ा असर लाती है।',
      goals: [
        { min: 5, emoji: '🌿', title: 'हल्की शुरुआत', desc: 'आसानी से जारी रखें' },
        { min: 10, emoji: '✨', title: 'संतुलित', desc: 'हर दिन थोड़ा-थोड़ा' },
        { min: 15, emoji: '🔥', title: 'केंद्रित', desc: 'रफ़्तार पकड़ें' },
        { min: 20, emoji: '⚡', title: 'गहन अभ्यास', desc: 'तेज़ी से आगे बढ़ें' },
      ],
      goalSummaryTitle: (min) => `आपका लक्ष्य: ${min} मिनट प्रतिदिन`,
      goalSummaryDesc: 'इसे आप अपनी प्रोफ़ाइल में कभी भी बदल सकते हैं।',
      continueBtn: 'मेरी दिनचर्या सेट करें',
    },
    reminders: {
      topTitle: 'दैनिक रिमाइंडर',
      eyebrow: 'एक छोटा सा स्मरण',
      heading: ['एक छोटा रिमाइंडर', { prefix: 'बड़ा', embossed: 'असर डालता है।' }],
      subtext: 'दैनिक रिमाइंडर आपको अपनी सीखने की आदत बनाए रखने में मदद करता है।',
      cardTitle: 'दैनिक सीखने का रिमाइंडर',
      cardSub: 'सुझाया गया समय · शाम 7:00 बजे',
      continueBtn: 'जारी रखें',
      maybeLaterBtn: 'शायद बाद में',
      footerNote: 'डिवाइस सेटिंग्स में कभी भी नोटिफिकेशन अनुमतियां बदलें।',
      toastOn: 'शाम 7:00 बजे के लिए रिमाइंडर सेट हो गया।',
      toastOff: 'रिमाइंडर बंद कर दिया गया।',
    },
    formulas: {
      topTitle: '600+ फ़ॉर्मूले',
      eyebrow: 'आपका अंग्रेज़ी टूलकिट',
      heading: ['600+ फ़ॉर्मूले।', { embossed: 'स्पष्ट पैटर्न।' }],
      subtext: 'अलग-अलग वाक्यों को रटने के बजाय दोबारा इस्तेमाल होने वाले वाक्य ढांचे सीखें। पैटर्न समझें, फिर उदाहरणों से अभ्यास करें।',
      deckCategoryCollection: 'फ़ॉर्मूला संग्रह',
      deckNoteCollection: 'वाक्य निर्माण के नियम',
      deckCategoryPractice: 'प्रैक्टिस कार्ड',
      deckNotePractice: 'अर्थ जो समझ आए',
      deckCategoryTense: (tense) => `${tense.toUpperCase()} TENSE`,
      deckNoteTense: 'एक ऐसा पैटर्न जिसे आप बार-बार इस्तेमाल कर सकें',
      tabs: { Present: 'Present', Past: 'Past', Future: 'Future' },
      chipExample: 'उदाहरण फ़ॉर्मूला',
      translationLabel: 'हिन्दी अर्थ',
      highlightLabel: 'English · मिलता-जुलता शब्द हाइलाइट किया गया',
      feature1Title: 'संरचना को समझें',
      feature1Desc: 'स्पष्टीकरण, उदाहरण, सेव किए गए आइटम और क्विज़ के साथ फ़ॉर्मूले देखें।',
      feature2Title: 'अपने स्तर पर सीखें',
      feature2Desc: 'निर्देशित अभ्यास के साथ कदम दर कदम अपनी समझ बनाएं।',
      continueBtn: 'मेरा लर्निंग पाथ दिखाएं',
      formulaData: {
        Present: {
          title: 'Present Simple',
          structure: 'Subject + V1 (s/es)',
          translation: 'मैं रोज़ किताबें पढ़ता हूँ।',
          prefix: 'I ',
          highlight: 'read books every day',
          suffix: '.',
        },
        Past: {
          title: 'Past Simple',
          structure: 'Subject + V2',
          translation: 'मैंने कल किताब पढ़ी।',
          prefix: 'I ',
          highlight: 'read a book yesterday',
          suffix: '.',
        },
        Future: {
          title: 'Future Simple',
          structure: 'Subject + will + V1',
          translation: 'मैं कल पढ़ूँगा।',
          prefix: 'I ',
          highlight: 'will study tomorrow',
          suffix: '.',
        },
      },
    },
    ready: {
      topTitle: 'आप तैयार हैं!',
      eyebrow: 'पर्सनल लर्निंग प्रोफ़ाइल',
      heading: ['आप तैयार हैं', { embossed: 'शुरुआत करने के लिए।' }] as HeadingLineConfig[],
      subtext: 'आपका लर्निंग स्पेस आपकी प्राथमिकताओं के अनुसार तैयार है।',
      labelCountry: 'देश',
      labelLanguage: 'ऐप भाषा',
      labelLevel: 'शुरुआती स्तर',
      labelGoal: 'दैनिक लक्ष्य',
      labelReminder: 'दैनिक रिमाइंडर',
      goalValue: (min) => `${min} मिनट`,
      reminderOn: 'चालू (शाम 7:00 बजे)',
      reminderOff: 'सेट नहीं',
      check1: 'एक व्यक्तिगत शुरुआती बिंदु',
      check2: '600+ फ़ॉर्मूले का लर्निंग पाथ',
      check3: 'अपनी गति से अभ्यास करें',
      startBtn: 'सीखना शुरू करें',
      exploreBtn: '600+ फ़ॉर्मूले एक्सप्लोर करें',
    },
    help: {
      title: 'Fluent Onboarding',
      message: 'यह सेटअप आपके 600+ फ़ॉर्मूले सीखने के मार्ग, स्तर जांच और अध्ययन लक्ष्यों को व्यक्तिगत बनाता है।',
    },
  },

  Hinglish: {
    language: {
      topTitle: 'App Language',
      eyebrow: 'SETUP KA STEP 2',
      heading: ['Apni language', { embossed: 'choose karein.' }],
      subtext: 'Wo language chunein jisme aap comfortably seekh sakein. Baad me settings se change kar sakte hain.',
      infoNote: 'Learning content aapko English practice me help karega, jisme aapki chosen language me explanations milenge.',
      continueBtn: 'Continue karein →',
    },
    account: {
      topTitle: 'Account Setup',
      eyebrow: 'SETUP KA STEP 3',
      heading: ['Aapki English', 'journey start hoti hai', { embossed: 'aapse.' }] as HeadingLineConfig[],
      subtext: 'Apni learning progress aur saved formulas ko ek saath rakhne ke liye account banayein.',
      googleBtn: 'Google ke saath Continue karein',
      divider: 'YA EMAIL SE CONTINUE KAREIN',
      emailLabel: 'Email address',
      emailPlaceholder: 'you@example.com',
      terms: 'Aage badhne par, aap Terms aur Privacy Policy se agree karte hain.',
      emailBtn: 'Email se continue karein',
      guestBtn: 'Bina sign-in kiye aage badhein',
      toastGoogle: 'Google account se sign in ho gaya.',
      toastInvalidEmail: 'Please valid email address enter karein.',
      toastGuest: 'Guest learner ke roop me shuru kar rahe hain.',
      toastAccountReady: (email) => `${email} ke saath account ready hai`,
    },
    level: {
      topTitle: 'English Level',
      eyebrow: 'SETUP KA STEP 4',
      heading: ['Aaj aapki', { prefix: 'English', embossed: 'kahan hai?' }] as HeadingLineConfig[],
      subtext: 'Wo level choose karein jo aapke sabse close ho. AI placement check practice ko personalise karega.',
      levels: {
        Beginner: {
          title: 'Beginner',
          desc: 'Main basics se shuru kar raha hoon.',
          sub: 'Simple sentences aur daily English.',
        },
        Intermediate: {
          title: 'Intermediate',
          desc: 'Mujhe pehle se thodi English aati hai.',
          sub: 'Fluency, grammar aur confidence banayein.',
        },
        Advanced: {
          title: 'Advanced',
          desc: 'Main comfortably communicate kar sakta hoon.',
          sub: 'Accuracy, nuance aur expression improve karein.',
        },
      },
      continueBtn: 'Meri learning personalise karein',
      footerNote: 'Sure nahi hain? Closest option chunein. Baad me change kar sakte hain.',
    },
    assessmentIntro: {
      topTitle: 'Placement Check',
      eyebrow: 'AAPKA PERSONAL AI COACH',
      heading: ['Aaiye dhundhte hain aapka', { embossed: 'starting point.' }] as HeadingLineConfig[],
      subtext: (lvl) => `Apne ${lvl} level ke according 3 questions ke answer dein. Isse decide hoga ki kahan se shuru karna hai.`,
      statQuestions: 'Sample questions',
      statTime: 'Estimated time',
      statTimeVal: '2 min',
      statPath: 'Personalised path',
      statPathVal: 'AI',
      noPressureTitle: 'Koi tension nahi',
      noPressureDesc: 'Yeh sirf practice check hai, exam nahi. Helpful explanations milenge.',
      startBtn: 'Level check shuru karein',
      skipBtn: 'Abhi ke liye skip karein',
      footerNote: 'Verified sample questions aur local scoring.',
    },
    assessment: {
      topTitle: 'Practice Check',
      trackChip: (lvl) => `${lvl} track`,
      questionProgress: (cur, tot) => `Question ${cur} of ${tot}`,
      nextBtn: 'Next question',
      seeResultBtn: 'Mera result dekhein',
      footerNote: 'Best answer chunein. Result me explanations dikhenge.',
      toastSelectAnswer: 'Continue karne ke liye ek answer select karein.',
      questions: HINGLISH_QUESTIONS,
    },
    result: {
      topTitle: 'Result Snapshot',
      eyebrow: 'AAPKI PRACTICE KA SNAPSHOT',
      heading: ['Bohot badiya,', { embossed: 'learner.' }] as HeadingLineConfig[],
      subtext: (score, total) => `Aapne ${total} me se ${score} sample questions ke sahi answers diye.`,
      statCorrect: 'Correct',
      statSuggested: 'Suggested start',
      statStep: 'Step taken',
      statStepVal: '1st Step',
      reviewTitle: 'Answer review',
      reviewChip: (lvl) => `${lvl} set`,
      buildPlanBtn: 'Mera learning plan banayein',
      tryAgainBtn: 'Phir se try karein',
    },
    goal: {
      topTitle: 'Daily Goal',
      eyebrow: 'SETUP KA STEP 6',
      heading: ['Apni English ke liye', { embossed: 'time nikalein.' }] as HeadingLineConfig[],
      subtext: 'Apne routine ke hisaab se daily goal set karein. Choti consistent practice bada fark laati hai.',
      goals: [
        { min: 5, emoji: '🌿', title: 'Easy start', desc: 'Maintain karna easy' },
        { min: 10, emoji: '✨', title: 'Balanced', desc: 'Har roz thoda-thoda' },
        { min: 15, emoji: '🔥', title: 'Focused', desc: 'Momentum banayein' },
        { min: 20, emoji: '⚡', title: 'Deep practice', desc: 'Fast progress karein' },
      ],
      goalSummaryTitle: (min) => `Aapka goal: ${min} minutes rozana`,
      goalSummaryDesc: 'Ise aap profile me kabhi bhi change kar sakte hain.',
      continueBtn: 'Routine set karein',
    },
    reminders: {
      topTitle: 'Reminders',
      eyebrow: 'EK CHHOTA REMINDER',
      heading: ['Ek chhota reminder', { prefix: 'bohot', embossed: 'kaam aata hai.' }] as HeadingLineConfig[],
      subtext: 'Daily reminder aapki learning streak maintain rakhne me help karta hai.',
      cardTitle: 'Daily learning reminder',
      cardSub: 'Suggested time · Shaam 7:00 PM',
      continueBtn: 'Continue',
      maybeLaterBtn: 'Baad me karenge',
      footerNote: 'Notification permissions device settings se kabhi bhi change karein.',
      toastOn: 'Shaam 7:00 PM ke liye reminder set ho gaya.',
      toastOff: 'Reminders turn off ho gaye.',
    },
    formulas: {
      topTitle: '600+ Formulas',
      eyebrow: 'AAPKA ENGLISH TOOLKIT',
      heading: ['600+ formulas.', { embossed: 'Clear patterns.' }] as HeadingLineConfig[],
      subtext: 'Alag-alag sentences ratne ke bajay reusable sentence patterns seekhein. Pattern samjhein, phir examples se practice karein.',
      deckCategoryCollection: 'FORMULA COLLECTION',
      deckNoteCollection: 'Sentence building blocks',
      deckCategoryPractice: 'PRACTICE CARD',
      deckNotePractice: 'Meaning that connects',
      deckCategoryTense: (tense) => `${tense.toUpperCase()} TENSE`,
      deckNoteTense: 'A pattern you can use again',
      tabs: { Present: 'Present', Past: 'Past', Future: 'Future' },
      chipExample: 'Example formula',
      translationLabel: 'Hindi meaning',
      highlightLabel: 'English · matching phrase highlighted',
      feature1Title: 'Structure ko samjhein',
      feature1Desc: 'Explanations, examples, saved items aur quizzes ke saath formulas explore karein.',
      feature2Title: 'Apne level par seekhein',
      feature2Desc: 'Guided practice ke saath step by step apni samajh banayein.',
      continueBtn: 'Mera learning path dikhayein',
      formulaData: {
        Present: {
          title: 'Present Simple',
          structure: 'Subject + V1 (s/es)',
          translation: 'Main roz books padhta hoon.',
          prefix: 'I ',
          highlight: 'read books every day',
          suffix: '.',
        },
        Past: {
          title: 'Past Simple',
          structure: 'Subject + V2',
          translation: 'Maine kal book padhi.',
          prefix: 'I ',
          highlight: 'read a book yesterday',
          suffix: '.',
        },
        Future: {
          title: 'Future Simple',
          structure: 'Subject + will + V1',
          translation: 'Main kal padhunga.',
          prefix: 'I ',
          highlight: 'will study tomorrow',
          suffix: '.',
        },
      },
    },
    ready: {
      topTitle: 'Ready!',
      eyebrow: 'PERSONAL LEARNING PROFILE',
      heading: ['Aap ready hain', { embossed: 'start karne ke liye.' }] as HeadingLineConfig[],
      subtext: 'Aapka learning space aapki preferences ke according ready ho gaya hai.',
      labelCountry: 'Country',
      labelLanguage: 'App language',
      labelLevel: 'Starting level',
      labelGoal: 'Daily goal',
      labelReminder: 'Daily reminder',
      goalValue: (min) => `${min} minutes`,
      reminderOn: 'On (Shaam 7:00 PM)',
      reminderOff: 'Set nahi hai',
      check1: 'Ek personal starting point',
      check2: '600+ formulas learning path',
      check3: 'Apni speed par practice karein',
      startBtn: 'Seekhna shuru karein',
      exploreBtn: '600+ formulas explore karein',
    },
    help: {
      title: 'Fluent Onboarding',
      message: 'Yeh setup aapke 600+ formulas learning path, level checks aur study goals ko personalise karta hai.',
    },
  },

  Spanish: {
    language: {
      topTitle: 'Idioma de la app',
      eyebrow: 'PASO 2 DE CONFIGURACIÓN',
      heading: ['Elige tu', { embossed: 'idioma.' }],
      subtext: 'Elige el idioma con el que te sientas más cómodo aprendiendo. Puedes cambiarlo después en ajustes.',
      infoNote: 'El contenido te ayudará a practicar inglés, con explicaciones en tu idioma de interfaz seleccionado.',
      continueBtn: 'Continuar →',
    },
    account: {
      topTitle: 'Crear cuenta',
      eyebrow: 'PASO 3 DE CONFIGURACIÓN',
      heading: ['Tu camino en inglés', 'comienza', { embossed: 'contigo.' }] as HeadingLineConfig[],
      subtext: 'Crea una cuenta para guardar tu progreso de aprendizaje y fórmulas juntas.',
      googleBtn: 'Continuar con Google',
      divider: 'O CONTINUAR CON CORREO',
      emailLabel: 'Correo electrónico',
      emailPlaceholder: 'tu@ejemplo.com',
      terms: 'Al continuar, aceptas los Términos y la Política de privacidad.',
      emailBtn: 'Continuar con correo',
      guestBtn: 'Explorar sin iniciar sesión',
      toastGoogle: 'Sesión iniciada con Google.',
      toastInvalidEmail: 'Por favor ingresa un correo válido.',
      toastGuest: 'Explorando como usuario invitado.',
      toastAccountReady: (email) => `Cuenta lista con ${email}`,
    },
    level: {
      topTitle: 'Nivel de inglés',
      eyebrow: 'PASO 4 DE CONFIGURACIÓN',
      heading: ['¿Dónde está tu', { prefix: 'inglés', embossed: 'hoy?' }] as HeadingLineConfig[],
      subtext: 'Elige el nivel más cercano a ti. La prueba de IA ayudará a personalizar tu práctica.',
      levels: {
        Beginner: {
          title: 'Principiante',
          desc: 'Estoy empezando desde lo básico.',
          sub: 'Oraciones simples e inglés cotidiano.',
        },
        Intermediate: {
          title: 'Intermedio',
          desc: 'Ya sé algo de inglés.',
          sub: 'Desarrolla fluidez, gramática y confianza.',
        },
        Advanced: {
          title: 'Avanzado',
          desc: 'Puedo comunicarme con comodidad.',
          sub: 'Perfecciona precisión, matices y expresión.',
        },
      },
      continueBtn: 'Personalizar mi aprendizaje',
      footerNote: '¿No estás seguro? Elige la opción más cercana. Puedes cambiarla después.',
    },
    assessmentIntro: {
      topTitle: 'Evaluación de nivel',
      eyebrow: 'TU ENTRENADOR PERSONAL DE IA',
      heading: ['Encontremos tu', { embossed: 'punto inicial.' }] as HeadingLineConfig[],
      subtext: (lvl) => `Responde 3 preguntas en tu nivel ${lvl}. Tu resultado guiará con qué lecciones comenzar.`,
      statQuestions: 'Preguntas muestra',
      statTime: 'Tiempo estimado',
      statTimeVal: '2 min',
      statPath: 'Ruta personalizada',
      statPathVal: 'IA',
      noPressureTitle: 'Sin presión',
      noPressureDesc: 'Es una prueba de práctica, no un examen. Recibirás explicaciones útiles.',
      startBtn: 'Iniciar prueba de nivel',
      skipBtn: 'Omitir por ahora',
      footerNote: 'Preguntas muestra verificadas y puntuación diagnóstica local.',
    },
    assessment: {
      topTitle: 'Prueba de práctica',
      trackChip: (lvl) => `Ruta ${lvl}`,
      questionProgress: (cur, tot) => `Pregunta ${cur} de ${tot}`,
      nextBtn: 'Siguiente pregunta',
      seeResultBtn: 'Ver mi resultado',
      footerNote: 'Elige la mejor respuesta. Las explicaciones aparecerán en tu resultado.',
      toastSelectAnswer: 'Elige una respuesta para continuar.',
      questions: SPANISH_QUESTIONS,
    },
    result: {
      topTitle: 'Resumen de nivel',
      eyebrow: 'RESUMEN DE TU PRÁCTICA',
      heading: ['¡Buen trabajo,', { embossed: 'estudiante!' }] as HeadingLineConfig[],
      subtext: (score, total) => `Respondiste correctamente ${score} de ${total} preguntas muestra.`,
      statCorrect: 'Correctas',
      statSuggested: 'Inicio sugerido',
      statStep: 'Paso dado',
      statStepVal: '1.er paso',
      reviewTitle: 'Revisión de respuestas',
      reviewChip: (lvl) => `Serie ${lvl}`,
      buildPlanBtn: 'Crear mi plan de estudio',
      tryAgainBtn: 'Intentar de nuevo',
    },
    goal: {
      topTitle: 'Meta diaria',
      eyebrow: 'PASO 6 DE CONFIGURACIÓN',
      heading: ['Haz espacio para', { embossed: 'tu inglés.' }] as HeadingLineConfig[],
      subtext: 'Elige una meta diaria que se adapte a tu rutina. Sesiones breves y constantes marcan la diferencia.',
      goals: [
        { min: 5, emoji: '🌿', title: 'Inicio suave', desc: 'Fácil de mantener' },
        { min: 10, emoji: '✨', title: 'Equilibrado', desc: 'Un poco cada día' },
        { min: 15, emoji: '🔥', title: 'Enfocado', desc: 'Gana impulso' },
        { min: 20, emoji: '⚡', title: 'Práctica profunda', desc: 'Avanza más rápido' },
      ],
      goalSummaryTitle: (min) => `Tu meta: ${min} minutos al día`,
      goalSummaryDesc: 'Puedes cambiar esto en cualquier momento en tu perfil.',
      continueBtn: 'Establecer mi rutina',
    },
    reminders: {
      topTitle: 'Recordatorios',
      eyebrow: 'UN RECORDATORIO AMABLE',
      heading: ['Un recordatorio', { prefix: 'hace la', embossed: 'diferencia.' }] as HeadingLineConfig[],
      subtext: 'Un recordatorio diario te ayuda a mantener viva tu racha de aprendizaje.',
      cardTitle: 'Recordatorio diario de estudio',
      cardSub: 'Hora sugerida · 7:00 PM',
      continueBtn: 'Continuar',
      maybeLaterBtn: 'Quizás más tarde',
      footerNote: 'Ajusta los permisos de notificación en cualquier momento en ajustes.',
      toastOn: 'Recordatorio programado para las 7:00 PM.',
      toastOff: 'Recordatorios desactivados.',
    },
    formulas: {
      topTitle: '600+ Fórmulas',
      eyebrow: 'TU CAJA DE HERRAMIENTAS',
      heading: ['600+ fórmulas.', { embossed: 'Patrones claros.' }] as HeadingLineConfig[],
      subtext: 'Aprende estructuras reutilizables en vez de memorizar frases sueltas. Comprende el patrón y luego practica con ejemplos.',
      deckCategoryCollection: 'COLECCIÓN DE FÓRMULAS',
      deckNoteCollection: 'Bloques de construcción de oraciones',
      deckCategoryPractice: 'TARJETA DE PRÁCTICA',
      deckNotePractice: 'Significado que conecta',
      deckCategoryTense: (tense) => `TIEMPO ${tense.toUpperCase()}`,
      deckNoteTense: 'Un patrón que puedes volver a usar',
      tabs: { Present: 'Present', Past: 'Past', Future: 'Future' },
      chipExample: 'Fórmula de ejemplo',
      translationLabel: 'Traducción al español',
      highlightLabel: 'Inglés · frase correspondiente resaltada',
      feature1Title: 'Comprende la estructura',
      feature1Desc: 'Explora fórmulas con explicaciones, ejemplos, elementos guardados y cuestionarios.',
      feature2Title: 'Aprende a tu nivel',
      feature2Desc: 'Desarrolla tu comprensión paso a paso con práctica guiada.',
      continueBtn: 'Mostrar mi ruta de aprendizaje',
      formulaData: {
        Present: {
          title: 'Present Simple',
          structure: 'Subject + V1 (s/es)',
          translation: 'Leo libros todos los días.',
          prefix: 'I ',
          highlight: 'read books every day',
          suffix: '.',
        },
        Past: {
          title: 'Past Simple',
          structure: 'Subject + V2',
          translation: 'Ayer leí un libro.',
          prefix: 'I ',
          highlight: 'read a book yesterday',
          suffix: '.',
        },
        Future: {
          title: 'Future Simple',
          structure: 'Subject + will + V1',
          translation: 'Estudiaré mañana.',
          prefix: 'I ',
          highlight: 'will study tomorrow',
          suffix: '.',
        },
      },
    },
    ready: {
      topTitle: '¡Estás listo!',
      eyebrow: 'PERFIL DE APRENDIZAJE PERSONAL',
      heading: ['Estás listo', { prefix: 'para', embossed: 'comenzar.' }] as HeadingLineConfig[],
      subtext: 'Tu espacio de aprendizaje está listo para personalizarse según tus preferencias.',
      labelCountry: 'País',
      labelLanguage: 'Idioma de la app',
      labelLevel: 'Nivel inicial',
      labelGoal: 'Meta diaria',
      labelReminder: 'Recordatorio diario',
      goalValue: (min) => `${min} minutos`,
      reminderOn: 'Activado (7:00 PM)',
      reminderOff: 'No configurado',
      check1: 'Un punto de inicio personalizado',
      check2: 'Ruta de 600+ fórmulas',
      check3: 'Practica a tu propio ritmo',
      startBtn: 'Comenzar a aprender',
      exploreBtn: 'Explorar 600+ fórmulas',
    },
    help: {
      title: 'Configuración de Fluent',
      message: 'Esta configuración personaliza tu ruta de 600+ fórmulas, evaluaciones de nivel y metas de estudio.',
    },
  },

  English: {
    language: {
      topTitle: 'App Language',
      eyebrow: 'STEP 2 OF SETUP',
      heading: ['Choose your', { embossed: 'language.' }],
      subtext: 'Pick the language you’re most comfortable learning with. You can change it later in settings.',
      infoNote: 'Learning content will still help you practise English, with explanations in your chosen interface language when available.',
      continueBtn: 'Continue →',
    },
    account: {
      topTitle: 'Create your account',
      eyebrow: 'STEP 3 OF SETUP',
      heading: ['Your English', 'journey starts', { embossed: 'with you.' }],
      subtext: 'Create an account to keep your learning progress and saved formulas together.',
      googleBtn: 'Continue with Google',
      divider: 'OR CONTINUE WITH EMAIL',
      emailLabel: 'Email address',
      emailPlaceholder: 'you@example.com',
      terms: 'By continuing, you agree to the app’s Terms and Privacy Policy.',
      emailBtn: 'Continue with email',
      guestBtn: 'Explore without signing in',
      toastGoogle: 'Signed in with Google account (demo linked).',
      toastInvalidEmail: 'Please enter a valid email address.',
      toastGuest: 'Exploring as guest learner.',
      toastAccountReady: (email) => `Account setup ready with ${email}`,
    },
    level: {
      topTitle: 'Your English level',
      eyebrow: 'STEP 4 OF SETUP',
      heading: ['Where is your', { prefix: 'English', embossed: 'today?' }],
      subtext: 'Choose the level that feels closest to you. Your AI placement check will help personalise the practice.',
      levels: {
        Beginner: {
          title: 'Beginner',
          desc: 'I’m starting from the basics.',
          sub: 'Simple sentences and everyday English.',
        },
        Intermediate: {
          title: 'Intermediate',
          desc: 'I know some English already.',
          sub: 'Build fluency, grammar, and confidence.',
        },
        Advanced: {
          title: 'Advanced',
          desc: 'I can communicate comfortably.',
          sub: 'Refine accuracy, nuance, and expression.',
        },
      },
      continueBtn: 'Personalise my learning',
      footerNote: 'Not sure? Pick the closest option. You can adjust it later.',
    },
    assessmentIntro: {
      topTitle: 'AI Level Check',
      eyebrow: 'YOUR PERSONAL AI COACH',
      heading: ['Let’s find your', { embossed: 'starting point.' }],
      subtext: (lvl) => `Answer a few questions at your ${lvl.toLowerCase()} level. Your result can guide which lessons to begin with.`,
      statQuestions: 'Sample questions',
      statTime: 'Estimated time',
      statTimeVal: '2 min',
      statPath: 'Personalised path',
      statPathVal: 'AI',
      noPressureTitle: 'No pressure',
      noPressureDesc: 'This is a practice check, not an exam. You’ll get helpful explanations.',
      startBtn: 'Start level check',
      skipBtn: 'Skip for now',
      footerNote: 'Verified sample questions and local diagnostic scoring.',
    },
    assessment: {
      topTitle: 'Quick Assessment',
      trackChip: (lvl) => `${lvl} track`,
      questionProgress: (cur, tot) => `Question ${cur} of ${tot}`,
      nextBtn: 'Next question',
      seeResultBtn: 'See my result',
      footerNote: 'Choose the best answer. Explanations appear in your result.',
      toastSelectAnswer: 'Choose an answer to continue.',
      questions: ENGLISH_QUESTIONS,
    },
    result: {
      topTitle: 'Your Level Snapshot',
      eyebrow: 'YOUR PRACTICE SNAPSHOT',
      heading: ['Nice work,', { embossed: 'learner.' }],
      subtext: (score, total) => `You answered ${score} out of ${total} sample questions correctly.`,
      statCorrect: 'Correct',
      statSuggested: 'Suggested start',
      statStep: 'Step taken',
      statStepVal: '1st',
      reviewTitle: 'Answer review',
      reviewChip: (lvl) => `${lvl} set`,
      buildPlanBtn: 'Build my learning plan',
      tryAgainBtn: 'Try again',
    },
    goal: {
      topTitle: 'Daily Learning Goal',
      eyebrow: 'STEP 6 OF SETUP',
      heading: ['Make room for', { embossed: 'your English.' }],
      subtext: 'Choose a daily goal that fits your routine. Small, consistent sessions add up.',
      goals: [
        { min: 5, emoji: '🌿', title: 'Gentle start', desc: 'Easy to maintain' },
        { min: 10, emoji: '✨', title: 'Balanced', desc: 'A little every day' },
        { min: 15, emoji: '🔥', title: 'Focused', desc: 'Build momentum' },
        { min: 20, emoji: '⚡', title: 'Deep practice', desc: 'Make more progress' },
      ],
      goalSummaryTitle: (min) => `Your goal: ${min} minutes a day`,
      goalSummaryDesc: 'You can change this anytime in your profile.',
      continueBtn: 'Set my routine',
    },
    reminders: {
      topTitle: 'Learning Reminders',
      eyebrow: 'A GENTLE NUDGE',
      heading: ['A little reminder', { prefix: 'goes a', embossed: 'long way.' }],
      subtext: 'A daily reminder can help you keep your learning streak alive.',
      cardTitle: 'Daily learning reminder',
      cardSub: 'Suggested time · 7:00 PM',
      continueBtn: 'Continue',
      maybeLaterBtn: 'Maybe later',
      footerNote: 'Adjust notification permissions anytime in device settings.',
      toastOn: 'Reminder set for 7:00 PM.',
      toastOff: 'Reminders turned off.',
    },
    formulas: {
      topTitle: '600+ Formulas',
      eyebrow: 'YOUR ENGLISH TOOLKIT',
      heading: ['600+ formulas.', { embossed: 'Clear patterns.' }],
      subtext: 'Learn reusable sentence structures instead of memorising isolated sentences. Start with a pattern, understand it in Hindi, then practise with examples.',
      deckCategoryCollection: 'FORMULA COLLECTION',
      deckNoteCollection: 'Sentence building blocks',
      deckCategoryPractice: 'PRACTICE CARD',
      deckNotePractice: 'Meaning that connects',
      deckCategoryTense: (tense) => `${tense.toUpperCase()} TENSE`,
      deckNoteTense: 'A pattern you can use again',
      tabs: { Present: 'Present', Past: 'Past', Future: 'Future' },
      chipExample: 'Example formula',
      translationLabel: 'Hindi meaning',
      highlightLabel: 'English · matching phrase highlighted',
      feature1Title: 'Understand the structure',
      feature1Desc: 'Explore formulas with explanations, examples, saved items, and quizzes.',
      feature2Title: 'Learn at your level',
      feature2Desc: 'Build your understanding step by step with guided practice.',
      continueBtn: 'Show my learning path',
      formulaData: {
        Present: {
          title: 'Present Simple',
          structure: 'Subject + V1 (s/es)',
          translation: 'मैं रोज़ किताबें पढ़ता हूँ।',
          prefix: 'I ',
          highlight: 'read books every day',
          suffix: '.',
        },
        Past: {
          title: 'Past Simple',
          structure: 'Subject + V2',
          translation: 'मैंने कल किताब पढ़ी।',
          prefix: 'I ',
          highlight: 'read a book yesterday',
          suffix: '.',
        },
        Future: {
          title: 'Future Simple',
          structure: 'Subject + will + V1',
          translation: 'मैं कल पढ़ूँगा।',
          prefix: 'I ',
          highlight: 'will study tomorrow',
          suffix: '.',
        },
      },
    },
    ready: {
      topTitle: 'You’re Ready!',
      eyebrow: 'PERSONAL LEARNING PROFILE',
      heading: ['You’re ready', { prefix: 'to', embossed: 'begin.' }],
      subtext: 'Your learning space is ready to personalise around your preferences.',
      labelCountry: 'Country',
      labelLanguage: 'App language',
      labelLevel: 'Starting level',
      labelGoal: 'Daily learning goal',
      labelReminder: 'Daily reminder',
      goalValue: (min) => `${min} minutes`,
      reminderOn: 'On (7:00 PM)',
      reminderOff: 'Not set',
      check1: 'A personal starting point',
      check2: '600+ formula learning path',
      check3: 'Practice at your own pace',
      startBtn: 'Start learning',
      exploreBtn: 'Explore 600+ formulas',
    },
    help: {
      title: 'Fluent Onboarding',
      message: 'This setup personalises your 600+ formula learning path, level checks, and study goals.',
    },
  },
};

export function getOnboardingStrings(lang: AppLanguage): OnboardingStrings {
  return ONBOARDING_TRANSLATIONS[lang] || ONBOARDING_TRANSLATIONS.Hindi;
}
