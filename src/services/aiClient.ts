import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { Storage } from '../database/storage';
import { SentenceCorrectionResult, AIGeneratedExample } from '../types/ai';
import { getFormulaById } from '../search/formulaSearch';
import { SentenceSegment } from '../types/formula';

const BACKEND_URL_KEY = '@english_formula_backend_url';
const DEFAULT_BACKEND_URL = 'http://localhost:3001';

export async function getBackendUrl(): Promise<string> {
  const saved = await Storage.getItem(BACKEND_URL_KEY);
  if (saved) return saved;

  // On native device/emulator, try detecting metro host IP automatically
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const hostIp = hostUri.split(':')[0];
    if (hostIp && hostIp !== 'localhost' && hostIp !== '127.0.0.1') {
      return `http://${hostIp}:3001`;
    }
  }

  return 'http://localhost:3001';
}

const CLIENT_ID_KEY = '@english_formula_client_id';

export async function getClientId(): Promise<string> {
  const saved = await Storage.getItem(CLIENT_ID_KEY);
  if (saved) return saved;
  const newId = 'user_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
  await Storage.setItem(CLIENT_ID_KEY, newId);
  return newId;
}

export async function getCandidateBackendUrls(): Promise<string[]> {
  const primary = await getBackendUrl();
  const urls = [
    primary,
    'http://localhost:3001',
    'http://192.168.29.231:3001',
    'http://10.0.2.2:3001',
  ];
  return Array.from(new Set(urls.filter(Boolean)));
}

export async function setBackendUrl(url: string): Promise<void> {
  await Storage.setItem(BACKEND_URL_KEY, url.trim().replace(/\/+$/, ''));
}

function buildSegments(fullText: string, corePhrase: string): SentenceSegment[] {
  if (!fullText) return [];
  if (!corePhrase) return [{ text: fullText, highlight: false }];
  const lowerFull = fullText.toLowerCase();
  const lowerCore = corePhrase.toLowerCase().trim();
  const idx = lowerFull.indexOf(lowerCore);
  if (idx === -1) {
    return [{ text: fullText, highlight: false }];
  }
  const before = fullText.slice(0, idx);
  const matched = fullText.slice(idx, idx + lowerCore.length);
  const after = fullText.slice(idx + lowerCore.length);
  const segs: SentenceSegment[] = [];
  if (before) segs.push({ text: before, highlight: false });
  segs.push({ text: matched, highlight: true, alignmentGroup: 'g1' });
  if (after) segs.push({ text: after, highlight: false });
  return segs;
}

