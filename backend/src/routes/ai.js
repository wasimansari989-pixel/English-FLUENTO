const express = require('express');
const router = express.Router();

const aiProviderRouter = require('../services/aiProviderRouter');
const userQuotaManager = require('../services/userQuotaManager');
const providerQuotaManager = require('../services/providerQuotaManager');
const FormulaRetrieval = require('../services/formulaRetrieval');
const ResponseValidation = require('../services/responseValidation');
const geminiLiveService = require('../services/geminiLiveService');
const liveQuotaManager = require('../services/liveQuotaManager');

const { buildTutorSystemPrompt } = require('../prompts/tutorPrompt');
const { buildCorrectionSystemPrompt } = require('../prompts/correctionPrompt');
const { buildQuizSystemPrompt } = require('../prompts/quizPrompt');

// Health & Status
router.get('/health', (req, res) => {
  const clientId = req.query.clientId || req.ip;
  const quota = userQuotaManager.getUserQuota(clientId);
  res.json({
    status: 'ok',
    primaryProvider: aiProviderRouter.primaryProviderName,
    fallbackProvider: aiProviderRouter.fallbackProviderName,
    dailyLimit: quota.limit,
    usedToday: quota.count,
    remainingToday: quota.remaining
  });
});

router.get('/status', (req, res) => {
  const clientId = req.query.clientId || req.ip;
  const quota = userQuotaManager.getUserQuota(clientId);
  const groqAvail = providerQuotaManager.isProviderAvailable('groq');
  const geminiAvail = providerQuotaManager.isProviderAvailable('gemini');

  res.json({
    status: 'ok',
    primaryProvider: {
      name: 'groq',
      available: groqAvail.available,
      state: groqAvail.state
    },
    fallbackProvider: {
      name: 'gemini',
      available: geminiAvail.available,
      state: geminiAvail.state
    },
    dailyLimit: quota.limit,
    usedToday: quota.count,
    remainingToday: quota.remaining,
    offlineFormulasAvailable: 600
  });
});

// Admin Usage Report (No secret credentials exposed)
router.get('/admin/report', (req, res) => {
  res.json(aiProviderRouter.getAdminReport());
});

// --- Gemini Live API Real-Time Voice Endpoints ---

// Check voice quota
router.get('/live/quota', (req, res) => {
  const clientId = req.query.clientId || req.ip;
  const status = geminiLiveService.getVoiceQuota(clientId);
  res.json({ status: 'ok', ...status });
});

// Request ephemeral token for Gemini Live WebSocket session
router.post('/live/token', async (req, res) => {
  const { mode = 'beginner', topic = 'daily_life', formulaId, clientId } = req.body;
  const userId = clientId || req.ip;

  try {
    const sessionConfig = await geminiLiveService.provisionSession({
      userId,
      mode,
      topic,
      formulaId
    });
    res.json(sessionConfig);
  } catch (err) {
    console.error('[Live Token Route Error]', err.message);
    const status = err.status || 500;
    res.status(status).json({
      error: err.message || 'Failed to start voice session.',
      code: err.code || 'VOICE_SESSION_ERROR',
      textFallbackAvailable: err.textFallbackAvailable || false
    });
  }
});

