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
  const { audioBase64 } = req.body || {};
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

    const blob = new Blob([pcmBuf], { type: 'audio/wav' });
    const formData = new FormData();
    formData.append('file', blob, 'turn.wav');
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('language', 'en');
    formData.append('prompt', 'English conversation practice by Indian learner. Short sentences, daily life, kitchen, cooking, morning routine, greeting.');

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
      text.toLowerCase() === 'subtitle by' ||
      text.toLowerCase().includes('subtitles')
    ) {
      text = '';
    }

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
  const { question, formulaId, mode = 'beginner', clientId, history = [] } = req.body;
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'Question is required' });
  }

  const userId = clientId || req.ip;

  try {
    const contextFormulas = FormulaRetrieval.retrieveContext({ formulaId, query: question });
    const systemPrompt = buildTutorSystemPrompt(mode, contextFormulas);
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
  const { sentence, clientId } = req.body;
  if (!sentence || typeof sentence !== 'string') {
    return res.status(400).json({ error: 'Sentence is required' });
  }

  const userId = clientId || req.ip;

  try {
    const contextFormulas = FormulaRetrieval.retrieveContext({ query: sentence });
    const systemPrompt = buildCorrectionSystemPrompt(contextFormulas);

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
  const { formulaId = 1, count = 5, clientId } = req.body;
  const formula = FormulaRetrieval.getFormulaById(formulaId) || FormulaRetrieval.getFormulaById(1);
  const userId = clientId || req.ip;

  try {
    const systemPrompt = buildQuizSystemPrompt(formula, count);

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
    const systemPrompt = `You are a conversational English conversation partner for a Hindi speaker.
Scenario: ${scenarioId || 'Everyday English Conversation'}
Role: Speak naturally, ask ONE question at a time to keep the conversation going.
Correction Mode: "${correctionMode}".
If the user made any grammar or vocabulary mistake:
Provide the correction in simple Hindi under "correctionHindi", and the corrected English version under "correctedEnglish".
Output JSON:
{
  "reply": "Your conversational response in natural English (1-2 sentences) ending with a friendly question",
  "correctionHindi": "If user made a mistake, explain it kindly in Hindi, else null",
  "correctedEnglish": "If user made a mistake, correct sentence, else null"
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
      reply: parsed.reply || "That's great! Tell me more about that.",
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

module.exports = router;
