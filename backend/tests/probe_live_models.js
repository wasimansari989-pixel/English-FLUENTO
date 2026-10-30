const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const apiKey = process.env.GEMINI_API_KEY;

const candidateModels = [
  'gemini-3.8-flash-tts',
  'models/gemini-3.8-flash-tts',
  'gemini-2.5-flash-preview-tts',
  'models/gemini-2.5-flash-preview-tts',
  'gemini-omni-flash-preview',
  'models/gemini-omni-flash-preview',
  'gemini-omni-1.1-flash',
  'models/gemini-omni-1.1-flash',
  'gemini-3.5-transcribe',
  'models/gemini-3.5-transcribe'
];

async function probeModel(model) {
  return new Promise((resolve) => {
    const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
    const ws = new WebSocket(url);
    let resolved = false;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try { ws.close(); } catch {}
        resolve({ model, success: false, error: 'Timeout' });
      }
    }, 6000);

    ws.onopen = () => {
      const setupMsg = {
        setup: {
          model: model,
          generationConfig: {
            responseModalities: ['AUDIO']
          }
        }
      };
      ws.send(JSON.stringify(setupMsg));
    };

    ws.onmessage = (event) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        try {
          const data = JSON.parse(event.data);
          ws.close();
          resolve({ model, success: true, data });
        } catch (e) {
          ws.close();
          resolve({ model, success: true, raw: event.data });
        }
      }
    };

    ws.onerror = (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve({ model, success: false, error: err.message || 'WS error' });
      }
    };

    ws.onclose = (e) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve({ model, success: false, code: e.code, reason: e.reason });
      }
    };
  });
}

async function run() {
  console.log('Testing specific audio & omni models...');
  for (const m of candidateModels) {
    const res = await probeModel(m);
    console.log(`Model: ${m} ->`, res.success ? 'ACCEPTED!' : `FAILED (${res.reason || res.error || res.code})`);
    if (res.success) {
      console.log('Setup response:', JSON.stringify(res.data || res.raw));
    }
  }
}

run();