// Real-time Whisper speech transcription for voice session turns
router.post('/live/transcribe', async (req, res) => {
  const { audioBase64, format, prompt: clientPrompt } = req.body || {};
  if (!audioBase64 || typeof audioBase64 !== 'string') {
    return res.status(400).json({ error: 'audioBase64 string is required', text: '' });
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return res.status(503).json({ error: 'Transcription service key not configured', text: '' });
  }

  try {
    const pcmBuf = Buffer.from(audioBase64, 'base64');
    if (pcmBuf.length < 100) {
      return res.json({ text: '' });
    }

    // Accurately detect audio container type (M4A / AAC vs RIFF WAV)
    const isM4a =
      format === 'm4a' ||
      (pcmBuf.length >= 8 && pcmBuf.subarray(4, 8).toString('latin1') === 'ftyp');
    const fileName = isM4a ? 'recording.m4a' : 'recording.wav';
    const mimeType = isM4a ? 'audio/m4a' : 'audio/wav';

    const blob = new Blob([pcmBuf], { type: mimeType });
    const formData = new FormData();
    formData.append('file', blob, fileName);
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('language', 'en');
    formData.append('response_format', 'json');
    formData.append('temperature', '0');
    if (clientPrompt && typeof clientPrompt === 'string' && clientPrompt.trim() && !clientPrompt.includes('Indian learner')) {
      const cleanPrompt = clientPrompt.trim().replace(/[❌✅💡📖🔄✨]/g, '');
      if (cleanPrompt) {
        formData.append('prompt', cleanPrompt);
      }
    }

    const whisperRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${groqKey}` },
      body: formData
    });

    if (!whisperRes.ok) {
      const errText = await whisperRes.text().catch(() => '');
      console.warn('[Whisper Transcribe Error]', whisperRes.status, errText);
      return res.json({ text: '', error: 'Transcription provider error' });
    }

    const whisperData = await whisperRes.json();
    let text = (whisperData.text || '').trim();

    // Clean common whisper hallucinations on silence
    if (
      text.toLowerCase() === 'thank you.' ||
      text.toLowerCase() === 'you' ||
      text.toLowerCase() === 'bye.' ||
      text.toLowerCase() === 'thank you very much.' ||
      text.toLowerCase() === 'indian learner.' ||
      text.toLowerCase() === 'indian learner' ||
      text.toLowerCase() === 'subtitle by' ||
      text.toLowerCase().includes('subtitles')
    ) {
      text = '';
    }

    console.log(`[Whisper Transcribe] Audio: ${pcmBuf.length}b, format: ${isM4a ? 'm4a' : 'wav'}. Heard: "${text}"`);
    res.json({ text });
  } catch (err) {
    console.error('[Live Transcribe Error]', err.message);
    res.json({ text: '', error: err.message });
  }
});

// Report session usage on finish/disconnect
router.post('/live/report-usage', (req, res) => {
  const { sessionId, durationSeconds } = req.body || {};
  if (!sessionId) {
    return res.json({ success: true, message: 'No sessionId provided' });
  }

  geminiLiveService.reportSessionUsage({ sessionId, durationSeconds: Number(durationSeconds) || 0 });
  res.json({ success: true });
});

// Reset voice quota counters (for interactive testing)
router.all('/live/reset', (req, res) => {
  liveQuotaManager.resetAllUsage();
  res.json({ success: true, message: 'All voice usage counters and sessions reset for testing.' });
});

// AI English Teacher
router.post('/tutor', async (req, res) => {
  const { question, formulaId, mode = 'beginner', clientId, history = [], weakTopics = [] } = req.body;
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'Question is required' });
  }

  const userId = clientId || req.ip;

  try {
    const contextFormulas = FormulaRetrieval.retrieveContext({ formulaId, query: question });
    const systemPrompt = buildTutorSystemPrompt(mode, contextFormulas, weakTopics);
    const maxHistory = parseInt(process.env.AI_MAX_HISTORY_MESSAGES || '4', 10);
    const recentHistory = (history || []).slice(-maxHistory);

    const routerResult = await aiProviderRouter.execute({
      type: 'tutor',
      userId,
      systemPrompt,
      userPrompt: question,
      context: {
        formula: contextFormulas[0] || null,
        conversationHistory: recentHistory.length > 0 ? recentHistory : undefined
      },
      formulaId,
      mode
    });

    const rawResponse = routerResult.rawResponse;

    // Extract suggested follow-ups if present
    let followUps = [];
    let cleanedReply = rawResponse;
    const followUpMatch = rawResponse.match(/FOLLOW_UPS:\s*(\[[\s\S]*?\])/);
    if (followUpMatch) {
      try {
        followUps = JSON.parse(followUpMatch[1]);
        cleanedReply = rawResponse.replace(followUpMatch[0], '').trim();
      } catch {
        // ignore parse error
      }
    }

    if (followUps.length === 0) {
      followUps = [
        'इसको और आसान तरीके से समझाओ।',
        '5 और उदाहरण दो।',
        'Negative sentence कैसे बनेगा?',
        'Question कैसे बनेगा?'
      ];
    }

    res.json({
      reply: cleanedReply,
      formulaId: formulaId || (contextFormulas[0] ? contextFormulas[0].id : null),
      suggestedFollowUps: followUps,
      remainingToday: routerResult.remainingToday,
      provider: routerResult.provider,
      fallbackUsed: routerResult.fallbackUsed,
      isCached: routerResult.isCached
    });
  } catch (err) {
    console.error('Tutor error:', err.message);
    const status = err.status || 500;
    res.status(status).json({
      error: err.message || 'AI Teacher is temporarily unavailable. All offline formulas remain available.',
      bothUnavailable: err.bothUnavailable || false
    });
  }
});

// AI Sentence Corrector
router.post('/correct-sentence', async (req, res) => {
  const { sentence, clientId, mode = 'beginner' } = req.body;
  if (!sentence || typeof sentence !== 'string') {
    return res.status(400).json({ error: 'Sentence is required' });
  }

  const userId = clientId || req.ip;

  try {
    const contextFormulas = FormulaRetrieval.retrieveContext({ query: sentence });
    const systemPrompt = buildCorrectionSystemPrompt(contextFormulas, mode);

    const routerResult = await aiProviderRouter.execute({
      type: 'correction',
      userId,
      systemPrompt,
      userPrompt: `Correct this English sentence: "${sentence}"`,
      context: contextFormulas[0] || null
    });

    const result = ResponseValidation.validateSentenceCorrection(routerResult.rawResponse, sentence);
    res.json({
      ...result,
      remainingToday: routerResult.remainingToday,
      provider: routerResult.provider,
      fallbackUsed: routerResult.fallbackUsed,
      isCached: routerResult.isCached
    });
  } catch (err) {
    console.error('Corrector error:', err.message);
    const status = err.status || 500;
    res.status(status).json({
      error: err.message || 'Sentence correction failed. Please try again.',
      bothUnavailable: err.bothUnavailable || false
    });
  }
});

// AI Example Generator
router.post('/generate-examples', async (req, res) => {
  const { formulaId, count = 5, clientId } = req.body;
  if (!formulaId) {
    return res.status(400).json({ error: 'formulaId is required' });
  }

  const formula = FormulaRetrieval.getFormulaById(formulaId);
  if (!formula) {
    return res.status(404).json({ error: `Formula ${formulaId} not found` });
  }

  const userId = clientId || req.ip;

  try {
    const { coreEng, coreHin } = ResponseValidation.getCorePhrases(formula);
    const existingExamplesList = (formula.examples || [])
      .map((e, idx) => `${idx + 1}. ${e.originalEnglish} (${e.originalHindi})`)
      .join('\n');

    const systemPrompt = `You are an expert spoken English coach helping Hindi speakers master English fluency.
Task: Generate ${count} BRAND NEW, DIVERSE, practical spoken English sentences strictly demonstrating:
Formula #${formula.id}: "${formula.englishFormula}"
Hindi Meaning: "(${formula.hindiMeaning})"

CRITICAL ANTI-DUPLICATION RULE:
The textbook already contains these verified examples:
${existingExamplesList}

YOU MUST NEVER REPEAT, COPY, OR SLIGHTLY REPHRASE ANY OF THE ABOVE EXAMPLES!
Generate 5 completely DIFFERENT real-world spoken sentences with fresh vocabulary, subjects (I, you, she, he, we, they, my brother, Rohan), actions, and everyday life contexts (office, college, family, travel, shopping, phone chats).

MANDATORY RULES:
1. Every English sentence MUST strictly demonstrate the formula structure "${coreEng || formula.englishFormula}".
2. Every Hindi sentence MUST be the natural Hindi translation conveying "${coreHin || formula.hindiMeaning}".
3. RED PHRASE HIGHLIGHTING (CRITICAL):
   - In "englishSegments": set "highlight": true and "alignmentGroup": "g1" ONLY for the core formula phrase ("${coreEng || 'the key formula words'}"). All other words MUST have "highlight": false.
   - In "hindiSegments": set "highlight": true and "alignmentGroup": "g1" ONLY for the corresponding Hindi meaning phrase ("${coreHin || 'the key Hindi words'}"). All other words MUST have "highlight": false.
   - Do NOT invert highlights!

Output MUST be a valid JSON array matching this format:
[
  {
    "englishSentence": "...",
    "hindiTranslation": "...",
    "formulaId": ${formula.id},
    "grammarNote": "व्याकरण का संक्षिप्त नोट",
    "hindiSegments": [
      {"text": "...", "highlight": false},
      {"text": "${coreHin || 'key'}", "highlight": true, "alignmentGroup": "g1"}
    ],
    "englishSegments": [
      {"text": "${coreEng || 'key'}", "highlight": true, "alignmentGroup": "g1"},
      {"text": "...", "highlight": false}
    ]
  }
]`;

    const routerResult = await aiProviderRouter.execute({
      type: 'examples',
      userId,
      systemPrompt,
      userPrompt: `Generate ${count} completely NEW, FRESH practice sentences for Formula #${formula.id}: ${formula.englishFormula}. Do NOT repeat any textbook examples.`,
      formulaId: formula.id
    });

    const examples = ResponseValidation.validateGeneratedExamples(routerResult.rawResponse, formula);
    res.json({
      formulaId: formula.id,
      examples,
      remainingToday: routerResult.remainingToday,
      provider: routerResult.provider,
      fallbackUsed: routerResult.fallbackUsed,
      isCached: routerResult.isCached
    });
  } catch (err) {
    console.error('Example generator error:', err.message);
    const status = err.status || 500;
    res.status(status).json({
      error: err.message || 'Example generation failed. Please try again.',
      bothUnavailable: err.bothUnavailable || false
    });
  }
});

