import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  Platform,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, radii } from '../src/theme';
import {
  GeminiLiveClient,
  LiveSessionState,
  TurnMessage,
  CorrectionData,
} from '../src/services/geminiLiveClient';
import { AIClient } from '../src/services/aiClient';
import { getFormulaById } from '../src/search/formulaSearch';
import { HighlightedSentence } from '../src/components/HighlightedSentence';
import { SentenceSegment } from '../src/types/formula';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TopicItem {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  hindiDesc: string;
}

const TOPICS: TopicItem[] = [
  { id: 'daily_life', title: 'Daily Life', icon: 'sunny-outline', hindiDesc: 'रोज़मर्रा की बातचीत' },
  { id: 'self_intro', title: 'Self Intro', icon: 'person-outline', hindiDesc: 'अपना परिचय देना' },
  { id: 'kitchen', title: 'Kitchen', icon: 'flame-outline', hindiDesc: 'रसोई और खाना' },
  { id: 'ordering_food', title: 'Ordering Food', icon: 'restaurant-outline', hindiDesc: 'होटल और खाना' },
  { id: 'shopping', title: 'Shopping', icon: 'cart-outline', hindiDesc: 'दुकान और बाज़ार' },
  { id: 'travel', title: 'Travel', icon: 'airplane-outline', hindiDesc: 'सफर और टिकट' },
  { id: 'friends_family', title: 'Friends & Family', icon: 'people-outline', hindiDesc: 'दोस्त और परिवार' },
  { id: 'job_interview', title: 'Job Interview', icon: 'briefcase-outline', hindiDesc: 'इंटरव्यू की तैयारी' },
  { id: 'office', title: 'Office Talk', icon: 'business-outline', hindiDesc: 'ऑफिस और काम' },
  { id: 'directions', title: 'Directions', icon: 'navigate-outline', hindiDesc: 'रास्ता पूछना' },
  { id: 'free', title: 'Free Talk', icon: 'chatbubbles-outline', hindiDesc: 'खुली बातचीत' },
];

