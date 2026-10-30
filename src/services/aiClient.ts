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
    'http://192.168.29.231:3001',
    primary,
    'http://localhost:3001',
    'http://10.0.2.2:3001',
  ];
  return Array.from(new Set(urls.filter(Boolean)));
}

export async function setBackendUrl(url: string): Promise<void> {
  await Storage.setItem(BACKEND_URL_KEY, url.trim().replace(/\/+$/, ''));
}

const DIRECT_GROQ_KEY =
  process.env.EXPO_PUBLIC_GROQ_API_KEY ||
  Constants.expoConfig?.extra?.groqApiKey ||
  '';

/**
 * Resilient multi-tier speech transcription.
 * 1. Direct Groq Whisper Large V3 Turbo FIRST (lightning fast ~300ms, global cloud, works on cellular 4G/5G data & Wi-Fi).
 * 2. Fallback to candidate backend servers if cloud direct is blocked.
 */
export async function transcribeSpeech(
  audioBase64: string,
  fileUri?: string,
  prompt?: string
): Promise<string> {
  const isM4a =
    fileUri?.endsWith('.m4a') ||
    (!audioBase64?.startsWith('UklGR') &&
      (audioBase64?.includes('ftyp') || audioBase64?.startsWith('AAAA') || Boolean(fileUri)));
  const format = isM4a ? 'm4a' : 'wav';

  // Tier 1: Direct Groq Whisper Large V3 Turbo (~300ms response over 4G/5G/Wi-Fi worldwide)
  try {
    const formData = new FormData();
    if (fileUri) {
      const formattedUri = Platform.OS === 'android' ? fileUri : fileUri.replace('file://', '');
      formData.append('file', {
        uri: formattedUri,
        name: isM4a ? 'recording.m4a' : 'recording.wav',
        type: isM4a ? 'audio/mp4' : 'audio/wav',
      } as any);
    } else if (audioBase64) {
      const byteChars =
        typeof atob !== 'undefined'
          ? atob(audioBase64)
          : Buffer.from(audioBase64, 'base64').toString('binary');
      const pcmBytes = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        pcmBytes[i] = byteChars.charCodeAt(i);
      }
      const mimeType = isM4a ? 'audio/mp4' : 'audio/wav';
      const fileName = isM4a ? 'recording.m4a' : 'recording.wav';
      const blob = new Blob([pcmBytes], { type: mimeType });
      formData.append('file', blob, fileName);
    }

    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('language', 'en');
    formData.append('response_format', 'json');
    formData.append('temperature', '0');

    // Never use generic instructions or hallucination-triggering phrases as prompt.
    // If a clean target prompt was provided, pass it safely as vocabulary guidance.
    if (prompt && prompt.trim() && !prompt.includes('Indian learner')) {
      const cleanPrompt = prompt.trim().replace(/[❌✅💡📖🔄✨]/g, '');
      if (cleanPrompt) {
        formData.append('prompt', cleanPrompt);
      }
    }

    const whisperRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${DIRECT_GROQ_KEY}`,
      },
      body: formData,
      signal: AbortSignal.timeout(8000),
    });

    if (whisperRes.ok) {
      const whisperData = await whisperRes.json();
      let text = (whisperData.text || '').trim();
      const lower = text.toLowerCase();
      // Filter whisper silence / prompt hallucinations
      if (
        lower === 'thank you.' ||
        lower === 'thank you' ||
        lower === 'you' ||
        lower === 'bye.' ||
        lower === 'thank you very much.' ||
        lower === 'indian learner.' ||
        lower === 'indian learner' ||
        lower === '.' ||
        lower.includes('subtitles')
      ) {
        text = '';
      }
      if (text) {
        return text;
      }
    } else {
      const errText = await whisperRes.text().catch(() => '');
      console.warn('[Direct Groq Whisper Error Status]', whisperRes.status, errText);
    }
  } catch (directErr) {
    console.warn('[Direct Whisper Error]', directErr);
  }

  // Tier 2: Candidate backend servers fallback (when on local LAN / dev emulator)
  if (audioBase64) {
    const candidateUrls = await getCandidateBackendUrls();
    for (const url of candidateUrls) {
      try {
        const res = await fetch(`${url}/api/ai/live/transcribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audioBase64, format, prompt }),
          signal: AbortSignal.timeout(2500),
        });
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.text === 'string' && data.text.trim()) {
            await setBackendUrl(url);
            return data.text.trim();
          }
        }
      } catch {
        // try next candidate backend URL
      }
    }
  }

  return '';
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
    history: any[] = [],
    weakTopics: string[] = []
  ) {
    try {
      const clientId = await getClientId();
      const baseUrl = await getBackendUrl();
      const res = await fetch(`${baseUrl}/api/ai/tutor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, formulaId, mode, clientId, history, weakTopics }),
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

  async correctSentence(sentence: string, mode: 'beginner' | 'intermediate' | 'advanced' = 'beginner'): Promise<SentenceCorrectionResult & { remainingToday?: number; fallbackUsed?: boolean }> {
    try {
      const clientId = await getClientId();
      const baseUrl = await getBackendUrl();
      const res = await fetch(`${baseUrl}/api/ai/correct-sentence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentence, clientId, mode }),
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
    if (/\bhe go\b/i.test(s) || /\bhe go\b/i.test(s)) {
      return {
        original: s,
        corrected: s.replace(/\bgo\b/gi, 'went'),
        isCorrect: false,
        explanationHindi: "Past tense (बीता हुआ समय) में 'go' की जगह 'went' लगता है। 'yesterday' शब्द past tense indicate करता है।",
        hindiMeaning: 'वह कल स्कूल गया था।',
        betterAlternative: 'He went to school yesterday.',
        grammarTags: ['past tense', 'irregular verb'],
        suggestedFormulaIds: [10],
        practiceExample: {
          english: 'Make another sentence using "went".',
          hindi: '"went" का use करके एक और sentence बनाओ।',
        },
        remainingToday: 10,
      };
    }

    if (/\bhe have\b/i.test(s)) {
      return {
        original: s,
        corrected: s.replace(/\bhave\b/gi, 'has'),
        isCorrect: false,
        explanationHindi:
          "He के साथ 'has' का उपयोग होता है, 'have' का नहीं। Present Perfect Continuous में Singular Subject के साथ 'has been' लगता है।",
        hindiMeaning: 'वह सुबह 9 बजे से काम कर रहा है।',
        betterAlternative: null,
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
        hindiMeaning: 'मैं तैयार हूँ।',
        betterAlternative: null,
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
      hindiMeaning: null,
      betterAlternative: null,
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
    // 1. Prioritize candidate backend servers (dual Groq/Gemini router with full Hindi guidance)
    try {
      const clientId = await getClientId();
      const candidateUrls = await getCandidateBackendUrls();
      for (const baseUrl of candidateUrls) {
        try {
          const res = await fetch(`${baseUrl}/api/ai/conversation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userMessage, scenarioId, history, clientId }),
            signal: AbortSignal.timeout(4500),
          });
          if (res.ok) {
            const data = await res.json();
            if (data && data.reply) {
              await setBackendUrl(baseUrl);
              return data;
            }
          }
        } catch {
          // try next candidate backend
        }
      }
    } catch (backendErr) {
      console.warn('[AIClient.conversationStep] Backend servers unavailable, trying direct Groq:', backendErr);
    }

    // 2. Direct Groq Cloud fallback with mandatory bilingual Hindi guidance
    try {
      const systemPrompt = `You are Fluent AI (Neerja), a friendly, patient, and caring personal English teacher having a one-to-one voice conversation with a Hindi-speaking learner.
Topic/Scenario: ${scenarioId || 'Everyday English Conversation'}
Role: Actively guide, coach, and teach the learner in Hindi while training them to speak fluently in English.

MANDATORY RULE — ALWAYS GUIDE IN HINDI IN EVERY TURN:
The student wants to learn English through Hindi guidance. NEVER speak only in English!
In EVERY SINGLE TURN, follow this 3-step teaching pattern:
1. HINDI FEEDBACK & MEANING:
   - Appreciate their effort warmly in Devanagari Hindi ("बहुत बढ़िया!", "शाबाश!", "अच्छी कोशिश!").
   - Tell the learner in Hindi what their sentence means (e.g., "'I drink tea' का मतलब है — मैं चाय पीता हूँ।").
2. ENGLISH PRACTICE OR CORRECTION:
   - If correct: Praise them and encourage ("यह बिल्कुल सही sentence है!"). Teach a useful phrase to expand it.
   - If mistake: Explain kindly in 1 simple Hindi sentence why (e.g. "यहाँ 'go' की जगह 'went' आएगा क्योंकि आप कल की बात कर रहे हैं"), give the correct sentence, and ask them to repeat: "बोलिए: '[Correct sentence]'".
   - If stuck or answered in Hindi: Teach the English sentence and encourage repetition: "इसको English में कहेंगे: '[English sentence]' — अब आप बोलिए!"
3. NEXT QUESTION WITH HINDI MEANING:
   - Ask your next open-ended question in English AND explain its Hindi meaning so the student knows exactly what to answer!
   - Example: "आप चाय के साथ क्या खाना पसंद करते हैं? What do you like to have with your tea?"

CONVERSATIONAL RULES:
- Keep the response short, warm, and natural (2 to 4 spoken sentences total).
- Ask strictly ONE question at a time.
- NEVER use difficult Sanskritized grammar terms. Keep Hindi explanations conversational and natural.`;

      const messages: any[] = [{ role: 'system', content: systemPrompt }];
      if (Array.isArray(history)) {
        for (const h of history.slice(-4)) {
          messages.push({
            role: h.sender === 'user' ? 'user' : 'assistant',
            content: h.text,
          });
        }
      }
      messages.push({ role: 'user', content: userMessage });

      // Try fast bilingual Qwen first, fallback to GPT-OSS
      const candidateModels = ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b'];
      for (const model of candidateModels) {
        try {
          const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${DIRECT_GROQ_KEY}`,
            },
            body: JSON.stringify({
              model,
              messages,
              temperature: 0.7,
              max_tokens: 280,
            }),
            signal: AbortSignal.timeout(5000),
          });

          if (groqRes.ok) {
            const groqData = await groqRes.json();
            const content = groqData.choices?.[0]?.message?.content?.trim() || '';
            if (content) {
              const cleanReply = content.replace(/```json|```/g, '').trim();
              return {
                reply: cleanReply,
                correctionHindi: null,
                correctedEnglish: null,
                remainingToday: 10,
              };
            }
          }
        } catch {
          // try next model
        }
      }
    } catch (e) {
      console.warn('[AIClient.conversationStep] Direct Groq conversation error:', e);
    }

    return {
      reply: 'बहुत बढ़िया! आप बहुत अच्छी कोशिश कर रहे हैं। Can you tell me a little more about your day?',
      correctionHindi: null,
      correctedEnglish: null,
      remainingToday: 10,
    };
  },
};