// AI Quiz Generator
router.post('/generate-quiz', async (req, res) => {
  const { formulaId = 1, count = 5, difficulty = 'beginner', clientId } = req.body;
  const formula = FormulaRetrieval.getFormulaById(formulaId) || FormulaRetrieval.getFormulaById(1);
  const userId = clientId || req.ip;

  try {
    const systemPrompt = buildQuizSystemPrompt(formula, count, difficulty);

    const routerResult = await aiProviderRouter.execute({
      type: 'quiz',
      userId,
      systemPrompt,
      userPrompt: `Generate ${count} quiz questions for Formula #${formula.id}`,
      formulaId: formula.id
    });

    const questions = ResponseValidation.validateQuizQuestions(routerResult.rawResponse, formula.id);
    res.json({
      questions,
      remainingToday: routerResult.remainingToday,
      provider: routerResult.provider,
      fallbackUsed: routerResult.fallbackUsed,
      isCached: routerResult.isCached
    });
  } catch (err) {
    console.error('Quiz generator error:', err.message);
    const status = err.status || 500;
    res.status(status).json({
      error: err.message || 'Quiz generation failed. Please try again.',
      bothUnavailable: err.bothUnavailable || false
    });
  }
});

// AI Conversation Practice
router.post('/conversation', async (req, res) => {
  const { scenarioId, userMessage, history = [], correctionMode = 'every', clientId } = req.body;
  const userId = clientId || req.ip;

  try {
    const systemPrompt = `You are Fluent AI (Neerja), a friendly, patient, and caring personal English teacher having a one-to-one voice conversation with a Hindi-speaking learner.
Scenario: ${scenarioId || 'Everyday English Conversation'}
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
- NEVER use difficult Sanskritized grammar terms. Keep Hindi explanations conversational and natural.

OUTPUT JSON ONLY:
{
  "reply": "Your warm bilingual response (2-4 spoken sentences) actively guiding in Hindi and teaching English sentences to practice",
  "correctionHindi": "If user made a grammar mistake, explain kindly in simple Hindi, else null",
  "correctedEnglish": "If user made a grammar mistake, the corrected English sentence, else null"
}`;

    const routerResult = await aiProviderRouter.execute({
      type: 'conversation',
      userId,
      systemPrompt,
      userPrompt: userMessage || 'Hello!',
      context: { history: (history || []).slice(-4) }
    });

    const rawResponse = routerResult.rawResponse;
    let parsed = null;
    try {
      parsed = JSON.parse(rawResponse.replace(/```(?:json)?/g, '').trim());
    } catch {
      parsed = {
        reply: rawResponse,
        correctionHindi: null,
        correctedEnglish: null
      };
    }

    res.json({
      reply: parsed.reply || "बहुत बढ़िया! आप बहुत अच्छी कोशिश कर रहे हैं। Can you tell me a little more about that?",
      correctionHindi: parsed.correctionHindi || null,
      correctedEnglish: parsed.correctedEnglish || null,
      remainingToday: routerResult.remainingToday,
      provider: routerResult.provider,
      fallbackUsed: routerResult.fallbackUsed,
      isCached: routerResult.isCached
    });
  } catch (err) {
    console.error('Conversation error:', err.message);
    const status = err.status || 500;
    res.status(status).json({
      error: err.message || 'Conversation practice failed. Please try again.',
      bothUnavailable: err.bothUnavailable || false
    });
  }
});

// --- High-Fidelity Studio Neural Voice (EdgeTTS / Azure Neural) ---
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const ttsCache = new Map();
const MAX_TTS_CACHE = 400;

// Reusable persistent client pool for instant sub-second response
let pooledTtsClient = null;
let pooledTtsVoice = null;

// Map requested voices to youthful, melodious, modern neural voices (Never elderly Swara)
function normalizeTtsVoice(voice) {
  if (!voice || typeof voice !== 'string') return 'en-IN-NeerjaExpressiveNeural';
  const v = voice.trim();
  if (v === 'hi-IN-SwaraNeural' || v.toLowerCase().includes('swara')) {
    return 'en-IN-NeerjaExpressiveNeural'; // Upgrade old auntie voice to sweet young Neerja Expressive
  }
  if (v.toLowerCase().includes('ava')) {
    return 'en-US-AvaMultilingualNeural';
  }
  if (v.toLowerCase().includes('emma')) {
    return 'en-US-EmmaMultilingualNeural';
  }
  if (v.toLowerCase().includes('neerja')) {
    return 'en-IN-NeerjaExpressiveNeural';
  }
  if (v.toLowerCase().includes('jenny')) {
    return 'en-US-JennyNeural';
  }
  return v;
}

// Pre-warm client pool in background
(async function prewarmTts() {
  try {
    pooledTtsClient = new MsEdgeTTS();
    await pooledTtsClient.setMetadata('en-IN-NeerjaExpressiveNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    pooledTtsVoice = 'en-IN-NeerjaExpressiveNeural';
    console.log('⚡ [TTS Pool] Pre-warmed NeerjaExpressiveNeural persistent voice client.');
  } catch (e) {
    console.warn('[TTS Pool Prewarm Warn]', e.message);
  }
})();

async function getOrSynthesizeAudio(text, voice = 'en-IN-NeerjaExpressiveNeural') {
  const clean = text.trim();
  const effectiveVoice = normalizeTtsVoice(voice);
  const cacheKey = `${effectiveVoice}:::${clean}`;
  if (ttsCache.has(cacheKey)) {
    return ttsCache.get(cacheKey);
  }

  // Reuse pooled persistent client to eliminate re-connection latency
  if (!pooledTtsClient || pooledTtsVoice !== effectiveVoice) {
    pooledTtsClient = new MsEdgeTTS();
    await pooledTtsClient.setMetadata(effectiveVoice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    pooledTtsVoice = effectiveVoice;
  }

  try {
    const { audioStream } = pooledTtsClient.toStream(clean, { pitch: '+6Hz', rate: 1.05 });
    const chunks = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    if (ttsCache.size >= MAX_TTS_CACHE) {
      const oldestKey = ttsCache.keys().next().value;
      ttsCache.delete(oldestKey);
    }
    ttsCache.set(cacheKey, buffer);
    return buffer;
  } catch (err) {
    // If socket connection dropped, renew client and retry once
    pooledTtsClient = new MsEdgeTTS();
    await pooledTtsClient.setMetadata(effectiveVoice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    pooledTtsVoice = effectiveVoice;

    const { audioStream } = pooledTtsClient.toStream(clean, { pitch: '+6Hz', rate: 1.05 });
    const chunks = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    ttsCache.set(cacheKey, buffer);
    return buffer;
  }
}

// GET /api/ai/tts/stream - Ultra-low latency chunked streaming MP3
router.get('/tts/stream', async (req, res) => {
  const text = req.query.text;
  const rawVoice = req.query.voice || 'en-IN-NeerjaExpressiveNeural';
  const voice = normalizeTtsVoice(rawVoice);

  if (!text || !text.trim()) {
    return res.status(400).send('Text query parameter is required');
  }

  try {
    if (!pooledTtsClient || pooledTtsVoice !== voice) {
      pooledTtsClient = new MsEdgeTTS();
      await pooledTtsClient.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      pooledTtsVoice = voice;
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');

    const { audioStream } = pooledTtsClient.toStream(text.trim(), { pitch: '+6Hz', rate: 1.05 });
    for await (const chunk of audioStream) {
      res.write(chunk);
    }
    res.end();
  } catch (err) {
    console.error('[TTS Live Stream Error]:', err.message);
    if (!res.headersSent) {
      res.status(500).send(err.message);
    }
  }
});

// GET /api/ai/tts - Direct buffered MP3 for ExoPlayer / AudioPlayer
router.get('/tts', async (req, res) => {
  const text = req.query.text;
  const rawVoice = req.query.voice || 'en-IN-NeerjaExpressiveNeural';
  const voice = normalizeTtsVoice(rawVoice);

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Text query parameter is required' });
  }

  try {
    const buffer = await getOrSynthesizeAudio(text, voice);
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': buffer.length,
      'Cache-Control': 'public, max-age=86400',
      'Accept-Ranges': 'bytes'
    });
    return res.send(buffer);
  } catch (err) {
    console.error('[TTS Stream Error]:', err.message);
    res.status(500).json({ error: 'TTS synthesis failed', details: err.message });
  }
});

// POST /api/ai/tts - JSON base64 format
router.post('/tts', async (req, res) => {
  const { text, voice = 'en-IN-NeerjaExpressiveNeural' } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Text body parameter is required' });
  }

  try {
    const effectiveVoice = normalizeTtsVoice(voice);
    const buffer = await getOrSynthesizeAudio(text, effectiveVoice);
    res.json({
      success: true,
      audioBase64: buffer.toString('base64'),
      mimeType: 'audio/mpeg',
      length: buffer.length
    });
  } catch (err) {
    console.error('[TTS JSON Error]:', err.message);
    res.status(500).json({ error: 'TTS synthesis failed', details: err.message });
  }
});

module.exports = router;
