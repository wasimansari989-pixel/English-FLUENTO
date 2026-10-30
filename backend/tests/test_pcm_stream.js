require('dotenv').config();
const geminiLiveService = require('../src/services/geminiLiveService');

async function testPcm() {
  console.log('1. Provisioning session...');
  const session = await geminiLiveService.provisionSession({
    userId: 'test_pcm_user',
    mode: 'beginner',
    topic: 'daily_life'
  });

  console.log('2. Opening WebSocket to Gemini Live...');
  const ws = new WebSocket(session.wsUrl);

  ws.onopen = () => {
    console.log('Connected to Gemini Live!');
    // 1. Setup frame
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
        console.log('>>> Setup complete received!');
        
        // Let's send a 1-second 16kHz 16-bit PCM tone (440Hz sine wave)
        const sampleRate = 16000;
        const duration = 1.0;
        const numSamples = Math.floor(sampleRate * duration);
        const buffer = Buffer.alloc(numSamples * 2); // 16-bit = 2 bytes per sample
        for (let i = 0; i < numSamples; i++) {
          const t = i / sampleRate;
          const sample = Math.sin(2 * Math.PI * 440 * t) * 15000; // 440Hz tone
          buffer.writeInt16LE(Math.round(sample), i * 2);
        }
        const base64Pcm = buffer.toString('base64');
        console.log(`Sending 1-second 16kHz PCM audio chunk (${buffer.length} bytes)...`);

        ws.send(JSON.stringify({
          realtimeInput: {
            mediaChunks: [{
              mimeType: 'audio/pcm;rate=16000',
              data: base64Pcm
            }]
          }
        }));

        // Send turn complete
        setTimeout(() => {
          console.log('Sending turnComplete...');
          ws.send(JSON.stringify({
            clientContent: {
              turnComplete: true
            }
          }));
        }, 500);
      }

      if (msg.serverContent) {
        const sc = msg.serverContent;
        if (sc.inputTranscription?.text) {
          console.log('[USER CAPTION]:', sc.inputTranscription.text);
        }
        if (sc.modelTurn?.parts) {
          for (const p of sc.modelTurn.parts) {
            if (p.text) console.log('[AI TEXT]:', p.text);
            if (p.inlineData) console.log(`[AI AUDIO]: ${p.inlineData.mimeType} (${p.inlineData.data.length} chars base64)`);
          }
        }
        if (sc.outputTranscription?.text) {
          console.log('[AI CAPTION]:', sc.outputTranscription.text);
        }
        if (sc.turnComplete) {
          console.log('>>> Model Turn Complete!');
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

testPcm();
