const geminiLiveService = require('../src/services/geminiLiveService');

async function testStreamingAudioTurn() {
  const session = await geminiLiveService.provisionSession({ userId: 'u_stream_test', mode: 'beginner' });
  const ws = new WebSocket(session.wsUrl);
  let greetingDone = false;

  ws.onopen = () => {
    ws.send(JSON.stringify({
      setup: {
        model: session.model,
        generationConfig: { responseModalities: ['AUDIO'] },
        systemInstruction: { parts: [{ text: session.systemInstruction }] },
        inputAudioTranscription: {},
        outputAudioTranscription: {}
      }
    }));
  };

  ws.onmessage = async (e) => {
    const text = typeof e.data === 'string' ? e.data : await e.data.text();
    const msg = JSON.parse(text);

    if (msg.setupComplete) {
      console.log('Setup complete! Sending initial greeting...');
      ws.send(JSON.stringify({
        clientContent: {
          turns: [{ role: 'user', parts: [{ text: 'Hello! Let us practice English.' }] }],
          turnComplete: true
        }
      }));
    }

    if (msg.serverContent) {
      if (msg.serverContent.inputTranscription?.text) {
        console.log('[USER HEARD]:', msg.serverContent.inputTranscription.text);
      }
      if (msg.serverContent.outputTranscription?.text) {
        process.stdout.write(msg.serverContent.outputTranscription.text);
      }
      if (msg.serverContent.turnComplete) {
        if (!greetingDone) {
          greetingDone = true;
          console.log('\n\n--- Greeting finished. Now streaming audio chunks WITHOUT clientContent.turnComplete! ---');

          // Send 20 chunks of 100ms audio (2 seconds total)
          let chunkIndex = 0;
          const interval = setInterval(() => {
            if (chunkIndex >= 25) {
              clearInterval(interval);
              console.log('Audio streaming finished. Now waiting for Gemini VAD response (NO clientContent sent)...');
              return;
            }

            // 100ms of 16kHz PCM = 1600 samples = 3200 bytes
            const numSamples = 1600;
            const buf = Buffer.alloc(numSamples * 2);
            for (let i = 0; i < numSamples; i++) {
              // 300Hz tone for first 15 chunks (1.5s), then silence for 10 chunks (1.0s)
              const sample = chunkIndex < 15 ? Math.sin(2 * Math.PI * 300 * (i / 16000)) * 12000 : 0;
              buf.writeInt16LE(Math.round(sample), i * 2);
            }

            ws.send(JSON.stringify({
              realtimeInput: {
                mediaChunks: [{
                  mimeType: 'audio/pcm;rate=16000',
                  data: buf.toString('base64')
                }]
              }
            }));
            chunkIndex++;
          }, 100);
        } else {
          console.log('\n\n>>> GEMINI RESPONDED TO STREAMED AUDIO!');
          ws.close();
          process.exit(0);
        }
      }
    }
  };

  ws.onerror = (e) => console.error('WS Error:', e);
}

testStreamingAudioTurn();
