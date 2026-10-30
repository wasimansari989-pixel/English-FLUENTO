const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const apiKey = process.env.GEMINI_API_KEY;

const candidateModels = [
  'models/gemini-2.5-flash-native-audio-preview',
  'models/gemini-2.0-flash-exp',
  'models/gemini-2.0-flash-realtime-exp',
  'models/gemini-2.0-flash',
  'models/gemini-3.8-live',
  'models/gemini-2.5-flash',
  'models/gemini-3.8-flash',
  'models/gemini-2.5-flash-preview-tts',
  'models/gemini-3.8-flash-tts'
];

async function probeV1Alpha(model) {
  return new Promise((resolve) => {
    const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
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
  console.log('Testing v1alpha WebSocket...');
  for (const m of candidateModels) {
    const res = await probeV1Alpha(m);
    console.log(`v1alpha Model: ${m} ->`, res.success ? 'ACCEPTED!' : `FAILED (${res.reason || res.error || res.code})`);
    if (res.success) {
      console.log('Setup response:', JSON.stringify(res.data || res.raw));
    }
  }
}

run();
