const geminiLiveService = require('../src/services/geminiLiveService');

async function testActivityEnd() {
  const session = await geminiLiveService.provisionSession({ userId: 'u_act', mode: 'beginner' });
  const ws = new WebSocket(session.wsUrl);

  ws.onopen = () => {
    ws.send(JSON.stringify({
      setup: {
        model: session.model,
        generationConfig: { responseModalities: ['AUDIO'] }
      }
    }));
  };

  ws.onmessage = async (e) => {
    const text = typeof e.data === 'string' ? e.data : await e.data.text();
    const msg = JSON.parse(text);

    if (msg.setupComplete) {
      console.log('Setup complete!');
      // Send 1 second of PCM audio
      const numSamples = 16000;
      const buf = Buffer.alloc(numSamples * 2);
      for (let i = 0; i < numSamples; i++) {
        const s = Math.sin(2 * Math.PI * 440 * (i / 16000)) * 10000;
        buf.writeInt16LE(Math.round(s), i * 2);
      }
      console.log('Sending mediaChunk...');
      ws.send(JSON.stringify({
        realtimeInput: {
          mediaChunks: [{
            mimeType: 'audio/pcm;rate=16000',
            data: buf.toString('base64')
          }]
        }
      }));

      setTimeout(() => {
        console.log('Testing activityEnd...');
        ws.send(JSON.stringify({
          realtimeInput: {
            activityEnd: {}
          }
        }));
      }, 500);
    }

    if (msg.serverContent) {
      if (msg.serverContent.outputTranscription?.text) {
        console.log('[OUTPUT]:', msg.serverContent.outputTranscription.text);
      }
      if (msg.serverContent.turnComplete) {
        console.log('Turn complete!');
        ws.close();
      }
    }
  };

  ws.onerror = (e) => console.error('WS Error:', e);
}

testActivityEnd();
