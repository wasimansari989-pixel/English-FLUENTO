require('dotenv').config();
const geminiLiveService = require('../src/services/geminiLiveService');

async function testVad() {
  console.log('1. Provisioning session...');
  const session = await geminiLiveService.provisionSession({
    userId: 'test_vad_user',
    mode: 'beginner',
    topic: 'daily_life'
  });

  console.log('2. Opening WebSocket to Gemini Live...');
  const ws = new WebSocket(session.wsUrl);

  ws.onopen = () => {
    console.log('Connected to Gemini Live!');
    ws.send(JSON.stringify({
      setup: {
        model: session.model,
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Aoede',
              },
            },
          },
        },
        systemInstruction: {
          parts: [{ text: session.systemInstruction }],
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
    }));
  };

  ws.onmessage = async (e) => {
    try {
      const text = typeof e.data === 'string' ? e.data : await e.data.text();
      const msg = JSON.parse(text);

      if (msg.setupComplete) {
        console.log('>>> Setup complete! Simulating streaming audio without clientContent.turnComplete...');
        
        // Stream continuous 16kHz PCM chunks (e.g. 100ms chunks)
        const sampleRate = 16000;
        const chunkSamples = 1600; // 100ms
        let chunkIndex = 0;

        const interval = setInterval(() => {
          chunkIndex++;
          if (chunkIndex > 40) { // Stream 4 seconds of audio
            clearInterval(interval);
            console.log('Finished streaming audio. Now waiting for Gemini server-side VAD...');
            return;
          }

          const buffer = Buffer.alloc(chunkSamples * 2);
          // Let's create a simulated voice tone around chunks 10 to 30 (2 seconds)
          if (chunkIndex >= 10 && chunkIndex <= 30) {
            for (let i = 0; i < chunkSamples; i++) {
              const t = (chunkIndex * chunkSamples + i) / sampleRate;
              const sample = Math.sin(2 * Math.PI * 300 * t) * 8000;
              buffer.writeInt16LE(Math.round(sample), i * 2);
            }
          }
          const base64Chunk = buffer.toString('base64');
          ws.send(JSON.stringify({
            realtimeInput: {
              mediaChunks: [{
                mimeType: 'audio/pcm;rate=16000',
                data: base64Chunk
              }]
            }
          }));
        }, 100);
      }

      if (msg.serverContent) {
        const sc = msg.serverContent;
        if (sc.inputTranscription?.text) {
          console.log('[USER CAPTION]:', sc.inputTranscription.text);
        }
        if (sc.modelTurn?.parts) {
          for (const p of sc.modelTurn.parts) {
            if (p.text) console.log('[AI TEXT]:', p.text);
          }
        }
        if (sc.outputTranscription?.text) {
          console.log('[AI CAPTION]:', sc.outputTranscription.text);
        }
        if (sc.turnComplete) {
          console.log('>>> Model Turn Complete from server-side VAD!');
          setTimeout(() => {
            ws.close();
            process.exit(0);
          }, 1000);
        }
      }
    } catch (err) {
      console.log('Error parsing:', err);
    }
  };

  ws.onerror = (e) => console.log('WS error:', e.message || e);
  ws.onclose = (e) => {
    console.log(`WS closed: code=${e.code}, reason="${e.reason}"`);
    process.exit(0);
  };
}

testVad();
