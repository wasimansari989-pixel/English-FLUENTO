// Gemini Live Bidirectional Real-Time Voice Client for React Native Expo
import {
  AudioModule,
  RecordingPresets,
  createAudioPlayer,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
  getRecordingPermissionsAsync,
  AudioPlayer,
  AudioRecorder,
} from 'expo-audio';
import type { AudioStream, AudioStreamBuffer } from 'expo-audio';
import { getBackendUrl, getClientId } from './aiClient';
import {
  convertPcmChunksToWavDataUri,
  uint8ArrayToBase64,
  readUriAsBase64,
  configureAudioForVoiceChat,
  createWavHeader,
} from './audioUtils';
import { searchFormulas, getFormulaById } from '../search/formulaSearch';
import { SentenceFormula } from '../types/formula';

export type LiveSessionState =
  | 'idle'
  | 'requesting_token'
  | 'connecting'
  | 'ready'
  | 'listening'
  | 'processing'
  | 'ai_speaking'
  | 'paused'
  | 'reconnecting'
  | 'ended'
  | 'error';

export interface CorrectionData {
  original: string;
  corrected: string;
  explanation: string;
  formulaId?: number | null;
  matchingFormula?: SentenceFormula | null;
}

export interface TurnMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  audioWavUri?: string;
  correction?: CorrectionData | null;
  isStreaming?: boolean;
}

export interface LiveClientCallbacks {
  onStateChange: (state: LiveSessionState, message?: string) => void;
  onTurnUpdate: (turns: TurnMessage[]) => void;
  onAudioLevelChange?: (level: number) => void;
  onError: (error: string, code?: string, textFallback?: boolean) => void;
  onQuotaUpdate?: (remainingSeconds: number, maxSessionSeconds: number) => void;
}

export interface StartSessionOptions {
  mode: 'beginner' | 'intermediate' | 'conversation';
  topic: string;
  formulaId?: number | null;
}

