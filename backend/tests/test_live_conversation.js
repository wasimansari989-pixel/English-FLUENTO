const geminiLiveService = require('../src/services/geminiLiveService');

async function test() {
  const session = await geminiLiveService.provisionSession({ userId: 'u1', mode: 'beginner', topic: 'daily_life' });
  const ws = new WebSocket(session.wsUrl);
  let turnCount = 0;

  ws.onopen = () => {
    ws.send(JSON.stringify({
      setup: {
        model: session.model,
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Aoede' }
            }
          }
        },
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
          turns: [{ role: 'user', parts: [{ text: 'Hello! I am ready to practice English.' }] }],
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
        turnCount++;
        console.log(`\n\n=== TURN ${turnCount} COMPLETE ===`);
        if (turnCount === 1) {
          console.log('\nSending Answer: "I wake up at 7 o\'clock and go for a walk."');
          setTimeout(() => {
            ws.send(JSON.stringify({
              clientContent: {
                turns: [{ role: 'user', parts: [{ text: "I wake up at 7 o'clock and go for a walk." }] }],
                turnComplete: true
              }
            }));
          }, 1500);
        } else if (turnCount === 2) {
          console.log('\nTest successful! AI replied to user answer.');
          ws.close();
          process.exit(0);
        }
      }
    }
  };

  ws.onerror = (err) => console.error('WS Error:', err);
  ws.onclose = (e) => console.log('WS Closed:', e.code, e.reason);
}

test();
