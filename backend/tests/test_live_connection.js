require('dotenv').config();
const geminiLiveService = require('../src/services/geminiLiveService');

async function testLive() {
  console.log('1. Requesting ephemeral token...');
  try {
    const session = await geminiLiveService.provisionSession({
      userId: 'test_node_user',
      mode: 'beginner',
      topic: 'daily_life'
    });
    console.log('Session provisioned:', {
      sessionId: session.sessionId,
      model: session.model,
      wsUrl: session.wsUrl.substring(0, 80) + '...'
    });

    console.log('2. Opening WebSocket to Gemini Live...');
    const ws = new WebSocket(session.wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connection OPENED!');
      const setupPayload = {
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
        },
      };
      console.log('Sending setup frame...');
      ws.send(JSON.stringify(setupPayload));
    };

    ws.onmessage = (e) => {
      console.log('Received WS message:', e.data.substring ? e.data.substring(0, 200) : typeof e.data);
    };

    ws.onerror = (e) => {
      console.log('WS error:', e.message || e);
    };

    ws.onclose = (e) => {
      console.log(`WS closed: code=${e.code}, reason="${e.reason}"`);
      process.exit(0);
    };

    setTimeout(() => {
      console.log('Timeout 10s - closing test');
      ws.close();
      process.exit(0);
    }, 10000);
  } catch (err) {
    console.error('Error during test:', err);
    process.exit(1);
  }
}

testLive();
