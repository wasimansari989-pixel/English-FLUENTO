// Audio Utilities for Gemini Live 24kHz PCM Playback and WAV Conversion
import { setAudioModeAsync } from 'expo-audio';

/**
 * Creates a standard 44-byte RIFF WAV header for raw 16-bit PCM audio.
 * @param pcmByteLength Length of raw PCM data in bytes
 * @param sampleRate Sample rate in Hz (default: 24000 for Gemini Live audio output)
 * @param numChannels Number of channels (1 for mono)
 * @param bitsPerSample Bits per sample (16)
 */
export function createWavHeader(
  pcmByteLength: number,
  sampleRate: number = 24000,
  numChannels: number = 1,
  bitsPerSample: number = 16
): Uint8Array {
  const header = new Uint8Array(44);
  const totalDataLen = pcmByteLength + 36;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);

  // RIFF chunk descriptor
  header[0] = 0x52; // 'R'
  header[1] = 0x49; // 'I'
  header[2] = 0x46; // 'F'
  header[3] = 0x46; // 'F'
  header[4] = totalDataLen & 0xff;
  header[5] = (totalDataLen >> 8) & 0xff;
  header[6] = (totalDataLen >> 16) & 0xff;
  header[7] = (totalDataLen >> 24) & 0xff;

  // WAVE format
  header[8] = 0x57;  // 'W'
  header[9] = 0x41;  // 'A'
  header[10] = 0x56; // 'V'
  header[11] = 0x45; // 'E'

  // fmt subchunk
  header[12] = 0x66; // 'f'
  header[13] = 0x6d; // 'm'
  header[14] = 0x74; // 't'
  header[15] = 0x20; // ' '
  header[16] = 16;   // Subchunk1Size (16 for PCM)
  header[17] = 0;
  header[18] = 0;
  header[19] = 0;

  header[20] = 1; // AudioFormat (1 = PCM)
  header[21] = 0;
  header[22] = numChannels;
  header[23] = 0;

  header[24] = sampleRate & 0xff;
  header[25] = (sampleRate >> 8) & 0xff;
  header[26] = (sampleRate >> 16) & 0xff;
  header[27] = (sampleRate >> 24) & 0xff;

  header[28] = byteRate & 0xff;
  header[29] = (byteRate >> 8) & 0xff;
  header[30] = (byteRate >> 16) & 0xff;
  header[31] = (byteRate >> 24) & 0xff;

  header[32] = blockAlign;
  header[33] = 0;
  header[34] = bitsPerSample;
  header[35] = 0;

  // data subchunk
  header[36] = 0x64; // 'd'
  header[37] = 0x61; // 'a'
  header[38] = 0x74; // 't'
  header[39] = 0x61; // 'a'
  header[40] = pcmByteLength & 0xff;
  header[41] = (pcmByteLength >> 8) & 0xff;
  header[42] = (pcmByteLength >> 16) & 0xff;
  header[43] = (pcmByteLength >> 24) & 0xff;

  return header;
}

/**
 * Decodes a base64 string to a Uint8Array.
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Pure, high-speed Uint8Array to base64 encoder that has zero external dependencies.
 * Avoids Hermes/JSC call-stack limitations and Latin-1 character mangling.
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let result = '';
  const len = bytes.length;
  let i = 0;
  for (; i + 2 < len; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    result +=
      BASE64_CHARS[b0 >> 2] +
      BASE64_CHARS[((b0 & 3) << 4) | (b1 >> 4)] +
      BASE64_CHARS[((b1 & 15) << 2) | (b2 >> 6)] +
      BASE64_CHARS[b2 & 63];
  }
  if (i < len) {
    const b0 = bytes[i];
    if (i + 1 < len) {
      const b1 = bytes[i + 1];
      result +=
        BASE64_CHARS[b0 >> 2] +
        BASE64_CHARS[((b0 & 3) << 4) | (b1 >> 4)] +
        BASE64_CHARS[(b1 & 15) << 2] +
        '=';
    } else {
      result +=
        BASE64_CHARS[b0 >> 2] +
        BASE64_CHARS[(b0 & 3) << 4] +
        '==';
    }
  }
  return result;
}

/**
 * Converts raw 24kHz 16-bit PCM base64 chunks into a playable base64 WAV Data URI.
 * Works completely in-memory with zero file system dependencies.
 */
export function convertPcmChunksToWavDataUri(
  base64Chunks: string[],
  sampleRate: number = 24000
): string {
  let totalPcmLen = 0;
  const decodedChunks: Uint8Array[] = [];
  for (const chunk of base64Chunks) {
    const bytes = base64ToUint8Array(chunk);
    decodedChunks.push(bytes);
    totalPcmLen += bytes.length;
  }

  const header = createWavHeader(totalPcmLen, sampleRate, 1, 16);
  const wavBytes = new Uint8Array(header.length + totalPcmLen);
  wavBytes.set(header, 0);

  let offset = header.length;
  for (const chunk of decodedChunks) {
    wavBytes.set(chunk, offset);
    offset += chunk.length;
  }

  const base64Wav = uint8ArrayToBase64(wavBytes);
  return `data:audio/wav;base64,${base64Wav}`;
}

/**
 * Reads a recorded audio file URI and converts it to a base64 string
 * using standard React Native fetch and FileReader.
 */
export async function readUriAsBase64(uri: string): Promise<string> {
  return new Promise((resolve, reject) => {
    fetch(uri)
      .then((res) => res.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = (reader.result as string) || '';
          const commaIdx = result.indexOf(',');
          const base64 = commaIdx !== -1 ? result.substring(commaIdx + 1) : result;
          resolve(base64);
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(blob);
      })
      .catch(reject);
  });
}

/**
 * Configures the mobile audio mode for loudspeaker voice tutoring.
 */
export async function configureAudioForVoiceChat(): Promise<void> {
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: true,
    });
  } catch (err) {
    console.warn('[AudioUtils] Failed to set audio mode:', err);
  }
}