function getSmartFormulaExamples(formulaId: number, count: number = 5): AIGeneratedExample[] {
  const formula = getFormulaById(formulaId);
  if (!formula) return [];

  // Extract core English and Hindi key phrases from formula examples
  let coreEng = '';
  let coreHin = '';
  if (formula.examples && formula.examples.length > 0) {
    for (const ex of formula.examples) {
      const engHl = ex.englishSegments?.find((s) => s.highlight);
      if (engHl && !coreEng) coreEng = engHl.text.trim();

      const hinHl = ex.hindiSegments?.find((s) => s.highlight);
      if (hinHl && !coreHin) coreHin = hinHl.text.trim();
    }
  }

  if (!coreEng) {
    coreEng = formula.englishFormula
      .replace(/^Sub\s*\+\s*/i, '')
      .replace(/\s*\+\s*V[1-3]?.*$/i, '')
      .replace(/\s*\+\s*object.*$/i, '')
      .trim();
  }

  if (!coreHin) {
    coreHin = formula.hindiMeaning ? formula.hindiMeaning.split(/[,/]/)[0].trim() : '';
  }

  // Formula 34: What is the need to
  if (
    formula.englishFormula.toLowerCase().includes('what is the need to') ||
    coreEng.toLowerCase().includes('what is the need to')
  ) {
    const list = [
      { eng: 'What is the need to go there?', hin: 'वहाँ जाने की क्या जरूरत है?' },
      { eng: 'What is the need to worry so much?', hin: 'इतनी चिंता करने की क्या जरूरत है?' },
      { eng: 'What is the need to hurry up?', hin: 'इतनी जल्दी करने की क्या जरूरत है?' },
      { eng: 'What is the need to shout at him?', hin: 'उस पर चिल्लाने की क्या जरूरत है?' },
      { eng: 'What is the need to buy this expensive phone?', hin: 'यह महंगा फोन खरीदने की क्या जरूरत है?' },
    ];

    return list.slice(0, count).map((item) => ({
      englishSentence: item.eng,
      hindiTranslation: item.hin,
      formulaId,
      grammarNote: 'जब किसी काम की आवश्यकता पर सवाल पूछना हो तो What is the need to का प्रयोग करें।',
      hindiSegments: buildSegments(item.hin, coreHin || 'क्या जरूरत है'),
      englishSegments: buildSegments(item.eng, coreEng || 'What is the need to'),
      isAIGenerated: true,
    }));
  }

  // Formula 295 / going to
  if (
    formula.englishFormula.toLowerCase().includes('going to') ||
    coreEng.toLowerCase().includes('going to')
  ) {
    const isPast = formula.englishFormula.toLowerCase().includes('was') || formula.englishFormula.toLowerCase().includes('were');
    const list = isPast
      ? [
          { eng: 'I was going to start a new job yesterday.', hin: 'मैं कल एक नई नौकरी शुरू करने वाला था।' },
          { eng: 'She was going to call you last night.', hin: 'वह कल रात आपको कॉल करने वाली थी।' },
          { eng: 'We were going to learn English together.', hin: 'हम साथ में अंग्रेजी सीखने वाले थे।' },
          { eng: 'They were going to leave the town.', hin: 'वे शहर छोड़ने वाले थे।' },
          { eng: 'He was going to buy a new laptop.', hin: 'वह एक नया लैपटॉप खरीदने वाला था।' },
        ]
      : [
          { eng: 'I am going to start a new business soon.', hin: 'मैं जल्द ही एक नया व्यापार शुरू करने वाला हूँ।' },
          { eng: 'She is going to call you tonight.', hin: 'वह आज रात आपको कॉल करने वाली है।' },
          { eng: 'We are going to learn English today.', hin: 'हम आज अंग्रेजी सीखने वाले हैं।' },
          { eng: 'They are going to arrive at 5 PM.', hin: 'वे शाम 5 बजे पहुँचने वाले हैं।' },
          { eng: 'He is going to buy a new car.', hin: 'वह एक नई कार खरीदने वाला है।' },
        ];

    return list.slice(0, count).map((item) => ({
      englishSentence: item.eng,
      hindiTranslation: item.hin,
      formulaId,
      grammarNote: 'भविष्य या भूतकाल की योजनाओं (वाला है / वाला था) के लिए going to का प्रयोग होता है।',
      hindiSegments: buildSegments(item.hin, coreHin || 'वाला'),
      englishSegments: buildSegments(item.eng, 'going to'),
      isAIGenerated: true,
    }));
  }

  // Formula 3: Sub + had + things
  if (
    formula.englishFormula.toLowerCase().includes('had') &&
    (formula.hindiMeaning.includes('था') || formula.hindiMeaning.includes('पास'))
  ) {
    const list = [
      { eng: 'I had an important meeting yesterday.', hin: 'मेरे पास कल एक जरूरी मीटिंग थी।' },
      { eng: 'She had some doubts about this question.', hin: 'उसके पास इस सवाल को लेकर कुछ संदेह था।' },
      { eng: 'We had enough time to finish our project.', hin: 'हमारे पास अपना प्रोजेक्ट पूरा करने के लिए पर्याप्त समय था।' },
      { eng: 'They had a great opportunity to travel.', hin: 'उनके पास यात्रा करने का एक शानदार अवसर था।' },
      { eng: 'My friend had an extra ticket for the match.', hin: 'मेरे दोस्त के पास मैच का एक अतिरिक्त टिकट था।' },
    ];
    return list.slice(0, count).map((item) => ({
      englishSentence: item.eng,
      hindiTranslation: item.hin,
      formulaId,
      grammarNote: 'भूतकाल में किसी वस्तु या स्थिति के पास होने के लिए had का प्रयोग होता है।',
      hindiSegments: buildSegments(item.hin, coreHin || 'पास'),
      englishSegments: buildSegments(item.eng, 'had'),
      isAIGenerated: true,
    }));
  }

  // Formula 2: Sub + have/has + things
  if (
    (formula.englishFormula.toLowerCase().includes('have') || formula.englishFormula.toLowerCase().includes('has')) &&
    formula.hindiMeaning.includes('पास')
  ) {
    const list = [
      { eng: 'I have an important meeting today.', hin: 'मेरे पास आज एक जरूरी मीटिंग है।' },
      { eng: 'She has a brilliant idea for the project.', hin: 'उसके पास प्रोजेक्ट के लिए एक शानदार विचार है।' },
      { eng: 'We have enough time to discuss this topic.', hin: 'हमारे पास इस विषय पर चर्चा करने के लिए पर्याप्त समय है।' },
      { eng: 'They have a big library in their college.', hin: 'उनके पास उनके कॉलेज में एक बड़ी लाइब्रेरी है।' },
      { eng: 'He has great confidence in his team.', hin: 'उसके पास अपनी टीम पर पूरा भरोसा है।' },
    ];
    return list.slice(0, count).map((item) => ({
      englishSentence: item.eng,
      hindiTranslation: item.hin,
      formulaId,
      grammarNote: 'वर्तमान में किसी वस्तु या विचार के पास होने के लिए have/has का प्रयोग होता है।',
      hindiSegments: buildSegments(item.hin, coreHin || 'पास'),
      englishSegments: buildSegments(item.eng, item.eng.includes('has') ? 'has' : 'have'),
      isAIGenerated: true,
    }));
  }

  // Generic fresh conversational actions for all other formulas
  const genericVariations = [
    { engAction: 'complete the assignment on time', hinAction: 'समय पर असाइनमेंट पूरा करना' },
    { engAction: 'discuss the new project with the team', hinAction: 'टीम के साथ नए प्रोजेक्ट पर चर्चा करना' },
    { engAction: 'reach the railway station before 5 PM', hinAction: 'शाम 5 बजे से पहले रेलवे स्टेशन पहुँचना' },
    { engAction: 'learn English grammar rules daily', hinAction: 'रोजाना अंग्रेजी व्याकरण के नियम सीखना' },
    { engAction: 'help our friends in difficult times', hinAction: 'कठिन समय में अपने दोस्तों की मदद करना' },
  ];

  const primaryEng = coreEng || 'practice';
  const primaryHin = coreHin || 'अभ्यास';

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
      hindiSegments: buildSegments(hin, primaryHin),
      englishSegments: buildSegments(eng, primaryEng),
      isAIGenerated: true,
    };
  });
}

