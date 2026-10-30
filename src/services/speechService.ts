import { AudioModule } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';
import { getCandidateBackendUrls } from './aiClient';
import { convertPcmChunksToWavDataUri } from './audioUtils';

let currentSpeechSessionId = 0;
let activeAudioPlayer: AudioPlayer | null = null;

export interface PronunciationResult {
  targetSentence: string;
  spokenSentence: string;
  accuracyScore: number; // 0 to 100 based on word matching
  matchedWords: string[];
  missedWords: string[];
  feedback: string;
  feedbackHindi: string;
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const matrix: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array(b.length + 1).fill(0)
  );
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

const GEMINI_API_KEY =
  process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
  '';

function containsHindiOrHinglish(text: string): boolean {
  if (/[\u0900-\u097F]/.test(text)) return true;
  const hinglishWords = /\b(aap|karein|kare|karna|karte|karti|karta|main|meri|mera|mere|hum|tum|tumhe|hoga|hogi|hoge|nahi|nahin|kyun|kyu|kaise|kese|kaisa|kaisi|shuru|boliye|bolo|boli|baat|bat|samajh|samjhe|sikhe|sikho|dhanyawad|namaste|theek|thik|achha|accha|acha|madad|batao|batayein|kahiye|kaho|matlab|bhi|aur|lekin|par|yeh|ye|woh|wo|kuch|kuchh|kripya|chaliye|pehle|pehla|baad|suno|sunaye|sikhna|shukriya|shabash|badhiya|kahenge|bolenge|mat|lijiye|kijiye)\b/i;
  return hinglishWords.test(text);
}

