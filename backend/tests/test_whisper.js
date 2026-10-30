const fs = require('fs');

async function testGroqWhisper() {
  const apiKey = process.env.GROQ_API_KEY;
  console.log('Testing Groq Whisper with API key...');

  // Create a 16kHz 16-bit mono WAV buffer (silence or synthetic audio)
  const sampleRate = 16000;
  const numSamples = 16000 * 2; // 2 seconds
  const pcmLen = numSamples * 2;
  const wavBuf = Buffer.alloc(44 + pcmLen);

  // WAV Header
  wavBuf.write('RIFF', 0);
  wavBuf.writeUInt32LE(36 + pcmLen, 4);
  wavBuf.write('WAVE', 8);
  wavBuf.write('fmt ', 12);
  wavBuf.writeUInt32LE(16, 16);
  wavBuf.writeUInt16LE(1, 20); // PCM
  wavBuf.writeUInt16LE(1, 22); // mono
  wavBuf.writeUInt32LE(sampleRate, 24);
  wavBuf.writeUInt32LE(sampleRate * 2, 28);
  wavBuf.writeUInt16LE(2, 32);
  wavBuf.writeUInt16LE(16, 34);
  wavBuf.write('data', 36);
  wavBuf.writeUInt32LE(pcmLen, 40);

  const formData = new FormData();
  const blob = new Blob([wavBuf], { type: 'audio/wav' });
  formData.append('file', blob, 'test.wav');
  formData.append('model', 'whisper-large-v3-turbo');
  formData.append('language', 'en');

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`
    },
    body: formData
  });

  const data = await res.json();
  console.log('Groq response status:', res.status, 'data:', data);
}

testGroqWhisper().catch(console.error);