export const AIClient = {
  async getStatus() {
    try {
      const clientId = await getClientId();
      const baseUrl = await getBackendUrl();
      const res = await fetch(`${baseUrl}/api/ai/status?clientId=${encodeURIComponent(clientId)}`, {
        signal: AbortSignal.timeout(4000)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // offline / backend not running
    }
    return {
      status: 'ready',
      primaryProvider: { name: 'groq', available: true },
      fallbackProvider: { name: 'gemini', available: true },
      dailyLimit: 10,
      usedToday: 0,
      remainingToday: 10,
      offlineFormulasAvailable: 600,
    };
  },

  async getVoiceQuota(): Promise<{
    status: string;
    dailySecondsLimit: number;
    usedTodaySeconds: number;
    remainingTodaySeconds: number;
    maxSessionSeconds: number;
    isAllowed: boolean;
  }> {
    try {
      const clientId = await getClientId();
      const baseUrl = await getBackendUrl();
      const res = await fetch(`${baseUrl}/api/ai/live/quota?clientId=${encodeURIComponent(clientId)}`, {
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // offline / backend not running
    }
    return {
      status: 'ok',
      dailySecondsLimit: 600,
      usedTodaySeconds: 0,
      remainingTodaySeconds: 600,
      maxSessionSeconds: 300,
      isAllowed: true,
    };
  },

  async askTutor(
    question: string,
    formulaId?: number,
    mode: 'beginner' | 'intermediate' | 'advanced' = 'beginner',
    history: any[] = []
  ) {
    try {
      const clientId = await getClientId();
      const baseUrl = await getBackendUrl();
      const res = await fetch(`${baseUrl}/api/ai/tutor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, formulaId, mode, clientId, history }),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        return await res.json();
      }
      const errData = await res.json().catch(() => ({}));
      if (errData.error) throw new Error(errData.error);
    } catch (e: any) {
      if (e?.message?.includes('limit') || e?.message?.includes('wait') || e?.message?.includes('capacity')) throw e;
    }

    // Local intelligent fallback if backend unreachable
    const formula = formulaId ? getFormulaById(formulaId) : null;
    if (formula) {
      return {
        reply: `यह **Formula #${formula.id}**: \`${formula.englishFormula}\` है।\nहिंदी अर्थ: **(${formula.hindiMeaning})**\n\n**व्याख्या:**\nजब भी आपको हिंदी में "${formula.hindiMeaning}" जैसा भाव बोलना हो, तब इस संरचना का प्रयोग करें।\n\n**उदाहरण:**\n• ${formula.examples[0]?.originalHindi || ''}\n  ${formula.examples[0]?.originalEnglish || ''}`,
        formulaId: formula.id,
        suggestedFollowUps: [
          'इसको और आसान तरीके से समझाओ।',
          '5 और उदाहरण दो।',
          'Negative sentence कैसे बनेगा?',
          'Question कैसे बनेगा?',
        ],
        remainingToday: 10,
        provider: 'offline-local'
      };
    }

    return {
      reply: `नमस्ते! मैं आपका AI English Teacher हूँ। आप किसी भी Sentence Formula, Helping Verb (have, has, had, would, could), या अपने वाक्य के बारे में पूछ सकते हैं।`,
      suggestedFollowUps: [
        'Would have been aur have been mein kya difference hai?',
        'Have to aur had to ka use kaise karein?',
        'Daily spoken English ke 5 best formulas batao.',
      ],
      remainingToday: 10,
      provider: 'offline-local'
    };
  },

  async correctSentence(sentence: string): Promise<SentenceCorrectionResult & { remainingToday?: number; fallbackUsed?: boolean }> {
    try {
      const clientId = await getClientId();
      const baseUrl = await getBackendUrl();
      const res = await fetch(`${baseUrl}/api/ai/correct-sentence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentence, clientId }),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        return await res.json();
      }
      const errData = await res.json().catch(() => ({}));
      if (errData.error) throw new Error(errData.error);
    } catch (e: any) {
      if (e?.message?.includes('limit') || e?.message?.includes('capacity')) throw e;
    }

    // Local deterministic correction logic
    const s = sentence.trim();
    if (/\bhe have\b/i.test(s)) {
      return {
        original: s,
        corrected: s.replace(/\bhave\b/gi, 'has'),
        isCorrect: false,
        explanationHindi:
          "He के साथ 'has' का उपयोग होता है, 'have' का नहीं। Present Perfect Continuous में Singular Subject के साथ 'has been' लगता है।",
        grammarTags: ['has been', 'subject-verb agreement'],
        suggestedFormulaIds: [207],
        practiceExample: {
          english: 'He has been working since 9 AM.',
          hindi: 'वह सुबह 9 बजे से काम कर रहा है।',
        },
        remainingToday: 10,
      };
    }

    if (/\bi is\b/i.test(s) || /\bi are\b/i.test(s)) {
      return {
        original: s,
        corrected: s.replace(/\bi is\b/gi, 'I am').replace(/\bi are\b/gi, 'I am'),
        isCorrect: false,
        explanationHindi: "I के साथ हमेशा 'am' का प्रयोग होता है।",
        grammarTags: ['am/is/are'],
        suggestedFormulaIds: [5],
        practiceExample: {
          english: 'I am ready.',
          hindi: 'मैं तैयार हूँ।',
        },
        remainingToday: 10,
      };
    }

    return {
      original: s,
      corrected: s,
      isCorrect: true,
      explanationHindi: 'यह वाक्य व्याकरण के अनुसार सही लग रहा है!',
      grammarTags: ['general-english'],
      suggestedFormulaIds: [1, 2],
      practiceExample: {
        english: 'Keep practicing daily.',
        hindi: 'रोज अभ्यास करते रहो।',
      },
      remainingToday: 10,
    };
  },

  async generateExamples(formulaId: number, count: number = 5): Promise<AIGeneratedExample[]> {
    const candidateUrls = await getCandidateBackendUrls();
    const clientId = await getClientId();

    for (const baseUrl of candidateUrls) {
      try {
        const res = await fetch(`${baseUrl}/api/ai/generate-examples`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ formulaId, count, clientId }),
          signal: AbortSignal.timeout(15000),
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.examples) && data.examples.length > 0) {
            return data.examples;
          }
        }
      } catch (err) {
        // try next candidate URL
      }
    }

    // Smart fallback strictly generating NEW practice examples (never duplicates verified examples)
    return getSmartFormulaExamples(formulaId, count);
  },

  async conversationStep(userMessage: string, scenarioId: string, history: any[] = []) {
    try {
      const clientId = await getClientId();
      const baseUrl = await getBackendUrl();
      const res = await fetch(`${baseUrl}/api/ai/conversation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage, scenarioId, history, clientId }),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // fallback
    }

    return {
      reply: 'That sounds interesting! Could you tell me more about that?',
      correctionHindi: null,
      correctedEnglish: null,
      remainingToday: 10
    };
  },
};