export const SpeechService = {
  /**
   * Speaks English & Hindi text using Ultra-Realistic Studio Neural Voice.
   * Auto-selects Microsoft Neerja (en-IN-NeerjaNeural) for bilingual English/Hindi so both
   * languages sound 100% natural and native, with zero foreign accent.
   * Fully debounced with atomic session tokens: double-tapping never overlaps or queues duplicate audio.
   */
  async speak(
    text: string,
    options?: {
      rate?: number;
      pitch?: number;
      language?: string;
      voiceName?: string;
      onDone?: () => void;
      onError?: () => void;
    }
  ): Promise<void> {
    // Increment global session ID to instantly cancel any previous in-flight speak calls
    const mySessionId = ++currentSpeechSessionId;

    // Immediately stop & release active audio player
    if (activeAudioPlayer) {
      try {
        activeAudioPlayer.pause();
        activeAudioPlayer.remove();
      } catch {}
      activeAudioPlayer = null;
    }

    try {
      const cleanText = text
        .replace(/\[\[CORRECTION:[\s\S]*?\]\]/g, '')
        .replace(/[❌✅💡🇮🇳📖🔄✨🎙️⏹️🔊]/g, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/[#_~]/g, '')
        .trim();

      if (!cleanText) {
        options?.onDone?.();
        return;
      }

      // Voice mapping: Modern, youthful, sweet voices (Never elderly Swara)
      const rawVoice = options?.voiceName || '';
      let edgeVoice = 'en-IN-NeerjaExpressiveNeural';
      let geminiVoice = 'Aoede';

      if (rawVoice.toLowerCase().includes('ava')) {
        edgeVoice = 'en-US-AvaMultilingualNeural';
        geminiVoice = 'Aoede';
      } else if (rawVoice.toLowerCase().includes('emma')) {
        edgeVoice = 'en-US-EmmaMultilingualNeural';
        geminiVoice = 'Aoede';
      } else if (rawVoice.toLowerCase().includes('jenny') || rawVoice.toLowerCase().includes('kore')) {
        edgeVoice = 'en-US-JennyNeural';
        geminiVoice = 'Kore';
      } else if (rawVoice === 'Fenrir' || rawVoice.toLowerCase().includes('guy') || rawVoice.toLowerCase().includes('male')) {
        edgeVoice = 'en-US-GuyNeural';
        geminiVoice = 'Fenrir';
      } else if (rawVoice.toLowerCase().includes('neerja')) {
        edgeVoice = 'en-IN-NeerjaExpressiveNeural';
        geminiVoice = 'Aoede';
      } else {
        // Default tutor voice: Neerja Expressive (Young, sweet, bilingual Indian English + Hindi)
        edgeVoice = 'en-IN-NeerjaExpressiveNeural';
        geminiVoice = 'Aoede';
      }

      let audioUri: string | null = null;

      // Tier 1: Microsoft Edge / Azure Neural Voice via backend candidate servers
      try {
        const candidateUrls = await getCandidateBackendUrls();
        for (const baseUrl of candidateUrls) {
          if (mySessionId !== currentSpeechSessionId) return; // User tapped again or stopped!
          try {
            const res = await fetch(`${baseUrl}/api/ai/tts`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: cleanText, voice: edgeVoice }),
              signal: AbortSignal.timeout(3500),
            });

            if (res.ok) {
              const data = await res.json();
              if (data.audioBase64) {
                audioUri = `data:audio/mp3;base64,${data.audioBase64}`;
                break;
              }
            }
          } catch {
            // Try next candidate URL
          }
        }
      } catch (backendErr) {
        console.warn('[SpeechService] Backend TTS probe failed:', backendErr);
      }

      if (mySessionId !== currentSpeechSessionId) return;

      // Tier 2: Gemini 2.5 Flash Neural TTS Fallback (with 44-byte RIFF WAV header)
      if (!audioUri) {
        const geminiModels = [
          'gemini-2.5-flash-preview-tts',
          'gemini-3.1-flash-tts-preview',
          'gemini-2.5-pro-preview-tts',
        ];

        for (const model of geminiModels) {
          if (mySessionId !== currentSpeechSessionId) return;
          try {
            const ttsRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: `Please read aloud clearly: "${cleanText}"` }] }],
                  generationConfig: {
                    responseModalities: ['AUDIO'],
                    speechConfig: {
                      voiceConfig: {
                        prebuiltVoiceConfig: {
                          voiceName: geminiVoice,
                        },
                      },
                    },
                  },
                }),
                signal: AbortSignal.timeout(5000),
              }
            );

            if (ttsRes.ok) {
              const ttsData = await ttsRes.json();
              const rawBase64 = ttsData.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
              if (rawBase64 && rawBase64.length > 500) {
                const cleanBase64 = rawBase64.replace(/[\r\n\s]/g, '');
                audioUri = convertPcmChunksToWavDataUri([cleanBase64], 24000);
                break;
              }
            }
          } catch (modelErr) {
            console.warn(`[SpeechService] Gemini TTS ${model} failed:`, modelErr);
          }
        }
      }

      if (mySessionId !== currentSpeechSessionId) return;

      if (!audioUri) {
        console.warn('[SpeechService] No neural voice synthesis source was available.');
        options?.onError?.();
        return;
      }

      // Playback with atomic session checking
      const player = new AudioModule.AudioPlayer({ uri: audioUri }, 500, false, 0, true);
      activeAudioPlayer = player;

      player.addListener('playbackStatusUpdate', (status: any) => {
        // Discard update if this playback session was superceded
        if (mySessionId !== currentSpeechSessionId) {
          try {
            player.pause();
            player.remove();
          } catch {}
          return;
        }

        if (status?.didJustFinish) {
          try {
            player.remove();
          } catch {}
          if (activeAudioPlayer === player) {
            activeAudioPlayer = null;
          }
          options?.onDone?.();
        }
      });

      player.play();
    } catch (err) {
      console.warn('[SpeechService] speak error:', err);
      if (activeAudioPlayer) {
        try {
          activeAudioPlayer.remove();
        } catch {}
        activeAudioPlayer = null;
      }
      options?.onError?.();
    }
  },

  /**
   * Stops any currently playing speech or audio.
   * Cancels all pending in-flight synthesis jobs.
   */
  async stop(): Promise<void> {
    currentSpeechSessionId++;
    if (activeAudioPlayer) {
      try {
        activeAudioPlayer.pause();
        activeAudioPlayer.remove();
      } catch {}
      activeAudioPlayer = null;
    }
  },

  /**
   * Checks whether speech is currently in progress.
   */
  async isSpeaking(): Promise<boolean> {
    return activeAudioPlayer !== null;
  },

  /**
   * Compares the user's spoken transcription against the target sentence.
   * Calculates honest word-level accuracy without claiming phoneme-level precision.
   */
  evaluatePronunciation(target: string, spoken: string): PronunciationResult {
    const clean = (s: string) =>
      s
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .trim();

    const targetWords = clean(target).split(/\s+/).filter(Boolean);
    const spokenWords = clean(spoken).split(/\s+/).filter(Boolean);

    if (targetWords.length === 0) {
      return {
        targetSentence: target,
        spokenSentence: spoken,
        accuracyScore: 0,
        matchedWords: [],
        missedWords: [],
        feedback: 'No target words to evaluate.',
        feedbackHindi: 'कोई वाक्य उपलब्ध नहीं है।',
      };
    }

    const matchedWords: string[] = [];
    const missedWords: string[] = [];

    targetWords.forEach((word) => {
      const isExact = spokenWords.includes(word);
      const isContraction =
        ((word === 'i' || word === 'am') && (spokenWords.includes('im') || spokenWords.includes("i'm"))) ||
        ((word === 'do' || word === 'not') && (spokenWords.includes('dont') || spokenWords.includes("don't"))) ||
        ((word === 'can' || word === 'not') && (spokenWords.includes('cant') || spokenWords.includes("can't")));
      const isFuzzy =
        word.length >= 4 &&
        spokenWords.some(
          (sw) => Math.abs(sw.length - word.length) <= 1 && levenshteinDistance(sw, word) <= 1
        );

      if (isExact || isContraction || isFuzzy) {
        matchedWords.push(word);
      } else {
        missedWords.push(word);
      }
    });

    const accuracyScore = Math.round((matchedWords.length / targetWords.length) * 100);

    let feedback = '';
    let feedbackHindi = '';

    if (accuracyScore === 100) {
      feedback = 'Outstanding pronunciation! Clear, natural, and accurate.';
      feedbackHindi = 'लाजवाब उच्चारण! एकदम साफ़ और सही बोला।';
    } else if (accuracyScore >= 80) {
      feedback = 'Great job! Very close to native pronunciation. Keep practicing!';
      feedbackHindi = 'बहुत बढ़िया! लगभग पूरा सही था। थोड़ा सा और अभ्यास करें।';
    } else if (accuracyScore >= 50) {
      feedback = `Good effort! You got ${matchedWords.length} out of ${targetWords.length} words right.`;
      feedbackHindi = `अच्छा प्रयास! आपने ${targetWords.length} में से ${matchedWords.length} शब्द सही बोले।`;
    } else {
      feedback = 'Listen to the native voice again and try speaking one word at a time.';
      feedbackHindi = 'एक बार ऑडियो दोबारा सुनें और धीरे-धीरे एक-एक शब्द बोलकर अभ्यास करें।';
    }

    return {
      targetSentence: target,
      spokenSentence: spoken,
      accuracyScore,
      matchedWords,
      missedWords,
      feedback,
      feedbackHindi,
    };
  },
};