export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private state: LiveSessionState = 'idle';
  private callbacks: LiveClientCallbacks;

  // Real-time PCM audio streaming
  private audioStream: AudioStream | null = null;
  private audioStreamSub: { remove: () => void } | null = null;
  private fallbackRecorder: AudioRecorder | null = null;
  private currentPlayer: AudioPlayer | null = null;
  private isRecordingActive: boolean = false;
  private isMuted: boolean = false;
  private continuousMode: boolean = true;

  // Voice Activity Detection (VAD) & Audio Buffering
  private userSpokeInCurrentTurn: boolean = false;
  private consecutiveSpeechFrames: number = 0;
  private silenceSince: number = 0;
  private speechStartedAt: number = 0;
  private lastRms: number = 0;
  private currentUserPcmBuffers: Uint8Array[] = [];

  // Session metadata
  private sessionId: string | null = null;
  private sessionStartTime: number = 0;
  private sessionMaxSeconds: number = 300;
  private sessionTimer: ReturnType<typeof setInterval> | null = null;

  // Conversation turns
  private turns: TurnMessage[] = [];
  private currentModelTurnText: string = '';
  private currentModelPcmChunks: string[] = [];
  private currentUserTurnText: string = '';

  constructor(callbacks: LiveClientCallbacks) {
    this.callbacks = callbacks;
  }

  public getState(): LiveSessionState {
    return this.state;
  }

  public getTurns(): TurnMessage[] {
    return this.turns;
  }

  public setContinuousMode(enabled: boolean): void {
    this.continuousMode = enabled;
  }

  private setState(newState: LiveSessionState, message?: string): void {
    this.state = newState;
    this.callbacks.onStateChange(newState, message);
  }

  /**
   * Request microphone permissions with user-friendly handling.
   */
  public async checkOrRequestPermissions(): Promise<boolean> {
    try {
      const existingStatus = await getRecordingPermissionsAsync();
      if (existingStatus.granted) {
        return true;
      }
      const req = await requestRecordingPermissionsAsync();
      return req.granted;
    } catch (err) {
      console.warn('[GeminiLiveClient] Permission error:', err);
      return false;
    }
  }

  /**
   * Starts a real-time voice tutoring session with Gemini Live API.
   */
  public async startSession(options: StartSessionOptions): Promise<void> {
    if (this.state !== 'idle' && this.state !== 'ended' && this.state !== 'error') {
      await this.endSession();
    }

    // 1. Check microphone permissions
    const hasPermission = await this.checkOrRequestPermissions();
    if (!hasPermission) {
      this.setState('error', 'Microphone permission was denied.');
      this.callbacks.onError(
        'Microphone permission is required for real-time voice conversation. Please grant permission in Android Settings > Apps > English Formula 600 > Permissions.',
        'PERMISSION_DENIED',
        false
      );
      return;
    }

    // 2. Configure audio routing
    await configureAudioForVoiceChat();

    this.setState('requesting_token', 'Preparing secure voice session...');
    this.turns = [];
    this.callbacks.onTurnUpdate([]);

    try {
      const backendUrl = await getBackendUrl();
      const clientId = await getClientId();

      // 3. Request ephemeral token and session configuration from backend
      const tokenRes = await fetch(`${backendUrl}/api/ai/live/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: options.mode,
          topic: options.topic,
          formulaId: options.formulaId || undefined,
          clientId,
        }),
      });

      if (!tokenRes.ok) {
        const errorData = await tokenRes.json().catch(() => ({}));
        const errorMsg = errorData.error || 'Failed to start voice session.';
        this.setState('error', errorMsg);
        this.callbacks.onError(errorMsg, errorData.code, errorData.textFallbackAvailable);
        return;
      }

      const sessionConfig = await tokenRes.json();
      this.sessionId = sessionConfig.sessionId;
      this.sessionMaxSeconds = sessionConfig.sessionMaxSeconds || 300;
      this.sessionStartTime = Date.now();

      // Start duration ticker
      this._startSessionTimer();

      // 4. Establish Live WebSocket connection with ephemeral token
      this.setState('connecting', 'Connecting to Gemini Live...');
      this._connectWebSocket(sessionConfig);
    } catch (err: any) {
      console.error('[GeminiLiveClient] Failed to start session:', err);
      this.setState('error', err.message || 'Connection failed.');
      this.callbacks.onError(
        'Could not connect to the voice server. Please check your internet connection or try Text AI Teacher.',
        'NETWORK_ERROR',
        true
      );
    }
  }

  private _startSessionTimer(): void {
    if (this.sessionTimer) clearInterval(this.sessionTimer);
    this.sessionTimer = setInterval(() => {
      if (!this.sessionStartTime) return;
      const elapsed = Math.round((Date.now() - this.sessionStartTime) / 1000);
      const remaining = Math.max(0, this.sessionMaxSeconds - elapsed);

      if (this.callbacks.onQuotaUpdate) {
        this.callbacks.onQuotaUpdate(remaining, this.sessionMaxSeconds);
      }

      if (remaining <= 0) {
        this.endSession('Session duration limit reached for this session.');
      }
    }, 1000);
  }

  private _connectWebSocket(sessionConfig: any): void {
    try {
      this.ws = new WebSocket(sessionConfig.wsUrl);

      this.ws.onopen = () => {
        console.log('[GeminiLiveClient] WebSocket opened. Sending setup payload...');
        // Send initial setup frame with audio modalities and transcription
        const setupPayload = {
          setup: {
            model: sessionConfig.model,
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: sessionConfig.voiceConfig?.voiceName || 'Aoede',
                  },
                },
              },
            },
            systemInstruction: {
              parts: [{ text: sessionConfig.systemInstruction }],
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          },
        };

        this.ws?.send(JSON.stringify(setupPayload));
      };

      this.ws.onmessage = async (event) => {
        try {
          const msg = await this._parseWsMessage(event.data);
          if (msg) {
            this._handleServerMessage(msg);
          }
        } catch (msgErr) {
          console.warn('[GeminiLiveClient] Error in onmessage:', msgErr);
        }
      };

      this.ws.onerror = (err: any) => {
        console.warn('[GeminiLiveClient] WebSocket error:', err.message || err);
        if (this.state !== 'ended') {
          this.setState('error', 'Voice connection encountered an error.');
        }
      };

      this.ws.onclose = (event) => {
        console.log('[GeminiLiveClient] WebSocket closed:', event.code, event.reason);
        if (this.state !== 'ended' && this.state !== 'error') {
          this.setState('ended', 'Session closed.');
        }
      };
    } catch (err: any) {
      console.error('[GeminiLiveClient] WebSocket connection failed:', err);
      this.setState('error', err.message);
      this.callbacks.onError('Failed to open voice stream.', 'WS_INIT_FAILED', true);
    }
  }

  private async _parseWsMessage(rawData: any): Promise<any | null> {
    try {
      let jsonStr = '';
      if (typeof rawData === 'string') {
        jsonStr = rawData;
      } else if (rawData instanceof Blob || (rawData && typeof rawData === 'object' && 'size' in rawData)) {
        if (typeof (rawData as any).text === 'function') {
          jsonStr = await (rawData as any).text();
        } else {
          jsonStr = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string) || '');
            reader.onerror = () => reject(reader.error);
            reader.readAsText(rawData);
          });
        }
      } else if (rawData instanceof ArrayBuffer) {
        if (typeof TextDecoder !== 'undefined') {
          jsonStr = new TextDecoder().decode(rawData);
        } else {
          const bytes = new Uint8Array(rawData);
          let binary = '';
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          jsonStr = binary;
        }
      }

      if (!jsonStr) return null;
      return JSON.parse(jsonStr);
    } catch (err) {
      console.warn('[GeminiLiveClient] Failed to parse message JSON:', err);
      return null;
    }
  }

  private _handleServerMessage(msg: any): void {
    if (!msg || typeof msg !== 'object') return;

    try {
      // 1. Handshake completion
      if (msg.setupComplete) {
        console.log('[GeminiLiveClient] Setup complete! AI speaking tutor is ready.');
        this.setState('processing', 'AI Teacher is preparing greeting...');
        this.startListening().then(() => {
          this.setState('processing', 'AI Teacher is preparing greeting...');
          this._sendInitialGreetingTrigger();
        });
        return;
      }

      // 2. Server Content (Audio chunks, Transcripts, Completion)
      if (msg.serverContent) {
        const sc = msg.serverContent;

        // User speech transcription (live captions of what user said)
        if (sc.inputTranscription?.text) {
          const rawUserText = sc.inputTranscription.text;
          console.log('[GeminiLiveClient] User transcript from Gemini:', rawUserText);
          const cleanUserText = rawUserText
            .replace(/<no speech>/gi, '')
            .replace(/\{pause\}/gi, '')
            .trim();
          if (cleanUserText) {
            this.currentUserTurnText += (this.currentUserTurnText ? ' ' : '') + cleanUserText;
            this._updateUserTurn(this.currentUserTurnText, true);
          }
        }

        // Interruption signal (User started speaking while AI was talking)
        if (sc.interrupted) {
          console.log('[GeminiLiveClient] Interruption detected! Halting AI playback.');
          this._stopCurrentAudioPlayback();
          this.currentModelPcmChunks = [];
          this.setState('listening', 'Listening to you...');
          return;
        }

        // AI spoken response parts
        if (sc.modelTurn?.parts) {
          for (const part of sc.modelTurn.parts) {
            // Audio chunk (24kHz 16-bit PCM little-endian)
            if (part.inlineData?.data) {
              this.currentModelPcmChunks.push(part.inlineData.data);
            }
            // Text part (if present)
            if (part.text) {
              console.log('[GeminiLiveClient] Model text part:', part.text);
              this.currentModelTurnText += part.text;
            }
          }
        }

        // Output transcription (live subtitles of what AI is saying)
        if (sc.outputTranscription?.text) {
          console.log('[GeminiLiveClient] Model output transcript:', sc.outputTranscription.text);
          this.currentModelTurnText += sc.outputTranscription.text;
          this._updateModelTurn(this.currentModelTurnText, true);
        }

        // Turn complete (Gemini finished generating its turn)
        if (sc.turnComplete) {
          console.log('[GeminiLiveClient] Turn complete! Playing response audio...');
          this._finalizeTurn();
        }
      }
    } catch (err) {
      console.warn('[GeminiLiveClient] Error parsing server message:', err);
    }
  }

  /**
   * Prompts the AI tutor to greet the learner first to break the ice.
   */
  private _sendInitialGreetingTrigger(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const triggerMsg = {
      clientContent: {
        turns: [
          {
            role: 'user',
            parts: [{ text: 'Hello! I am ready to start my English speaking practice.' }],
          },
        ],
        turnComplete: true,
      },
    };
    this.setState('processing', 'AI Teacher is preparing greeting...');
    this.ws.send(JSON.stringify(triggerMsg));
  }

  private _updateUserTurn(text: string, isStreaming: boolean): void {
    const cleanText = text
      .replace(/<no speech>/gi, '')
      .replace(/\{pause\}/gi, '')
      .trim();

    if (!cleanText) return;

    const lastTurn = this.turns[this.turns.length - 1];
    if (lastTurn && lastTurn.role === 'user') {
      lastTurn.text = cleanText;
      lastTurn.isStreaming = isStreaming;
      this.callbacks.onTurnUpdate([...this.turns]);
    } else {
      const newTurn: TurnMessage = {
        id: `turn_u_${Date.now()}`,
        role: 'user',
        text: cleanText,
        timestamp: Date.now(),
        isStreaming,
      };
      this.turns.push(newTurn);
      this.callbacks.onTurnUpdate([...this.turns]);
    }
  }

  private _updateModelTurn(text: string, isStreaming: boolean): void {
    const displayCleanText = text
      .replace(/\[\[CORRECTION:[\s\S]*?\]\]/g, '')
      .replace(/<no speech>/gi, '')
      .replace(/\{pause\}/gi, '')
      .replace(/\*still waiting[^*]*\*/gi, '')
      .trim();

    if (!displayCleanText) return;

    const lastTurn = this.turns[this.turns.length - 1];
    if (lastTurn && lastTurn.role === 'model') {
      lastTurn.text = displayCleanText;
      lastTurn.isStreaming = isStreaming;
      this.callbacks.onTurnUpdate([...this.turns]);
    } else {
      const newTurn: TurnMessage = {
        id: `turn_m_${Date.now()}`,
        role: 'model',
        text: displayCleanText,
        timestamp: Date.now(),
        isStreaming,
      };
      this.turns.push(newTurn);
      this.callbacks.onTurnUpdate([...this.turns]);
    }
  }

  private async _finalizeTurn(): Promise<void> {
    const rawFullText = this.currentModelTurnText;
    const correction = this._extractCorrectionData(rawFullText);

    const cleanText = rawFullText
      .replace(/\[\[CORRECTION:[\s\S]*?\]\]/g, '')
      .replace(/<no speech>/gi, '')
      .replace(/\{pause\}/gi, '')
      .trim();

    const lastTurn = this.turns[this.turns.length - 1];
    if (lastTurn && lastTurn.role === 'model') {
      lastTurn.text = cleanText || 'Great! Please go ahead.';
      lastTurn.isStreaming = false;
      lastTurn.correction = correction;
    }

    this.callbacks.onTurnUpdate([...this.turns]);

    // Assemble and play 24kHz audio chunks as Data URI
    if (this.currentModelPcmChunks.length > 0) {
      try {
        this.setState('ai_speaking', 'AI Teacher is speaking...');
        const wavUri = convertPcmChunksToWavDataUri(this.currentModelPcmChunks, 24000);
        if (lastTurn && lastTurn.role === 'model') {
          lastTurn.audioWavUri = wavUri;
        }

        await this._playWavAudio(wavUri);
      } catch (playErr) {
        console.warn('[GeminiLiveClient] Error playing output audio:', playErr);
        this._prepareNextListeningTurn();
      }
    } else {
      this._prepareNextListeningTurn();
    }

    // Reset turn buffers
    this.currentModelTurnText = '';
    this.currentModelPcmChunks = [];
    this.currentUserTurnText = '';
  }

  private _extractCorrectionData(text: string): CorrectionData | null {
    const match = text.match(/\[\[CORRECTION:\s*original="([^"]*)"\s*\|\s*corrected="([^"]*)"\s*\|\s*explanation="([^"]*)"(?:\s*\|\s*formulaId="([^"]*)")?\]\]/);
    if (!match) return null;

    const original = match[1]?.trim() || '';
    const corrected = match[2]?.trim() || '';
    const explanation = match[3]?.trim() || '';
    const formulaIdStr = match[4]?.trim();
    const formulaId = formulaIdStr && formulaIdStr !== 'null' ? parseInt(formulaIdStr, 10) : null;

    let matchingFormula: SentenceFormula | null = null;
    if (formulaId && Number.isFinite(formulaId)) {
      matchingFormula = getFormulaById(formulaId) || null;
    }

    if (!matchingFormula && corrected) {
      const candidates = searchFormulas({ query: corrected, limit: 1 });
      if (candidates.length > 0) {
        matchingFormula = candidates[0];
      }
    }

    return {
      original,
      corrected,
      explanation,
      formulaId: matchingFormula ? matchingFormula.id : formulaId,
      matchingFormula,
    };
  }

  private _playWavAudio(wavUri: string): Promise<void> {
    return new Promise((resolve) => {
      this._stopCurrentAudioPlayback();

      try {
        const player = createAudioPlayer(wavUri);
        this.currentPlayer = player;

        player.addListener('playbackStatusUpdate', (status) => {
          if (status.didJustFinish) {
            try {
              player.remove();
            } catch {}
            this.currentPlayer = null;
            this._prepareNextListeningTurn();
            resolve();
          }
        });

        player.play();
      } catch (err) {
        console.warn('[GeminiLiveClient] Playback error:', err);
        this._prepareNextListeningTurn();
        resolve();
      }
    });
  }

  private _stopCurrentAudioPlayback(): void {
    if (this.currentPlayer) {
      try {
        this.currentPlayer.pause();
        this.currentPlayer.remove();
      } catch {}
      this.currentPlayer = null;
    }
  }

  private _prepareNextListeningTurn(): void {
    if (this.state === 'ended' || this.state === 'error' || this.isMuted) return;

    // 350ms delay to let device physical speaker echo clear before capturing mic
    setTimeout(() => {
      if (this.state === 'ended' || this.state === 'error' || this.isMuted) return;

      console.log('[GeminiLiveClient] AI finished speaking. Opening microphone for user speech...');
      this.currentUserPcmBuffers = [];
      this.userSpokeInCurrentTurn = false;
      this.consecutiveSpeechFrames = 0;
      this.silenceSince = 0;
      this.speechStartedAt = 0;
      this.currentUserTurnText = '';
      this.setState('listening', 'Listening to you... Speak English naturally.');

      if (!this.audioStream || !this.isRecordingActive) {
        this.startListening();
      }
    }, 350);
  }

  /**
   * Starts capturing real-time PCM audio from microphone using expo-audio AudioStream.
   */
  public async startListening(): Promise<void> {
    if (this.state === 'ended' || this.state === 'error' || this.isMuted) return;

    try {
      this._stopCurrentAudioPlayback();

      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
        shouldRouteThroughEarpiece: false,
      });

      // Use AudioStream for direct 16kHz 16-bit PCM streaming
      if (!this.audioStream) {
        this.audioStream = new AudioModule.AudioStream({
          sampleRate: 16000,
          channels: 1,
          encoding: 'int16',
        });

        this.audioStreamSub = this.audioStream.addListener('audioStreamBuffer', (buffer: AudioStreamBuffer) => {
          this._handleIncomingPcmBuffer(buffer);
        });
      }

      if (!this.isRecordingActive) {
        await this.audioStream.start();
        this.isRecordingActive = true;
      }

      this.currentUserPcmBuffers = [];
      this.userSpokeInCurrentTurn = false;
      this.consecutiveSpeechFrames = 0;
      this.silenceSince = 0;
      this.speechStartedAt = 0;
      this.currentUserTurnText = '';
      this.setState('listening', 'Listening to you... Speak English naturally.');
    } catch (err: any) {
      console.warn('[GeminiLiveClient] AudioStream start failed, attempting fallback recorder:', err);
      this._startFallbackRecorder();
    }
  }

  /**
   * Handles incoming PCM audio buffer from device microphone.
   */
  private _handleIncomingPcmBuffer(buffer: AudioStreamBuffer): void {
    // Only capture user speech when state is 'listening'
    // This strictly prevents speaker echo while AI is talking or thinking
    if (!this.isRecordingActive || this.state !== 'listening' || this.isMuted) {
      return;
    }

    if (!buffer.data || buffer.data.byteLength === 0) return;

    // 1. Calculate RMS volume for audio level visualizer & VAD
    const pcm16 = new Int16Array(buffer.data);
    let sum = 0;
    for (let i = 0; i < pcm16.length; i++) {
      sum += pcm16[i] * pcm16[i];
    }
    const rms = Math.sqrt(sum / pcm16.length);
    this.lastRms = rms;
    if (Math.random() < 0.05) {
      console.log('[GeminiLiveClient] Buffer sampleRate:', buffer.sampleRate, 'channels:', buffer.channels, 'bytes:', buffer.data.byteLength, 'RMS:', Math.round(rms));
    }

    if (this.callbacks.onAudioLevelChange) {
      this.callbacks.onAudioLevelChange(Math.min(1, rms / 4000));
    }

    // Accumulate raw PCM buffers:
    // If user has not started speaking yet, maintain only the last 4 buffers (~400ms pre-roll)
    // so we don't accumulate minutes of silence, while ensuring the start of speech isn't clipped.
    if (!this.userSpokeInCurrentTurn) {
      this.currentUserPcmBuffers.push(new Uint8Array(buffer.data));
      if (this.currentUserPcmBuffers.length > 4) {
        this.currentUserPcmBuffers.shift();
      }
    } else {
      this.currentUserPcmBuffers.push(new Uint8Array(buffer.data));
    }

    // 2. Client-Side Voice Activity Detection (VAD)
    // Human voice: RMS 2000 - 9000.
    // Background noise: RMS 400 - 1400.
    const SPEECH_RMS_THRESHOLD = 1800;
    const SILENCE_RMS_THRESHOLD = 1400;
    const PAUSE_DURATION_MS = 1400;

    if (rms >= SPEECH_RMS_THRESHOLD) {
      this.consecutiveSpeechFrames++;
      if (this.consecutiveSpeechFrames >= 2) {
        if (!this.userSpokeInCurrentTurn) {
          console.log('[GeminiLiveClient] User speech started! RMS:', Math.round(rms));
          this.userSpokeInCurrentTurn = true;
          this.speechStartedAt = Date.now();
          this.setState('listening', 'Listening to you... Keep speaking 🎙️');
        }
        this.silenceSince = 0;
      }
    } else if (rms < SILENCE_RMS_THRESHOLD) {
      if (this.userSpokeInCurrentTurn) {
        if (this.silenceSince === 0) {
          this.silenceSince = Date.now();
        } else if (Date.now() - this.silenceSince > PAUSE_DURATION_MS) {
          console.log('[GeminiLiveClient] Natural pause (1.4s after speaking). Completing user turn...');
          this._triggerTurnCompletion();
        }
      } else {
        this.consecutiveSpeechFrames = 0;
      }
    }

    // Max continuous speech safety cap (7 seconds)
    if (this.userSpokeInCurrentTurn && this.speechStartedAt && Date.now() - this.speechStartedAt > 7000) {
      console.log('[GeminiLiveClient] Max speech duration reached (7s). Completing user turn...');
      this._triggerTurnCompletion();
    }
  }

  /**
   * Signals Gemini Live that the user's spoken turn is complete.
   */
  public triggerTurnCompletion(): void {
    this._triggerTurnCompletion();
  }

  private async _triggerTurnCompletion(): Promise<void> {
    const buffers = [...this.currentUserPcmBuffers];
    this.currentUserPcmBuffers = [];
    this.userSpokeInCurrentTurn = false;
    this.consecutiveSpeechFrames = 0;
    this.silenceSince = 0;
    this.speechStartedAt = 0;

    let totalLen = 0;
    for (const b of buffers) totalLen += b.length;

    // Need at least 200ms of audio (6400 bytes at 16kHz 16-bit mono)
    if (totalLen < 6400) {
      console.log('[GeminiLiveClient] Audio buffer too short, staying in listening state.');
      return;
    }

    this.setState('processing', 'AI Teacher is listening & thinking...');

    try {
      // 1. Merge PCM buffers into a standard 16kHz 16-bit Mono WAV
      const pcmMerged = new Uint8Array(totalLen);
      let offset = 0;
      for (const b of buffers) {
        pcmMerged.set(b, offset);
        offset += b.length;
      }
      const header = createWavHeader(totalLen, 16000, 1, 16);
      const fullWav = new Uint8Array(header.length + totalLen);
      fullWav.set(header, 0);
      fullWav.set(pcmMerged, header.length);

      const wavBase64 = uint8ArrayToBase64(fullWav);
      const backendUrl = await getBackendUrl();

      // 2. High-speed speech transcription via Whisper (<150ms)
      const res = await fetch(`${backendUrl}/api/ai/live/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64: wavBase64 }),
      });

      if (!res.ok) {
        throw new Error(`Transcribe failed with HTTP ${res.status}`);
      }

      const data = await res.json();
      const transcribedText = (data.text || '').trim();

      if (!transcribedText) {
        console.log('[GeminiLiveClient] Empty transcription, returning to listening.');
        this.setState('listening', 'Could not hear clearly. Please speak again 🎙️');
        return;
      }

      console.log('[GeminiLiveClient] User said:', transcribedText);
      // 3. Immediately display user turn in UI
      this._updateUserTurn(transcribedText, false);

      // 4. Send turn to Gemini Live WebSocket
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        console.log('[GeminiLiveClient] Sending user turn to Gemini Live WebSocket...');
        this.ws.send(JSON.stringify({
          clientContent: {
            turns: [
              {
                role: 'user',
                parts: [{ text: transcribedText }],
              },
            ],
            turnComplete: true,
          },
        }));
      } else {
        console.warn('[GeminiLiveClient] WebSocket closed, cannot send turn.');
        this.setState('error', 'Voice connection lost. Tap mic to reconnect.');
      }
    } catch (err: any) {
      console.warn('[GeminiLiveClient] Error in turn completion:', err);
      this.setState('listening', 'Listening to you... Speak English naturally.');
    }
  }

  /**
   * Fallback for devices where AudioStream native module encounters an issue.
   */
  private async _startFallbackRecorder(): Promise<void> {
    try {
      const recorder = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY);
      await recorder.prepareToRecordAsync();
      recorder.record();
      this.fallbackRecorder = recorder;
      this.isRecordingActive = true;
      this.setState('listening', 'Listening (Tap mic when done speaking)');
    } catch (fallbackErr) {
      console.error('[GeminiLiveClient] Fallback recorder failed:', fallbackErr);
      this.setState('ready', 'Could not open microphone. Please tap mic to retry.');
    }
  }

  /**
   * Manual tap action: if listening, finishes user turn; if ai speaking, interrupts.
   */
  public async stopListeningAndSend(): Promise<void> {
    if (this.state === 'ai_speaking') {
      this._stopCurrentAudioPlayback();
      this.startListening();
      return;
    }

    if (this.audioStream && this.isRecordingActive) {
      this._triggerTurnCompletion();
      return;
    }

    if (this.fallbackRecorder && this.isRecordingActive) {
      this.isRecordingActive = false;
      this.setState('processing', 'Processing your speech...');
      try {
        const rec = this.fallbackRecorder;
        this.fallbackRecorder = null;
        await rec.stop();
        const uri = rec.uri;
        if (uri && this.ws && this.ws.readyState === WebSocket.OPEN) {
          const base64Audio = await readUriAsBase64(uri);
          this.ws.send(JSON.stringify({
            realtimeInput: {
              mediaChunks: [{ mimeType: 'audio/mp4', data: base64Audio }],
            },
          }));
          this.ws.send(JSON.stringify({ clientContent: { turnComplete: true } }));
        }
      } catch (e) {
        console.warn('[GeminiLiveClient] Fallback send error:', e);
      }
    }
  }

  /**
   * Replays the audio from a specific AI turn.
   */
  public async replayTurnAudio(turnId: string): Promise<void> {
    const turn = this.turns.find((t) => t.id === turnId);
    if (!turn || !turn.audioWavUri) return;

    this._stopCurrentAudioPlayback();
    await this._playWavAudio(turn.audioWavUri);
  }

  /**
   * Toggles mute/pause state.
   */
  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      if (this.audioStream && this.isRecordingActive) {
        try { this.audioStream.stop(); } catch {}
        this.isRecordingActive = false;
      }
      this.setState('paused', 'Microphone paused.');
    } else {
      this.setState('ready', 'Microphone active.');
      this.startListening();
    }
    return this.isMuted;
  }

  /**
   * Ends the live conversation, cleans up audio streams, and reports usage duration.
   */
  public async endSession(reason?: string): Promise<void> {
    this._stopCurrentAudioPlayback();

    if (this.sessionTimer) {
      clearInterval(this.sessionTimer);
      this.sessionTimer = null;
    }

    if (this.audioStream) {
      try {
        this.audioStream.stop();
      } catch {}
      if (this.audioStreamSub) {
        try { this.audioStreamSub.remove(); } catch {}
        this.audioStreamSub = null;
      }
      this.audioStream = null;
    }

    if (this.fallbackRecorder) {
      try {
        await this.fallbackRecorder.stop();
      } catch {}
      this.fallbackRecorder = null;
    }

    this.isRecordingActive = false;
    this.userSpokeInCurrentTurn = false;
    this.silenceSince = 0;

    const elapsedSeconds = this.sessionStartTime
      ? Math.max(1, Math.round((Date.now() - this.sessionStartTime) / 1000))
      : 0;

    // Report usage to backend
    if (this.sessionId && elapsedSeconds > 0) {
      getBackendUrl()
        .then((url) => {
          fetch(`${url}/api/ai/live/report-usage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: this.sessionId,
              durationSeconds: elapsedSeconds,
            }),
          }).catch(() => {});
        })
        .catch(() => {});
    }

    if (this.ws) {
      this.ws.close(1000, 'User ended session');
      this.ws = null;
    }

    this.sessionId = null;
    this.sessionStartTime = 0;
    this.setState('ended', reason || 'Session ended. Good job practicing!');
  }
}