export default function TalkToAIScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ formulaId?: string; mode?: string }>();

  // Configuration state
  const [selectedMode, setSelectedMode] = useState<'beginner' | 'intermediate' | 'conversation'>(
    (params.mode as any) || 'beginner'
  );
  const [selectedTopic, setSelectedTopic] = useState<string>('daily_life');
  const contextFormulaId = params.formulaId ? parseInt(params.formulaId, 10) : null;
  const contextFormula = contextFormulaId ? getFormulaById(contextFormulaId) : null;

  // Session state
  const [sessionState, setSessionState] = useState<LiveSessionState>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('Choose a topic and start speaking!');
  const [turns, setTurns] = useState<TurnMessage[]>([]);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [continuousMode, setContinuousMode] = useState<boolean>(true);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(600);
  const [totalDailySeconds, setTotalDailySeconds] = useState<number>(600);
  const [usedTodaySeconds, setUsedTodaySeconds] = useState<number>(0);
  const [showTranscripts, setShowTranscripts] = useState<boolean>(true);

  // Custom Notice / Alert Modal State
  const [noticeModal, setNoticeModal] = useState<{
    visible: boolean;
    type: 'quota_limit' | 'confirm_exit' | 'network_error';
    title: string;
    badge: string;
    message: string;
    hindiDetail?: string;
    statMinutesUsed?: number;
    statTotalMinutes?: number;
    primaryActionText?: string;
    onPrimaryAction?: () => void;
    secondaryActionText?: string;
    onSecondaryAction?: () => void;
  }>({
    visible: false,
    type: 'quota_limit',
    title: '',
    badge: '',
    message: '',
  });

  // Animated values for the living AI Voice Orb
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const rippleAnim1 = useRef(new Animated.Value(1)).current;
  const rippleOpacity1 = useRef(new Animated.Value(0.7)).current;
  const rippleAnim2 = useRef(new Animated.Value(1)).current;
  const rippleOpacity2 = useRef(new Animated.Value(0.7)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const buttonPressScale = useRef(new Animated.Value(1)).current;

  // 5 Equalizer Bars for animated soundwaves
  const barAnim1 = useRef(new Animated.Value(10)).current;
  const barAnim2 = useRef(new Animated.Value(16)).current;
  const barAnim3 = useRef(new Animated.Value(24)).current;
  const barAnim4 = useRef(new Animated.Value(16)).current;
  const barAnim5 = useRef(new Animated.Value(10)).current;

  const modalScaleAnim = useRef(new Animated.Value(0.85)).current;
  const modalFadeAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<any>(null);
  const clientRef = useRef<GeminiLiveClient | null>(null);

  // Fetch initial voice quota from backend
  const loadQuota = async () => {
    try {
      const quota = await AIClient.getVoiceQuota();
      if (quota) {
        if (typeof quota.dailySecondsLimit === 'number' && quota.dailySecondsLimit > 0) {
          setTotalDailySeconds(quota.dailySecondsLimit);
        }
        if (typeof quota.usedTodaySeconds === 'number') {
          setUsedTodaySeconds(quota.usedTodaySeconds);
        }
        if (typeof quota.remainingTodaySeconds === 'number') {
          setRemainingSeconds(quota.remainingTodaySeconds);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch voice quota:', e);
    }
  };

  useEffect(() => {
    loadQuota();
  }, []);

  // Continuous subtle cosmic rotation
  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 9000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  // Multi-layered pulsing ripples for the Voice Orb
  useEffect(() => {
    const wave1 = Animated.loop(
      Animated.parallel([
        Animated.timing(rippleAnim1, {
          toValue: 2.3,
          duration: 1800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(rippleOpacity1, {
          toValue: 0,
          duration: 1800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    let wave2: Animated.CompositeAnimation | null = null;
    const wave2Timer = setTimeout(() => {
      wave2 = Animated.loop(
        Animated.parallel([
          Animated.timing(rippleAnim2, {
            toValue: 1.8,
            duration: 1800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(rippleOpacity2, {
            toValue: 0,
            duration: 1800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      wave2.start();
    }, 600);

    wave1.start();
    return () => {
      wave1.stop();
      wave2?.stop();
      clearTimeout(wave2Timer);
    };
  }, []);

  // Dynamic Sound Equalizer Waveform Animation
  useEffect(() => {
    let eqAnim: Animated.CompositeAnimation | null = null;

    if (sessionState === 'ai_speaking') {
      // Dynamic rhythmic music-like wave for AI Voice
      eqAnim = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(barAnim1, { toValue: 26, duration: 240, useNativeDriver: false }),
            Animated.timing(barAnim1, { toValue: 8, duration: 280, useNativeDriver: false }),
          ]),
          Animated.sequence([
            Animated.timing(barAnim2, { toValue: 38, duration: 210, useNativeDriver: false }),
            Animated.timing(barAnim2, { toValue: 12, duration: 320, useNativeDriver: false }),
          ]),
          Animated.sequence([
            Animated.timing(barAnim3, { toValue: 48, duration: 280, useNativeDriver: false }),
            Animated.timing(barAnim3, { toValue: 16, duration: 240, useNativeDriver: false }),
          ]),
          Animated.sequence([
            Animated.timing(barAnim4, { toValue: 36, duration: 230, useNativeDriver: false }),
            Animated.timing(barAnim4, { toValue: 10, duration: 290, useNativeDriver: false }),
          ]),
          Animated.sequence([
            Animated.timing(barAnim5, { toValue: 24, duration: 260, useNativeDriver: false }),
            Animated.timing(barAnim5, { toValue: 7, duration: 300, useNativeDriver: false }),
          ]),
        ])
      );
      eqAnim.start();
    } else if (sessionState === 'listening') {
      // Gentle ready wave when listening
      eqAnim = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(barAnim1, { toValue: 16, duration: 420, useNativeDriver: false }),
            Animated.timing(barAnim1, { toValue: 8, duration: 420, useNativeDriver: false }),
          ]),
          Animated.sequence([
            Animated.timing(barAnim2, { toValue: 26, duration: 380, useNativeDriver: false }),
            Animated.timing(barAnim2, { toValue: 10, duration: 380, useNativeDriver: false }),
          ]),
          Animated.sequence([
            Animated.timing(barAnim3, { toValue: 34, duration: 340, useNativeDriver: false }),
            Animated.timing(barAnim3, { toValue: 14, duration: 340, useNativeDriver: false }),
          ]),
          Animated.sequence([
            Animated.timing(barAnim4, { toValue: 24, duration: 390, useNativeDriver: false }),
            Animated.timing(barAnim4, { toValue: 10, duration: 390, useNativeDriver: false }),
          ]),
          Animated.sequence([
            Animated.timing(barAnim5, { toValue: 14, duration: 430, useNativeDriver: false }),
            Animated.timing(barAnim5, { toValue: 7, duration: 430, useNativeDriver: false }),
          ]),
        ])
      );
      eqAnim.start();
    } else {
      // Idle resting wave
      Animated.parallel([
        Animated.timing(barAnim1, { toValue: 6, duration: 250, useNativeDriver: false }),
        Animated.timing(barAnim2, { toValue: 10, duration: 250, useNativeDriver: false }),
        Animated.timing(barAnim3, { toValue: 14, duration: 250, useNativeDriver: false }),
        Animated.timing(barAnim4, { toValue: 10, duration: 250, useNativeDriver: false }),
        Animated.timing(barAnim5, { toValue: 6, duration: 250, useNativeDriver: false }),
      ]).start();
    }

    return () => {
      eqAnim?.stop();
    };
  }, [sessionState]);

  // Core Orb breathing pulse
  useEffect(() => {
    let anim: Animated.CompositeAnimation | null = null;
    if (sessionState === 'listening' || sessionState === 'ai_speaking') {
      anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.18,
            duration: 750,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 750,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      anim.start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 0.95,
            duration: 750,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.45,
            duration: 750,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
      glowAnim.setValue(0.45);
    }

    return () => {
      anim?.stop();
    };
  }, [sessionState]);

  // Animate custom modal appearance
  useEffect(() => {
    if (noticeModal.visible) {
      modalScaleAnim.setValue(0.85);
      modalFadeAnim.setValue(0);
      Animated.parallel([
        Animated.spring(modalScaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.timing(modalFadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [noticeModal.visible]);

  // Initialize client
  useEffect(() => {
    const client = new GeminiLiveClient({
      onStateChange: (state, message) => {
        setSessionState(state);
        if (message) setStatusMessage(message);
      },
      onTurnUpdate: (updatedTurns) => {
        setTurns(updatedTurns);
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 120);
      },
      onAudioLevelChange: (level) => {
        setAudioLevel(level);
      },
      onError: (errMsg, code, textFallback) => {
        if (textFallback || code === 'DAILY_LIMIT_EXCEEDED' || code === 'MAX_CONCURRENT_EXCEEDED') {
          setNoticeModal({
            visible: true,
            type: 'quota_limit',
            badge: '⚡ DAILY VOICE QUOTA REACHED',
            title: 'Daily Voice Practice Complete 🎙️',
            message: 'Aaj ka 10-Minute voice practice quota pura ho gaya hai!',
            hindiDetail:
              'Aapki English learning nahi rukegi! Text AI Teacher se 600 formulas, grammar doubts aur sentences ki unlimited practice continue karein.',
            statMinutesUsed: 10,
            statTotalMinutes: 10,
            primaryActionText: 'Switch to Text AI Teacher 💬',
            onPrimaryAction: () => {
              setNoticeModal((prev) => ({ ...prev, visible: false }));
              router.push('/ai-teacher');
            },
            secondaryActionText: 'Theek Hai, Samajh Gaya',
            onSecondaryAction: () => {
              setNoticeModal((prev) => ({ ...prev, visible: false }));
            },
          });
        } else if (code === 'PERMISSION_DENIED') {
          setNoticeModal({
            visible: true,
            type: 'network_error',
            badge: '🎙️ MICROPHONE REQUIRED',
            title: 'Microphone Permission Chahiye',
            message: 'Real-time English bolne ke liye microphone access zaroori hai.',
            hindiDetail: 'Kripya Settings me jakar English Formula 600 app ko Microphone permission allow karein.',
            primaryActionText: 'Theek Hai',
            onPrimaryAction: () => {
              setNoticeModal((prev) => ({ ...prev, visible: false }));
            },
          });
        } else {
          setNoticeModal({
            visible: true,
            type: 'network_error',
            badge: '📶 VOICE ASSISTANT NOTICE',
            title: 'Voice Connection Notice',
            message: errMsg || 'Voice server se connect nahi ho saka.',
            hindiDetail: 'Kripya apna internet connection check karein ya 1 minute baad dubara try karein.',
            primaryActionText: 'Got It / Samajh Gaya',
            onPrimaryAction: () => {
              setNoticeModal((prev) => ({ ...prev, visible: false }));
            },
          });
        }
      },
      onQuotaUpdate: (rem) => {
        setRemainingSeconds(rem);
        setUsedTodaySeconds((prev) => {
          const calculatedUsed = Math.max(0, totalDailySeconds - rem);
          return Math.max(prev, calculatedUsed);
        });
      },
    });

    clientRef.current = client;

    return () => {
      client.endSession();
    };
  }, [totalDailySeconds]);

  const handleStartSession = async () => {
    if (!clientRef.current) return;
    clientRef.current.setContinuousMode(continuousMode);
    await clientRef.current.startSession({
      mode: selectedMode,
      topic: selectedTopic,
      formulaId: contextFormulaId,
    });
  };

  const handleEndSession = async () => {
    if (!clientRef.current) return;
    await clientRef.current.endSession();
    setTimeout(() => {
      loadQuota();
    }, 400);
  };

  const handleMicPress = async () => {
    if (!clientRef.current) return;

    // Tactile button bounce
    Animated.sequence([
      Animated.timing(buttonPressScale, { toValue: 0.88, duration: 100, useNativeDriver: true }),
      Animated.spring(buttonPressScale, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }),
    ]).start();

    if (sessionState === 'idle' || sessionState === 'ended' || sessionState === 'error') {
      handleStartSession();
    } else if (sessionState === 'listening') {
      // User tapped mic while listening -> manually stop and send
      await clientRef.current.stopListeningAndSend();
    } else if (sessionState === 'ready') {
      await clientRef.current.startListening();
    } else if (sessionState === 'ai_speaking') {
      // Interruption: tap mic to interrupt AI and talk
      await clientRef.current.startListening();
    }
  };

  const handleToggleMute = () => {
    if (!clientRef.current) return;
    const muted = clientRef.current.toggleMute();
    setIsMuted(muted);
  };

  const handleReplayTurn = (turnId: string) => {
    clientRef.current?.replayTurnAudio(turnId);
  };

  const formatTime = (secs: number) => {
    if (secs >= 3600) {
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      const s = secs % 60;
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatFriendlyDuration = (secs: number) => {
    if (secs <= 0) return '0s';
    if (secs < 60) return `${secs}s`;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return s > 0 ? `${m}m ${s}s` : `${m} Min`;
  };

  const formatFriendlyMinutes = (secs: number) => {
    const m = Math.round(secs / 60);
    return `${m} Min`;
  };

  const isInSession =
    sessionState === 'connecting' ||
    sessionState === 'ready' ||
    sessionState === 'listening' ||
    sessionState === 'processing' ||
    sessionState === 'ai_speaking' ||
    sessionState === 'paused';

  // Dynamic colors for the living AI Voice Orb based on current state (Reference Style)
  const getOrbGradientColors = (): [string, string, ...string[]] => {
    switch (sessionState) {
      case 'listening':
        return ['#D4FF00', '#C4EC00', '#22C55E'];
      case 'ai_speaking':
        return ['#FEFEFE', '#C9A6D8', '#8B7CF8'];
      case 'processing':
        return ['#8B7CF8', '#C9A6D8', '#D4FF00'];
      case 'connecting':
        return ['#8B7CF8', '#D4FF00', '#38BDF8'];
      default:
        return ['#121212', '#1E1E1E', '#252525'];
    }
  };

  const getEqualizerBarColor = (): string => {
    switch (sessionState) {
      case 'listening':
        return '#D4FF00';
      case 'ai_speaking':
        return '#C9A6D8';
      case 'processing':
        return '#8B7CF8';
      default:
        return 'rgba(255, 255, 255, 0.3)';
    }
  };

  const getRippleBorderColor = (): string => {
    switch (sessionState) {
      case 'listening':
        return 'rgba(212, 255, 0, 0.5)';
      case 'ai_speaking':
        return 'rgba(201, 166, 216, 0.5)';
      case 'processing':
        return 'rgba(139, 124, 248, 0.4)';
      default:
        return 'rgba(255, 255, 255, 0.15)';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      {/* TOP ELEVATED LIGHT HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (isInSession) {
              setNoticeModal({
                visible: true,
                type: 'confirm_exit',
                badge: '⚠️ ACTIVE VOICE CALL',
                title: 'End Practice Session?',
                message: 'Kya aap conversation band karke bahar jana chahte hain?',
                hindiDetail: 'Session band hone par AI Voice connection disconnect ho jayega.',
                primaryActionText: 'End & Leave 🚪',
                onPrimaryAction: async () => {
                  setNoticeModal((prev) => ({ ...prev, visible: false }));
                  await handleEndSession();
                  router.back();
                },
                secondaryActionText: 'Stay & Practice 🎙️',
                onSecondaryAction: () => {
                  setNoticeModal((prev) => ({ ...prev, visible: false }));
                },
              });
            } else {
              router.back();
            }
          }}
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={22} color="#111114" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="sparkles" size={14} color="#7C3AED" />
            <Text style={styles.headerTitle}>AI Speaking Teacher</Text>
          </View>
          <View style={styles.headerSubRow}>
            <View
              style={[
                styles.statusDot,
                sessionState === 'listening'
                  ? styles.statusDotListening
                  : sessionState === 'ai_speaking'
                    ? styles.statusDotSpeaking
                    : sessionState === 'processing'
                      ? styles.statusDotProcessing
                      : isInSession
                        ? styles.statusDotActive
                        : styles.statusDotIdle,
              ]}
            />
            <Text style={styles.headerStatusText}>
              {sessionState === 'listening'
                ? 'Listening to you 🎙️'
                : sessionState === 'ai_speaking'
                  ? 'AI Speaking 🔊'
                  : sessionState === 'processing'
                    ? 'Thinking...'
                    : sessionState === 'connecting'
                      ? 'Connecting...'
                      : isInSession
                        ? 'Connected'
                        : 'Offline'}
            </Text>
          </View>
        </View>

        {/* Monospace Countdown Timer Pill */}
        <View style={[styles.timerPill, remainingSeconds <= 60 && styles.timerPillLow]}>
          <Ionicons
            name="hourglass-outline"
            size={13}
            color={remainingSeconds <= 60 ? '#DC2626' : '#15803D'}
          />
          <Text style={[styles.timerText, remainingSeconds <= 60 && styles.timerTextLow]}>
            {formatTime(remainingSeconds)} left
          </Text>
        </View>
      </View>

      {/* CONTEXT FORMULA BANNER (if launched from a specific formula) */}
      {contextFormula && (
        <View style={styles.contextFormulaBanner}>
          <View style={styles.contextBadge}>
            <Text style={styles.contextBadgeText}>FORMULA #{contextFormula.id}</Text>
          </View>
          <Text style={styles.contextFormulaText} numberOfLines={1}>
            {contextFormula.englishFormula} ({contextFormula.hindiMeaning})
          </Text>
        </View>
      )}

      {/* MAIN VIEW: SETUP OR CONVERSATION */}
      {!isInSession && turns.length === 0 ? (
        // PRE-SESSION SETUP VIEW
        <ScrollView style={styles.setupScroll} contentContainerStyle={styles.setupContent} showsVerticalScrollIndicator={false}>
          {/* Elevated Hero Welcome Card */}
          <View style={styles.heroCard}>
            <View style={styles.heroBadge}>
              <Ionicons name="sparkles" size={13} color="#D6FF57" />
              <Text style={styles.heroBadgeText}>QUANTUM REAL-TIME VOICE</Text>
            </View>
            <Text style={styles.heroTitle}>Speak English Naturally</Text>
            <Text style={styles.heroSubtitle}>
              बोलो बेझिझक! AI आपकी गलतियों को बड़े प्यार से सुधारेगा और आसान Hinglish में वजह बताएगा।
            </Text>
          </View>

          {/* FREE USER DAILY LIMIT & REAL-TIME USAGE CARD */}
          <View style={styles.quotaCard}>
            <View style={styles.quotaHeaderRow}>
              <View style={styles.freePlanBadge}>
                <Ionicons name="sparkles" size={13} color="#15803D" />
                <Text style={styles.freePlanBadgeText}>100% FREE DAILY QUOTA</Text>
              </View>
              <View style={styles.resetBadge}>
                <Ionicons name="refresh-outline" size={12} color="#6B7280" />
                <Text style={styles.resetBadgeText}>Midnight Reset</Text>
              </View>
            </View>

            <Text style={styles.quotaTitle}>Daily AI Speaking Allowance</Text>
            <Text style={styles.quotaSubtitle}>
              दैनिक बोलने की सीमा — आप कितना बोल चुके हैं और कितना समय बचा है:
            </Text>

            {/* 3 Metric Boxes: Total Limit, Spoken Today, Remaining Today */}
            <View style={styles.quotaStatsRow}>
              {/* 1. Total Limit */}
              <View style={styles.quotaStatBox}>
                <View style={[styles.statIconCircle, { backgroundColor: '#F3F4F6' }]}>
                  <Ionicons name="gift-outline" size={15} color="#4B5563" />
                </View>
                <Text style={styles.statValueText}>{formatFriendlyMinutes(totalDailySeconds)}</Text>
                <Text style={styles.statLabelText}>कुल सीमा</Text>
                <Text style={styles.statSubLabelText}>Total Free</Text>
              </View>

              {/* 2. Spoken Today */}
              <View style={styles.quotaStatBox}>
                <View style={[styles.statIconCircle, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="mic-outline" size={15} color="#D97706" />
                </View>
                <Text style={[styles.statValueText, { color: '#B45309' }]}>
                  {formatFriendlyDuration(usedTodaySeconds)}
                </Text>
                <Text style={[styles.statLabelText, { color: '#92400E' }]}>बात करली</Text>
                <Text style={styles.statSubLabelText}>Spoken</Text>
              </View>

              {/* 3. Remaining Today */}
              <View style={[styles.quotaStatBox, styles.statBoxHighlight]}>
                <View style={[styles.statIconCircle, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="hourglass-outline" size={15} color="#15803D" />
                </View>
                <Text style={[styles.statValueText, { color: '#15803D' }]}>
                  {formatFriendlyDuration(remainingSeconds)}
                </Text>
                <Text style={[styles.statLabelText, { color: '#166534', fontWeight: '700' }]}>
                  बाकी बची है
                </Text>
                <Text style={[styles.statSubLabelText, { color: '#15803D' }]}>Remaining</Text>
              </View>
            </View>

            {/* Visual Progress Bar */}
            <View style={styles.progressBarWrapper}>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(100, Math.max(0, (usedTodaySeconds / (totalDailySeconds || 600)) * 100))}%`,
                      backgroundColor: remainingSeconds <= 60 ? '#EF4444' : '#22C55E',
                    },
                  ]}
                />
              </View>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressStatusText}>
                  {remainingSeconds <= 0
                    ? '⚠️ आज का 10 मिनट वॉयस कोटा पूरा हो गया'
                    : `🟢 ${formatFriendlyDuration(remainingSeconds)} बोलने का समय आज बाकी है`}
                </Text>
                <Text style={styles.progressPercentText}>
                  {Math.round(((usedTodaySeconds) / (totalDailySeconds || 600)) * 100)}% उपयोग
                </Text>
              </View>
            </View>
          </View>

          {/* Mode Selector */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading}>SELECT LEARNING MODE</Text>
            <View style={styles.modeCardsRow}>
              {/* Beginner */}
              <TouchableOpacity
                style={[styles.modeCard, selectedMode === 'beginner' && styles.modeCardActive]}
                onPress={() => setSelectedMode('beginner')}
                activeOpacity={0.8}
              >
                <View style={styles.modeCardHeader}>
                  <Text style={[styles.modeCardTitle, selectedMode === 'beginner' && styles.modeCardTextActive]}>
                    Beginner (A)
                  </Text>
                  {selectedMode === 'beginner' && <Ionicons name="checkmark-circle" size={18} color="#A3E635" />}
                </View>
                <Text style={styles.modeCardDesc}>धीमी, आसान इंग्लिश + हर गलती की हिंदी में समझ</Text>
              </TouchableOpacity>

              {/* Intermediate */}
              <TouchableOpacity
                style={[styles.modeCard, selectedMode === 'intermediate' && styles.modeCardActive]}
                onPress={() => setSelectedMode('intermediate')}
                activeOpacity={0.8}
              >
                <View style={styles.modeCardHeader}>
                  <Text style={[styles.modeCardTitle, selectedMode === 'intermediate' && styles.modeCardTextActive]}>
                    Intermediate (B)
                  </Text>
                  {selectedMode === 'intermediate' && <Ionicons name="checkmark-circle" size={18} color="#A3E635" />}
                </View>
                <Text style={styles.modeCardDesc}>नेचुरल बातचीत + ग्रामर और वर्ड चॉइस सुधार</Text>
              </TouchableOpacity>

              {/* Fluency */}
              <TouchableOpacity
                style={[styles.modeCard, selectedMode === 'conversation' && styles.modeCardActive]}
                onPress={() => setSelectedMode('conversation')}
                activeOpacity={0.8}
              >
                <View style={styles.modeCardHeader}>
                  <Text style={[styles.modeCardTitle, selectedMode === 'conversation' && styles.modeCardTextActive]}>
                    Fluency (C)
                  </Text>
                  {selectedMode === 'conversation' && <Ionicons name="checkmark-circle" size={18} color="#A3E635" />}
                </View>
                <Text style={styles.modeCardDesc}>बिना टोके फ्री फ्लो बातचीत, धाराप्रवाह इंग्लिश</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Topic Selector */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading}>CHOOSE CONVERSATION TOPIC</Text>
            <View style={styles.topicsGrid}>
              {TOPICS.map((topic) => {
                const isSelected = selectedTopic === topic.id;
                return (
                  <TouchableOpacity
                    key={topic.id}
                    style={[styles.topicChip, isSelected && styles.topicChipActive]}
                    onPress={() => setSelectedTopic(topic.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={topic.icon}
                      size={20}
                      color={isSelected ? '#D6FF57' : '#7C3AED'}
                    />
                    <View style={styles.topicChipTextWrap}>
                      <Text style={[styles.topicChipTitle, isSelected && styles.topicChipTitleActive]}>
                        {topic.title}
                      </Text>
                      <Text style={[styles.topicChipHindi, isSelected && styles.topicChipHindiActive]}>
                        {topic.hindiDesc}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Fallback to Text AI Button */}
          <TouchableOpacity
            style={styles.textFallbackButton}
            onPress={() => router.push('/ai-teacher')}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={17} color="#94A3B8" />
            <Text style={styles.textFallbackText}>Prefer text chat? Open Text AI Tutor</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        // ACTIVE SESSION CONVERSATION VIEW
        <View style={styles.conversationContainer}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.turnsScroll}
            contentContainerStyle={styles.turnsContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Topic pill header */}
            <View style={styles.sessionMetaBar}>
              <View style={styles.metaTopicBadge}>
                <Ionicons name="chatbubble" size={11} color="#38BDF8" style={{ marginRight: 4 }} />
                <Text style={styles.metaTopicText}>
                  {TOPICS.find((t) => t.id === selectedTopic)?.title || 'Conversation'}
                </Text>
              </View>
              <View style={styles.metaModeBadge}>
                <Text style={styles.metaModeText}>{selectedMode.toUpperCase()}</Text>
              </View>
              <View style={styles.metaQuotaBadge}>
                <Ionicons name="hourglass-outline" size={11} color="#15803D" style={{ marginRight: 3 }} />
                <Text style={styles.metaQuotaText}>{formatFriendlyDuration(remainingSeconds)} left</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowTranscripts(!showTranscripts)}
                style={styles.transcriptToggle}
              >
                <Ionicons
                  name={showTranscripts ? 'eye-outline' : 'eye-off-outline'}
                  size={14}
                  color="#94A3B8"
                />
                <Text style={styles.transcriptToggleText}>
                  {showTranscripts ? 'Hide text' : 'Show text'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Conversation Turns Feed */}
            {turns.map((turn, index) => {
              const isUser = turn.role === 'user';
              return (
                <View
                  key={turn.id || index}
                  style={[styles.turnRow, isUser ? styles.turnRowUser : styles.turnRowAI]}
                >
                  {!isUser && (
                    <LinearGradient
                      colors={['#8B5CF6', '#38BDF8']}
                      style={styles.aiAvatarGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name="sparkles" size={15} color="#FFFFFF" />
                    </LinearGradient>
                  )}

                  <View style={styles.turnBubbleWrap}>
                    {/* Speech Text Bubble (if transcripts visible) */}
                    {showTranscripts && (
                      <LinearGradient
                        colors={
                          isUser
                            ? ['#3730A3', '#4F46E5']
                            : ['rgba(26, 20, 50, 0.85)', 'rgba(16, 12, 34, 0.95)']
                        }
                        style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        {isUser && (
                          <View style={styles.userBubbleTag}>
                            <Ionicons name="mic" size={11} color="#C7D2FE" />
                            <Text style={styles.userBubbleTagText}>You</Text>
                          </View>
                        )}

                        <Text style={[styles.bubbleText, isUser ? styles.userBubbleText : styles.aiBubbleText]}>
                          {(turn.text || '').replace(/<no speech>/gi, '').replace(/\{pause\}/gi, '').trim() ||
                            (turn.isStreaming ? '...' : '')}
                        </Text>

                        {/* Replay voice button for AI responses */}
                        {!isUser && turn.audioWavUri && (
                          <TouchableOpacity
                            style={styles.replayPill}
                            onPress={() => handleReplayTurn(turn.id)}
                            activeOpacity={0.75}
                          >
                            <LinearGradient
                              colors={['rgba(139, 92, 246, 0.25)', 'rgba(56, 189, 248, 0.2)']}
                              style={styles.replayPillGradient}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                            >
                              <Ionicons name="volume-medium" size={14} color="#A78BFA" />
                              <Text style={styles.replayPillText}>Replay Voice 🔊</Text>
                            </LinearGradient>
                          </TouchableOpacity>
                        )}
                      </LinearGradient>
                    )}

                    {/* FUTURISTIC REAL-TIME CORRECTION CARD */}
                    {!isUser && turn.correction && (
                      <View style={styles.correctionCardWrap}>
                        <LinearGradient
                          colors={['#2A101C', '#160914']}
                          style={styles.correctionCardGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          {/* Badge Tag */}
                          <View style={styles.correctionBadgeRow}>
                            <View style={styles.correctionBadgePill}>
                              <Ionicons name="flash" size={11} color="#FB7185" />
                              <Text style={styles.correctionBadgeText}>LIVE CORRECTION</Text>
                            </View>
                          </View>

                          {/* What was said */}
                          {turn.correction.original ? (
                            <View style={styles.correctionSectionBox}>
                              <Text style={styles.correctionSectionLabel}>❌ What was said:</Text>
                              <Text style={styles.originalTextStrike}>
                                "{turn.correction.original}"
                              </Text>
                            </View>
                          ) : null}

                          {/* Better English */}
                          <View style={styles.correctionNativeBox}>
                            <Text style={styles.correctionNativeLabel}>✨ Better English (Native Way):</Text>
                            <View style={styles.nativeSentenceRow}>
                              <Ionicons name="checkmark-circle" size={17} color="#A3E635" />
                              <Text style={styles.correctedTextHighlight}>
                                {turn.correction.corrected}
                              </Text>
                            </View>
                          </View>

                          {/* Hinglish Explanation */}
                          {turn.correction.explanation ? (
                            <View style={styles.explanationBoxHinglish}>
                              <View style={styles.explanationTitleRow}>
                                <Ionicons name="bulb-outline" size={14} color="#FBBF24" />
                                <Text style={styles.explanationTitleHinglish}>Why? (आसान समझ):</Text>
                              </View>
                              <Text style={styles.explanationTextHinglish}>
                                {turn.correction.explanation}
                              </Text>
                            </View>
                          ) : null}

                          {/* Formula Reference Link */}
                          {turn.correction.matchingFormula && (
                            <TouchableOpacity
                              style={styles.formulaPillButton}
                              onPress={() => {
                                router.push(`/formulas/${turn.correction?.matchingFormula?.id}`);
                              }}
                              activeOpacity={0.8}
                            >
                              <View style={styles.formulaRefLeft}>
                                <View style={styles.formulaNumBadge}>
                                  <Text style={styles.formulaNumBadgeText}>
                                    #{turn.correction.matchingFormula.id}
                                  </Text>
                                </View>
                                <View style={styles.formulaRefTextWrap}>
                                  <Text style={styles.formulaRefTitle}>
                                    {turn.correction.matchingFormula.englishFormula}
                                  </Text>
                                  <Text style={styles.formulaRefHindi}>
                                    {turn.correction.matchingFormula.hindiMeaning}
                                  </Text>
                                </View>
                              </View>
                              <Ionicons name="chevron-forward" size={16} color="#A3E635" />
                            </TouchableOpacity>
                          )}
                        </LinearGradient>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}

            {/* SEAMLESS RESUMPTION BANNER (When session ended or idle) */}
            {!isInSession && turns.length > 0 && (
              <TouchableOpacity
                style={styles.continueSessionBanner}
                onPress={handleStartSession}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#1E1838', '#312E81', '#1E1838']}
                  style={styles.continueBannerGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <View style={styles.continueBeaconDot} />
                  <Text style={styles.continueBannerText}>
                    Tap mic to continue speaking / बातचीत जारी रखें 🎙️
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      )}

      {/* BOTTOM ANIMATED VOICE CONTROL SUITE */}
      <View style={styles.bottomControlsArea}>
        {/* Dynamic 5-Bar Dancing Equalizer Waveform */}
        <View style={styles.equalizerWrap}>
          <Animated.View style={[styles.eqBar, { height: barAnim1, backgroundColor: getEqualizerBarColor() }]} />
          <Animated.View style={[styles.eqBar, { height: barAnim2, backgroundColor: getEqualizerBarColor() }]} />
          <Animated.View style={[styles.eqBar, { height: barAnim3, backgroundColor: getEqualizerBarColor() }]} />
          <Animated.View style={[styles.eqBar, { height: barAnim4, backgroundColor: getEqualizerBarColor() }]} />
          <Animated.View style={[styles.eqBar, { height: barAnim5, backgroundColor: getEqualizerBarColor() }]} />
        </View>

        {/* State Status Banner */}
        <Text style={styles.bottomStatusText} numberOfLines={1}>
          {statusMessage}
        </Text>

        <View style={styles.micRow}>
          {/* Mute/Pause Toggle (in session) */}
          {isInSession && (
            <TouchableOpacity
              style={[styles.sideControlBtn, isMuted && styles.sideControlBtnActive]}
              onPress={handleToggleMute}
              accessibilityLabel="Mute microphone"
            >
              <Ionicons
                name={isMuted ? 'mic-off' : 'mic-outline'}
                size={22}
                color={isMuted ? '#F43F5E' : '#F1F5F9'}
              />
            </TouchableOpacity>
          )}

          {/* MAIN ANIMATED AI VOICE ORB (User requested unique animated symbol) */}
          <TouchableOpacity
            style={styles.micButtonContainer}
            onPress={handleMicPress}
            activeOpacity={0.9}
            accessibilityLabel="Talk to AI"
          >
            {/* Wave Layer 1: Outermost Expanding Ripple */}
            {(sessionState === 'listening' || sessionState === 'ai_speaking') && (
              <Animated.View
                style={[
                  styles.outerRippleWave,
                  {
                    borderColor: getRippleBorderColor(),
                    transform: [{ scale: rippleAnim1 }],
                    opacity: rippleOpacity1,
                  },
                ]}
              />
            )}

            {/* Wave Layer 2: Mid Expanding Ripple */}
            {(sessionState === 'listening' || sessionState === 'ai_speaking') && (
              <Animated.View
                style={[
                  styles.midRippleWave,
                  {
                    borderColor: getRippleBorderColor(),
                    transform: [{ scale: rippleAnim2 }],
                    opacity: rippleOpacity2,
                  },
                ]}
              />
            )}

            {/* Rotating Star Orbit Halo */}
            {(sessionState === 'listening' || sessionState === 'ai_speaking') && (
              <Animated.View
                style={[
                  styles.orbitRing,
                  {
                    transform: [
                      {
                        rotate: rotateAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg'],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={[styles.orbitParticle, { backgroundColor: getEqualizerBarColor() }]} />
              </Animated.View>
            )}

            {/* Central Animated Holographic Voice Core */}
            <Animated.View
              style={[
                styles.voiceOrbCoreWrap,
                {
                  transform: [
                    { scale: buttonPressScale },
                    { scale: pulseAnim },
                    { scale: 1 + Math.min(0.25, audioLevel * 0.3) },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={getOrbGradientColors()}
                style={styles.voiceOrbGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons
                  name={
                    sessionState === 'listening'
                      ? 'mic'
                      : sessionState === 'ai_speaking'
                        ? 'volume-high'
                        : sessionState === 'processing'
                          ? 'sparkles'
                          : isInSession
                            ? 'mic'
                            : 'mic-outline'
                  }
                  size={34}
                  color={sessionState === 'listening' ? '#082F49' : '#FFFFFF'}
                />
              </LinearGradient>
            </Animated.View>
          </TouchableOpacity>

          {/* End Session Button (in session) */}
          {isInSession && (
            <TouchableOpacity
              style={[styles.sideControlBtn, styles.endSessionBtn]}
              onPress={handleEndSession}
              accessibilityLabel="End conversation"
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Subtitle Hint Text */}
        <Text style={styles.micHintText}>
          {sessionState === 'listening'
            ? 'Speak English naturally (or tap mic when done)'
            : sessionState === 'ai_speaking'
              ? 'AI is speaking... Tap mic to interrupt'
              : sessionState === 'processing'
                ? 'AI Teacher is thinking...'
                : sessionState === 'ready'
                  ? 'Speak English freely'
                  : 'Tap living orb to start conversation'}
        </Text>
      </View>

      {/* ULTRA-MODERN CUSTOM ALERT MODAL */}
      <Modal
        visible={noticeModal.visible}
        transparent={true}
        animationType="none"
        statusBarTranslucent={true}
        onRequestClose={() => {
          if (noticeModal.onSecondaryAction) {
            noticeModal.onSecondaryAction();
          } else {
            setNoticeModal((prev) => ({ ...prev, visible: false }));
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              if (noticeModal.onSecondaryAction) {
                noticeModal.onSecondaryAction();
              } else {
                setNoticeModal((prev) => ({ ...prev, visible: false }));
              }
            }}
          />
          <Animated.View
            style={[
              styles.customModalCard,
              {
                opacity: modalFadeAnim,
                transform: [{ scale: modalScaleAnim }],
              },
            ]}
          >
            {/* Top Accent Neon Glow Line */}
            <View
              style={[
                styles.modalTopGlowBar,
                noticeModal.type === 'confirm_exit'
                  ? styles.glowBarRed
                  : noticeModal.type === 'network_error'
                    ? styles.glowBarAmber
                    : styles.glowBarLime,
              ]}
            />

            {/* Glowing Icon Circle */}
            <View
              style={[
                styles.modalIconCircle,
                noticeModal.type === 'confirm_exit'
                  ? styles.modalIconCircleRed
                  : noticeModal.type === 'network_error'
                    ? styles.modalIconCircleAmber
                    : styles.modalIconCircleLime,
              ]}
            >
              <Ionicons
                name={
                  noticeModal.type === 'confirm_exit'
                    ? 'log-out-outline'
                    : noticeModal.type === 'network_error'
                      ? 'cloud-offline-outline'
                      : 'sparkles'
                }
                size={34}
                color={
                  noticeModal.type === 'confirm_exit'
                    ? '#F43F5E'
                    : noticeModal.type === 'network_error'
                      ? '#F59E0B'
                      : '#A3E635'
                }
              />
            </View>

            {/* Badge Tag */}
            <View
              style={[
                styles.modalBadgePill,
                noticeModal.type === 'confirm_exit'
                  ? styles.modalBadgePillRed
                  : noticeModal.type === 'network_error'
                    ? styles.modalBadgePillAmber
                    : styles.modalBadgePillLime,
              ]}
            >
              <Text
                style={[
                  styles.modalBadgePillText,
                  noticeModal.type === 'confirm_exit'
                    ? { color: '#F43F5E' }
                    : noticeModal.type === 'network_error'
                      ? { color: '#F59E0B' }
                      : { color: '#A3E635' },
                ]}
              >
                {noticeModal.badge || 'NOTICE'}
              </Text>
            </View>

            {/* Title */}
            <Text style={styles.modalTitleText}>{noticeModal.title}</Text>

            {/* Primary Highlight Message */}
            <Text style={styles.modalMessageText}>{noticeModal.message}</Text>

            {/* Hindi / Hinglish Explanation */}
            {noticeModal.hindiDetail ? (
              <Text style={styles.modalHindiDetailText}>{noticeModal.hindiDetail}</Text>
            ) : null}

            {/* Quota Progress Stat Box (Only when voice quota is reached) */}
            {noticeModal.type === 'quota_limit' && (
              <View style={styles.modalQuotaStatBox}>
                <View style={styles.modalQuotaRow}>
                  <Text style={styles.modalQuotaLabel}>🎙️ Daily Voice Practice</Text>
                  <Text style={styles.modalQuotaValue}>10 / 10 Mins Used</Text>
                </View>

                {/* Progress bar */}
                <View style={styles.modalProgressBarBg}>
                  <View style={[styles.modalProgressBarFill, { width: '100%' }]} />
                </View>

                <View style={styles.modalQuotaDivider} />

                <View style={styles.modalBenefitRow}>
                  <Ionicons name="checkmark-circle" size={16} color="#A3E635" />
                  <Text style={styles.modalBenefitText}>
                    Text AI Teacher is{' '}
                    <Text style={{ color: '#A3E635', fontWeight: '700' }}>
                      100% Free & Unlimited
                    </Text>
                  </Text>
                </View>
                <View style={styles.modalBenefitRow}>
                  <Ionicons name="time-outline" size={16} color="#94A3B8" />
                  <Text style={styles.modalBenefitText}>Daily voice quota resets at 12:00 AM</Text>
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.modalActionButtonsWrap}>
              {noticeModal.primaryActionText ? (
                <TouchableOpacity
                  style={[
                    styles.modalPrimaryBtn,
                    noticeModal.type === 'confirm_exit'
                      ? styles.modalPrimaryBtnRed
                      : styles.modalPrimaryBtnLime,
                  ]}
                  onPress={noticeModal.onPrimaryAction}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.modalPrimaryBtnText,
                      noticeModal.type === 'confirm_exit'
                        ? { color: '#FFFFFF' }
                        : { color: '#0F172A' },
                    ]}
                  >
                    {noticeModal.primaryActionText}
                  </Text>
                  <Ionicons
                    name={
                      noticeModal.type === 'confirm_exit'
                        ? 'close-circle'
                        : 'arrow-forward-circle'
                    }
                    size={20}
                    color={noticeModal.type === 'confirm_exit' ? '#FFFFFF' : '#0F172A'}
                  />
                </TouchableOpacity>
              ) : null}

              {noticeModal.secondaryActionText ? (
                <TouchableOpacity
                  style={styles.modalSecondaryBtn}
                  onPress={noticeModal.onSecondaryAction}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalSecondaryBtnText}>
                    {noticeModal.secondaryActionText}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E5E5EB',
  },
  ambientGlowContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  ambientGlowTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 280,
  },
  ambientGlowBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 320,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.06)',
    backgroundColor: '#E5E5EB',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#111114',
    letterSpacing: -0.2,
  },
  headerSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotIdle: { backgroundColor: '#9CA3AF' },
  statusDotActive: { backgroundColor: colors.green },
  statusDotListening: { backgroundColor: colors.lime },
  statusDotSpeaking: { backgroundColor: colors.purple },
  statusDotProcessing: { backgroundColor: colors.pink },
  headerStatusText: {
    fontSize: 11.5,
    color: '#6B7280',
    fontWeight: '600',
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(0, 0, 0, 0.08)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
    gap: 5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  timerText: {
    color: '#111114',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  contextFormulaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.06)',
    gap: 10,
  },
  contextBadge: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  contextBadgeText: {
    color: '#7C3AED',
    fontSize: 10,
    fontWeight: '800',
  },
  contextFormulaText: {
    flex: 1,
    color: '#111114',
    fontSize: 12.5,
    fontWeight: '600',
  },
  setupScroll: {
    flex: 1,
  },
  setupContent: {
    padding: 18,
    paddingBottom: 40,
    gap: 20,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 4,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#1E1E24',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
    gap: 5,
  },
  heroBadgeText: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#D6FF57',
    letterSpacing: 0.6,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111114',
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    fontSize: 13.5,
    color: '#4B5563',
    lineHeight: 21,
  },
  sectionContainer: {
    gap: 10,
  },
  sectionHeading: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.9,
  },
  modeCardsRow: {
    gap: 10,
  },
  modeCard: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(0, 0, 0, 0.06)',
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 15,
    gap: 5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  modeCardActive: {
    borderColor: '#84CC16',
    backgroundColor: '#FFFFFF',
  },
  modeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modeCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111114',
  },
  modeCardTextActive: {
    color: '#65A30D',
  },
  modeCardDesc: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  topicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(0, 0, 0, 0.06)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  topicChipActive: {
    borderColor: '#1E1E24',
    backgroundColor: '#1E1E24',
  },
  topicChipTextWrap: {
    flex: 1,
  },
  topicChipTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111114',
  },
  topicChipTitleActive: {
    color: '#D6FF57',
    fontWeight: '800',
  },
  topicChipHindi: {
    fontSize: 10.5,
    color: '#6B7280',
    marginTop: 2,
  },
  topicChipHindiActive: {
    color: '#E2E8F0',
    fontWeight: '600',
  },
  textFallbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    marginTop: 6,
  },
  textFallbackText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  conversationContainer: {
    flex: 1,
  },
  turnsScroll: {
    flex: 1,
  },
  turnsContent: {
    padding: 16,
    paddingBottom: 24,
    gap: 16,
  },
  sessionMetaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  metaTopicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: 'rgba(56, 189, 248, 0.25)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  metaTopicText: {
    color: '#38BDF8',
    fontSize: 11.5,
    fontWeight: '700',
  },
  metaModeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  metaModeText: {
    color: '#CBD5E1',
    fontSize: 10.5,
    fontWeight: '700',
  },
  transcriptToggle: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  transcriptToggleText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  turnRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  turnRowUser: {
    justifyContent: 'flex-end',
  },
  turnRowAI: {
    justifyContent: 'flex-start',
  },
  aiAvatarGradient: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  turnBubbleWrap: {
    maxWidth: '85%',
    gap: 10,
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 22,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  userBubble: {
    borderBottomRightRadius: 6,
    borderColor: 'rgba(99, 102, 241, 0.4)',
    alignSelf: 'flex-end',
  },
  userBubbleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  userBubbleTagText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#C7D2FE',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  aiBubble: {
    borderBottomLeftRadius: 6,
    borderColor: 'rgba(168, 85, 247, 0.25)',
    alignSelf: 'flex-start',
  },
  bubbleText: {
    fontSize: 15.5,
    lineHeight: 23,
    letterSpacing: -0.1,
  },
  userBubbleText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  aiBubbleText: {
    color: '#F8FAFC',
  },
  replayPill: {
    alignSelf: 'flex-start',
    marginTop: 10,
    borderRadius: radii.full,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.35)',
  },
  replayPillGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  replayPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#D8B4FE',
  },
  correctionCardWrap: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(244, 63, 94, 0.35)',
    shadowColor: '#F43F5E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  correctionCardGradient: {
    padding: 16,
    gap: 12,
  },
  correctionBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  correctionBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 63, 94, 0.2)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radii.full,
    gap: 4,
  },
  correctionBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FB7185',
    letterSpacing: 0.6,
  },
  correctionSectionBox: {
    gap: 4,
  },
  correctionSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FDA4AF',
  },
  originalTextStrike: {
    fontSize: 14,
    color: '#94A3B8',
    fontStyle: 'italic',
    textDecorationLine: 'line-through',
  },
  correctionNativeBox: {
    backgroundColor: 'rgba(163, 230, 53, 0.08)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(163, 230, 53, 0.25)',
    gap: 6,
  },
  correctionNativeLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#A3E635',
    letterSpacing: 0.3,
  },
  nativeSentenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  correctedTextHighlight: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  explanationBoxHinglish: {
    backgroundColor: 'rgba(245, 158, 11, 0.09)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    gap: 5,
  },
  explanationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  explanationTitleHinglish: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FBBF24',
  },
  explanationTextHinglish: {
    fontSize: 13,
    color: '#FEF3C7',
    lineHeight: 19,
  },
  formulaPillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
  },
  formulaRefLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  formulaNumBadge: {
    backgroundColor: '#A3E635',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  formulaNumBadgeText: {
    color: '#0F172A',
    fontSize: 10.5,
    fontWeight: '900',
  },
  formulaRefTextWrap: {
    flex: 1,
  },
  formulaRefTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  formulaRefHindi: {
    fontSize: 10.5,
    color: '#94A3B8',
  },
  continueSessionBanner: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.2,
    borderColor: 'rgba(99, 102, 241, 0.4)',
    marginTop: 8,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  continueBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
  },
  continueBeaconDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#00F2FE',
  },
  continueBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  bottomControlsArea: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  equalizerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    gap: 6,
  },
  eqBar: {
    width: 4.5,
    borderRadius: 3,
  },
  bottomStatusText: {
    fontSize: 13,
    color: '#111114',
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  micRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    position: 'relative',
    marginVertical: 4,
  },
  sideControlBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 18,
  },
  sideControlBtnActive: {
    backgroundColor: 'rgba(244, 63, 94, 0.25)',
    borderColor: '#F43F5E',
  },
  endSessionBtn: {
    backgroundColor: 'rgba(244, 63, 94, 0.2)',
    borderColor: 'rgba(244, 63, 94, 0.4)',
  },
  micButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 96,
    height: 96,
  },
  outerRippleWave: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 1.5,
  },
  midRippleWave: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 2,
  },
  orbitRing: {
    position: 'absolute',
    width: 106,
    height: 106,
    borderRadius: 53,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  orbitParticle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: -4,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  voiceOrbCoreWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 12,
  },
  voiceOrbGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  micHintText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
    textAlign: 'center',
  },

  // UNIQUE CUSTOM ALERT MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 2, 10, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  customModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#120E26',
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(163, 230, 53, 0.3)',
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 22,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#A3E635',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 16,
  },
  modalTopGlowBar: {
    position: 'absolute',
    top: 0,
    left: 40,
    right: 40,
    height: 3,
    borderRadius: 2,
    opacity: 0.9,
  },
  glowBarLime: {
    backgroundColor: '#A3E635',
  },
  glowBarRed: {
    backgroundColor: '#F43F5E',
  },
  glowBarAmber: {
    backgroundColor: '#F59E0B',
  },
  modalIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  modalIconCircleLime: {
    backgroundColor: 'rgba(163, 230, 53, 0.12)',
    borderWidth: 2,
    borderColor: 'rgba(163, 230, 53, 0.4)',
  },
  modalIconCircleRed: {
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    borderWidth: 2,
    borderColor: 'rgba(244, 63, 94, 0.4)',
  },
  modalIconCircleAmber: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 2,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  modalBadgePill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    marginBottom: 12,
  },
  modalBadgePillLime: {
    backgroundColor: 'rgba(163, 230, 53, 0.15)',
  },
  modalBadgePillRed: {
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
  },
  modalBadgePillAmber: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  modalBadgePillText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  modalTitleText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  modalMessageText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#F1F5F9',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 6,
  },
  modalHindiDetailText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
  },
  modalQuotaStatBox: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 18,
  },
  modalQuotaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalQuotaLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  modalQuotaValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#A3E635',
  },
  modalProgressBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  modalProgressBarFill: {
    height: '100%',
    backgroundColor: '#A3E635',
    borderRadius: 3,
  },
  modalQuotaDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 10,
  },
  modalBenefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  modalBenefitText: {
    fontSize: 11.5,
    color: '#CBD5E1',
    flex: 1,
  },
  modalActionButtonsWrap: {
    width: '100%',
    gap: 8,
    marginTop: 4,
  },
  modalPrimaryBtn: {
    width: '100%',
    height: 50,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 4,
  },
  modalPrimaryBtnLime: {
    backgroundColor: '#A3E635',
    shadowColor: '#A3E635',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  modalPrimaryBtnRed: {
    backgroundColor: '#F43F5E',
    shadowColor: '#F43F5E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  modalPrimaryBtnText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  modalSecondaryBtn: {
    width: '100%',
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSecondaryBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#94A3B8',
  },
  quotaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.07)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
    gap: 12,
  },
  quotaHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  freePlanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radii.full,
    gap: 5,
  },
  freePlanBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.5,
  },
  resetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resetBadgeText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  quotaTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111114',
    letterSpacing: -0.2,
  },
  quotaSubtitle: {
    fontSize: 12.5,
    color: '#4B5563',
    lineHeight: 18,
    marginTop: -4,
  },
  quotaStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  quotaStatBox: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  statBoxHighlight: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  statIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statValueText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111114',
    letterSpacing: -0.2,
  },
  statLabelText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
    marginTop: 2,
    textAlign: 'center',
  },
  statSubLabelText: {
    fontSize: 9.5,
    color: '#9CA3AF',
    marginTop: 1,
  },
  progressBarWrapper: {
    marginTop: 2,
    gap: 6,
  },
  progressBarTrack: {
    height: 7,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressStatusText: {
    fontSize: 11.5,
    color: '#374151',
    fontWeight: '600',
  },
  progressPercentText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '700',
  },
  metaQuotaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginRight: 6,
  },
  metaQuotaText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  timerPillLow: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  timerTextLow: {
    color: '#DC2626',
  },
});
