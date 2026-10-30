import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  BackHandler,
  Platform,
  Animated,
  Easing,
  Alert,
  Vibration,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  FluentOrb,
  FluentButton,
  FluentProgressTrack,
  FluentTopBar,
  FluentHeading,
  fluentTokens,
} from '../src/components/neumorphic/FluentComponents';
import {
  AmbientScene,
  HeroStageOrbits,
  KineticKicker,
  AnimatedPhrase,
  FloatingPill,
  LaunchEmblemBadge,
  KineticHeroTitle,
} from '../src/components/neumorphic/FuturisticMotion';
import {
  UserProfileRepository,
  UserLevel,
  AppLanguage,
  UserOnboardingProfile,
} from '../src/database/userProfileRepository';
import { SessionManager } from '../src/database/sessionStore';
import {
  getOnboardingStrings,
  QuizQuestion,
} from '../src/data/onboardingTranslations';
import { CinematicWelcomeExperience } from '../src/components/welcome/CinematicWelcomeExperience';
import { ReminderNotificationService } from '../src/services/reminderNotificationService';

type OnboardingStep =
  | 'welcome'
  | 'country'
  | 'language'
  | 'account'
  | 'level'
  | 'assessmentIntro'
  | 'assessment'
  | 'result'
  | 'goal'
  | 'reminders'
  | 'formulas'
  | 'ready';

const STEPS_ORDER: OnboardingStep[] = [
  'welcome',
  'country',
  'language',
  'account',
  'level',
  'assessmentIntro',
  'assessment',
  'result',
  'goal',
  'reminders',
  'formulas',
  'ready',
];

const COUNTRIES = [
  { code: 'IN', flag: '🇮🇳', name: 'India', dial: '+91' },
  { code: 'US', flag: '🇺🇸', name: 'United States', dial: '+1' },
  { code: 'GB', flag: '🇬🇧', name: 'United Kingdom', dial: '+44' },
  { code: 'CA', flag: '🇨🇦', name: 'Canada', dial: '+1' },
  { code: 'AU', flag: '🇦🇺', name: 'Australia', dial: '+61' },
  { code: 'AE', flag: '🇦🇪', name: 'United Arab Emirates', dial: '+971' },
  { code: 'PK', flag: '🇵🇰', name: 'Pakistan', dial: '+92' },
  { code: 'BD', flag: '🇧🇩', name: 'Bangladesh', dial: '+880' },
  { code: 'NP', flag: '🇳🇵', name: 'Nepal', dial: '+977' },
  { code: 'SG', flag: '🇸🇬', name: 'Singapore', dial: '+65' },
  { code: 'DE', flag: '🇩🇪', name: 'Germany', dial: '+49' },
  { code: 'FR', flag: '🇫🇷', name: 'France', dial: '+33' },
  { code: 'JP', flag: '🇯🇵', name: 'Japan', dial: '+81' },
];

const LANGUAGES: { id: AppLanguage; label: string; sub: string }[] = [
  { id: 'Hindi', label: 'हिन्दी', sub: 'Best for Hindi speakers' },
  { id: 'English', label: 'English', sub: 'Full English interface' },
  { id: 'Hinglish', label: 'Hindi + English', sub: 'A mix of Hindi and English' },
  { id: 'Spanish', label: 'Español', sub: 'Learn English with Spanish' },
];

interface ParsedQuestion {
  isFillInBlank: boolean;
  instruction: string;
  prefix: string;
  suffix: string;
  fullSentence: string;
}

function parseAssessmentQuestion(rawText: string): ParsedQuestion {
  if (!rawText.includes('___')) {
    return {
      isFillInBlank: false,
      instruction: '',
      prefix: '',
      suffix: '',
      fullSentence: rawText,
    };
  }

  const colonIndex = rawText.indexOf(':');
  let instruction = '';
  let sentencePart = rawText;

  if (colonIndex !== -1) {
    instruction = rawText.substring(0, colonIndex).trim();
    sentencePart = rawText.substring(colonIndex + 1).trim();
  }

  const cleanSentence = sentencePart.replace(/^[“"'\s]+|[”"'\s]+$/g, '').trim();
  const parts = cleanSentence.split('___');
  const prefix = parts[0] || '';
  const suffix = parts.length > 1 ? parts.slice(1).join('___') : '';

  return {
    isFillInBlank: true,
    instruction,
    prefix,
    suffix,
    fullSentence: cleanSentence,
  };
}

const AssessmentOptionCard: React.FC<{
  letter: string;
  text: string;
  isSelected: boolean;
  isWrong?: boolean;
  onPress: () => void;
}> = ({ letter, text, isSelected, isWrong, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const cardShakeAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
    }).start();
  };

  useEffect(() => {
    if (isWrong) {
      cardShakeAnim.setValue(0);
      Animated.sequence([
        Animated.timing(cardShakeAnim, { toValue: -10, duration: 45, useNativeDriver: true }),
        Animated.timing(cardShakeAnim, { toValue: 10, duration: 45, useNativeDriver: true }),
        Animated.timing(cardShakeAnim, { toValue: -7, duration: 45, useNativeDriver: true }),
        Animated.timing(cardShakeAnim, { toValue: 7, duration: 45, useNativeDriver: true }),
        Animated.timing(cardShakeAnim, { toValue: -3, duration: 40, useNativeDriver: true }),
        Animated.timing(cardShakeAnim, { toValue: 3, duration: 40, useNativeDriver: true }),
        Animated.timing(cardShakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
      ]).start();
    } else if (isSelected) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.025,
          duration: 110,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isSelected, isWrong]);

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }, { translateX: cardShakeAnim }],
        marginVertical: 4.5,
      }}
    >
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.assessmentCardBase,
          isSelected
            ? isWrong
              ? styles.assessmentCardWrong
              : styles.assessmentCardSelected
            : styles.assessmentCardDefault,
        ]}
      >
        <View
          style={[
            styles.optionLetterBadge,
            isSelected
              ? isWrong
                ? styles.optionLetterBadgeWrong
                : styles.optionLetterBadgeSelected
              : styles.optionLetterBadgeDefault,
          ]}
        >
          <Text
            style={[
              styles.optionLetterGlyph,
              isSelected
                ? isWrong
                  ? styles.optionLetterGlyphWrong
                  : styles.optionLetterGlyphSelected
                : styles.optionLetterGlyphDefault,
            ]}
          >
            {letter}
          </Text>
        </View>

        <Text
          style={[
            styles.optionTextLabel,
            isSelected
              ? isWrong
                ? styles.optionTextLabelWrong
                : styles.optionTextLabelSelected
              : styles.optionTextLabelDefault,
          ]}
        >
          {text}
        </Text>

        <View
          style={[
            styles.optionRadioCircle,
            isSelected
              ? isWrong
                ? styles.optionRadioCircleWrong
                : styles.optionRadioCircleSelected
              : styles.optionRadioCircleDefault,
          ]}
        >
          {isSelected ? (
            isWrong ? (
              <Ionicons name="close" size={14} color="#FFFFFF" />
            ) : (
              <Ionicons name="checkmark" size={13} color="#151518" />
            )
          ) : (
            <View style={styles.optionRadioEmptyDot} />
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const REMINDER_PRESETS = [
  { id: 'morning', label: 'Morning', time: '8:00 AM', hour: 8, minute: 0, icon: 'sunny-outline' as const, tag: 'Fresh start' },
  { id: 'afternoon', label: 'Afternoon', time: '1:00 PM', hour: 13, minute: 0, icon: 'partly-sunny-outline' as const, tag: 'Lunch break' },
  { id: 'evening', label: 'Evening', time: '7:00 PM', hour: 19, minute: 0, icon: 'moon-outline' as const, tag: 'Most popular', isPopular: true },
  { id: 'night', label: 'Night', time: '9:30 PM', hour: 21, minute: 30, icon: 'bed-outline' as const, tag: 'Bedtime review' },
];

function formatTimeDisplay(hour: number, minute: number) {
  const period = hour >= 12 ? 'PM' : 'AM';
  let h12 = hour % 12;
  if (h12 === 0) h12 = 12;
  const hStr = h12 < 10 ? `0${h12}` : `${h12}`;
  const mStr = minute < 10 ? `0${minute}` : `${minute}`;
  return {
    h12,
    hStr,
    mStr,
    period,
    formatted: `${h12}:${mStr} ${period}`,
  };
}

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<any>(null);

  // Flow navigation state
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [history, setHistory] = useState<OnboardingStep[]>([]);
  // Cinematic intro disabled by default so app reloads immediately with zero black screen
  const [showCinematic, setShowCinematic] = useState<boolean>(false);

  // User Selections
  const [country, setCountry] = useState('IN');
  const [countryName, setCountryName] = useState('India');
  const [callingCode, setCallingCode] = useState('+91');
  const [searchCountry, setSearchCountry] = useState('');
  const [language, setLanguage] = useState<AppLanguage>('Hindi');
  const [email, setEmail] = useState('');
  const [accountType, setAccountType] = useState<'guest' | 'google' | 'email'>('guest');
  const [level, setLevel] = useState<UserLevel>('Beginner');

  // Assessment state
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [suggestedLevel, setSuggestedLevel] = useState<UserLevel>('Beginner');
  const [wrongQuestions, setWrongQuestions] = useState<Record<number, boolean>>({});

  // Blank vibration/shake animation
  const blankShakeAnim = useRef(new Animated.Value(0)).current;

  const triggerBlankShake = () => {
    try {
      Vibration.vibrate([0, 50, 40, 50]);
    } catch (e) {}

    blankShakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(blankShakeAnim, { toValue: -12, duration: 40, useNativeDriver: true }),
      Animated.timing(blankShakeAnim, { toValue: 12, duration: 40, useNativeDriver: true }),
      Animated.timing(blankShakeAnim, { toValue: -9, duration: 40, useNativeDriver: true }),
      Animated.timing(blankShakeAnim, { toValue: 9, duration: 40, useNativeDriver: true }),
      Animated.timing(blankShakeAnim, { toValue: -5, duration: 35, useNativeDriver: true }),
      Animated.timing(blankShakeAnim, { toValue: 5, duration: 35, useNativeDriver: true }),
      Animated.timing(blankShakeAnim, { toValue: 0, duration: 35, useNativeDriver: true }),
    ]).start();
  };

  // Goals & Routine
  const [goalMinutes, setGoalMinutes] = useState(10);
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [reminderHour, setReminderHour] = useState(19);
  const [reminderMinute, setReminderMinute] = useState(0);
  const [isTestingNotification, setIsTestingNotification] = useState(false);
  const [formulaTab, setFormulaTab] = useState<'Present' | 'Past' | 'Future'>('Present');

  const stepHour = (delta: number) => {
    setReminderHour((prev) => {
      let next = (prev + delta) % 24;
      if (next < 0) next += 24;
      return next;
    });
  };

  const stepMinute = (delta: number) => {
    setReminderMinute((prev) => {
      const intervals = [0, 15, 30, 45];
      let closestIdx = intervals.indexOf(prev);
      if (closestIdx === -1) {
        return delta > 0 ? 15 : 45;
      }
      let nextIdx = (closestIdx + delta) % intervals.length;
      if (nextIdx < 0) nextIdx += intervals.length;
      return intervals[nextIdx];
    });
  };

  const toggleAmPm = () => {
    setReminderHour((prev) => {
      if (prev >= 12) {
        return prev - 12;
      } else {
        return prev + 12;
      }
    });
  };

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  // Entrance animation for screen transitions
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Dedicated fluid question transition animations
  const questionFadeAnim = useRef(new Animated.Value(1)).current;
  const questionSlideAnim = useRef(new Animated.Value(0)).current;

  const triggerQuestionChange = (nextIndex: number) => {
    // Smooth horizontal glide with solid opacity to completely eliminate any screen blink/flash
    Animated.timing(questionSlideAnim, {
      toValue: -24,
      duration: 110,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setQIndex(nextIndex);
      questionSlideAnim.setValue(24);
      Animated.spring(questionSlideAnim, {
        toValue: 0,
        friction: 8,
        tension: 80,
        useNativeDriver: true,
      }).start();
    });
  };

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const transitionTo = (nextStep: OnboardingStep, isBack = false) => {
    fadeAnim.setValue(0.96);

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 160,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    if (isBack) {
      setCurrentStep(nextStep);
    } else {
      setHistory((prev) => [...prev, currentStep]);
      setCurrentStep(nextStep);
    }
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const handleBack = useCallback(() => {
    if (currentStep === 'assessment' && qIndex > 0) {
      Animated.timing(questionSlideAnim, {
        toValue: 24,
        duration: 110,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setQIndex((prev) => prev - 1);
        questionSlideAnim.setValue(-24);
        Animated.spring(questionSlideAnim, {
          toValue: 0,
          friction: 8,
          tension: 80,
          useNativeDriver: true,
        }).start();
      });
      return;
    }

    if (history.length > 0) {
      const prevStep = history[history.length - 1];
      setHistory((prev) => prev.slice(0, prev.length - 1));
      transitionTo(prevStep, true);
    } else if (currentStep !== 'welcome') {
      transitionTo('welcome', true);
    }
  }, [currentStep, qIndex, history]);

  // Hardware back button support
  useEffect(() => {
    const backAction = () => {
      if (currentStep !== 'welcome') {
        handleBack();
        return true;
      }
      if (router.canGoBack()) {
        router.back();
        return true;
      }
      BackHandler.exitApp();
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [currentStep, handleBack, router]);

  // Save profile and finish
  const finishOnboarding = async (targetRoute: '/' | '/formulas' = '/') => {
    SessionManager.setEntered(true);
    const profile: Partial<UserOnboardingProfile> = {
      country,
      countryName,
      callingCode,
      language,
      accountType,
      email,
      level,
      suggestedLevel,
      answers,
      dailyGoalMinutes: goalMinutes,
      remindersEnabled,
      reminderTime: formatTimeDisplay(reminderHour, reminderMinute).formatted,
      reminderHour,
      reminderMinute,
      onboardingCompleted: true,
      completedAt: new Date().toISOString(),
    };
    await UserProfileRepository.saveProfile(profile);
    await UserProfileRepository.setOnboardingCompleted(true);
    router.replace(targetRoute as any);
  };

  // Step Progress Calculation (1 to 12)
  const currentStepIndex = STEPS_ORDER.indexOf(currentStep);
  const progressPercent = Math.round(((Math.max(0, currentStepIndex) + 1) / 12) * 100);

  const t = getOnboardingStrings(language);

  useEffect(() => {
    UserProfileRepository.getProfile().then((p) => {
      if (p.language) {
        setLanguage(p.language);
      }
    });
  }, []);

  const handleCinematicComplete = useCallback(() => {
    setShowCinematic(false);
  }, []);

  // Top title mapping
  const stepTitles: Record<OnboardingStep, string> = {
    welcome: 'Welcome to Fluent',
    country: 'Country / Region',
    language: t.language.topTitle,
    account: t.account.topTitle,
    level: t.level.topTitle,
    assessmentIntro: t.assessmentIntro.topTitle,
    assessment: t.assessment.topTitle,
    result: t.result.topTitle,
    goal: t.goal.topTitle,
    reminders: t.reminders.topTitle,
    formulas: t.formulas.topTitle,
    ready: t.ready.topTitle,
  };

  // Assessment helpers
  const currentQuestions = t.assessment.questions[level] || t.assessment.questions.Beginner;
  const currentQuestion = currentQuestions[qIndex] || currentQuestions[0];

  const handleSelectAnswer = (optionIndex: number) => {
    const isCorrect = optionIndex === currentQuestion.correct;
    if (!isCorrect) {
      setWrongQuestions((prev) => ({ ...prev, [qIndex]: true }));
      triggerBlankShake();
    } else {
      try {
        Vibration.vibrate(35);
      } catch (e) {}
    }
    setAnswers((prev) => {
      const copy = [...prev];
      copy[qIndex] = optionIndex;
      return copy;
    });
  };

  const handleNextQuestion = () => {
    if (answers[qIndex] === undefined) {
      showToast(t.assessment.toastSelectAnswer);
      return;
    }

    // Strictly block progressing if current answer is not correct
    if (answers[qIndex] !== currentQuestion.correct) {
      triggerBlankShake();
      showToast(
        language === 'Hindi'
          ? 'गलत उत्तर! आगे बढ़ने के लिए सही विकल्प चुनें।'
          : language === 'Hinglish'
          ? 'Galat jawab! Aage badhne ke liye sahi option chunein.'
          : language === 'Spanish'
          ? '¡Incorrecto! Elige la opción correcta para avanzar.'
          : 'Incorrect! Please choose the correct option to continue.'
      );
      return;
    }

    if (qIndex < currentQuestions.length - 1) {
      triggerQuestionChange(qIndex + 1);
    } else {
      // Calculate score and suggestion based on first-attempt accuracy
      const score = answers.reduce(
        (acc, ans, idx) =>
          acc + (ans === currentQuestions[idx].correct && !wrongQuestions[idx] ? 1 : 0),
        0
      );
      let rec: UserLevel = level;
      if (score === 3) {
        rec = level;
      } else if (score === 2) {
        rec = level === 'Advanced' ? 'Intermediate' : level;
      } else {
        rec = level === 'Beginner' ? 'Beginner' : level === 'Advanced' ? 'Intermediate' : 'Beginner';
      }
      setSuggestedLevel(rec);
      transitionTo('result');
    }
  };

  const handleRestartAssessment = () => {
    questionFadeAnim.setValue(1);
    questionSlideAnim.setValue(0);
    blankShakeAnim.setValue(0);
    setQIndex(0);
    setAnswers([]);
    setWrongQuestions({});
    transitionTo('assessment');
  };

  // -------------------------------------------------------------
  // RENDERING INDIVIDUAL SCREENS
  // -------------------------------------------------------------

  // SCREEN 1: WELCOME
  const renderWelcome = () => (
    <View>
      <View style={[styles.heroCard, styles.welcomeHeroCard, { overflow: 'hidden' }]}>
        {/* Futuristic Rotating Celestial Orbits & Pulsing Sparks */}
        <HeroStageOrbits />

        <KineticKicker text="THINK · SPEAK · BE FLUENT" />
        <KineticHeroTitle fontSize={62} />
        
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Text style={styles.subtext}>Build confidence, </Text>
          <AnimatedPhrase text="one sentence" style={styles.subtext} />
          <Text style={styles.subtext}> at a time.</Text>
        </View>

        <View style={[styles.row, { justifyContent: 'center', marginTop: 18 }]}>
          <FloatingPill delay={0}>
            <View style={styles.chip}>
              <Text style={styles.chipText}>✦ 600+ formulas</Text>
            </View>
          </FloatingPill>
          <FloatingPill delay={900} style={{ marginLeft: 8 }}>
            <View style={styles.chip}>
              <Text style={styles.chipText}>◉ Hindi support</Text>
            </View>
          </FloatingPill>
        </View>
      </View>

      <View style={[styles.heroCard, { marginTop: 18, padding: 22, overflow: 'hidden' }]}>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.eyebrow}>YOUR NEXT CHAPTER</Text>
            <Text style={styles.welcomeSubhead}>
              Speak naturally.{'\n'}
              <AnimatedPhrase text="Think confidently." style={styles.welcomeSubhead} />
            </Text>
          </View>
          <LaunchEmblemBadge size={54} />
        </View>
        <Text style={[styles.subtext, { marginTop: 10 }]}>
          Learn English patterns with simple Hindi explanations, examples, quizzes, and guided AI practice.
        </Text>
        <View style={styles.actionColumn}>
          <FluentButton
            title="Get started"
            variant="lime"
            arrow
            onPress={() => transitionTo('country')}
          />
          <FluentButton
            title="I already have an account"
            variant="light"
            onPress={async () => {
              const isCompleted = await UserProfileRepository.isOnboardingCompleted();
              if (isCompleted) {
                SessionManager.setEntered(true);
                router.replace('/');
              } else {
                transitionTo('account');
              }
            }}
          />
        </View>
        <Text style={styles.footerNote}>Personalise your learning in a few quick steps.</Text>
      </View>
    </View>
  );

  // SCREEN 2: COUNTRY
  const renderCountry = () => {
    const filtered = COUNTRIES.filter((c) =>
      (c.name + ' ' + c.code).toLowerCase().includes(searchCountry.toLowerCase())
    );

    return (
      <View>
        <FluentProgressTrack progressPercent={progressPercent} />
        <View style={{ paddingTop: 4 }}>
          <Text style={styles.eyebrow}>STEP 1 OF SETUP</Text>
          <FluentHeading
            lines={[
              'Where are',
              { prefix: 'you', embossed: 'from?' },
            ]}
          />
          <Text style={styles.subtext}>Choose your country or region for the right local settings.</Text>
        </View>

        <View style={styles.searchWrapper}>
          <Ionicons name="search-outline" size={18} color="#85858E" style={styles.searchIcon} />
          <TextInput
            style={styles.searchField}
            placeholder="Search country..."
            placeholderTextColor="#9999A2"
            value={searchCountry}
            onChangeText={setSearchCountry}
            autoCapitalize="none"
          />
        </View>

        <ScrollView
          nestedScrollEnabled
          style={styles.countryScrollBox}
          contentContainerStyle={{ paddingBottom: 6 }}
          showsVerticalScrollIndicator={true}
        >
          {filtered.map((item) => {
            const isSelected = country === item.code;
            return (
              <TouchableOpacity
                key={item.code}
                activeOpacity={0.8}
                onPress={() => {
                  setCountry(item.code);
                  setCountryName(item.name);
                  setCallingCode(item.dial);
                }}
                style={[styles.choiceCard, isSelected && styles.choiceCardSelected]}
              >
                <Text style={styles.flagEmoji}>{item.flag}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.choiceTitle}>{item.name}</Text>
                  <Text style={styles.choiceSub}>Dial code {item.dial}</Text>
                </View>
                <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                  {isSelected && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.actionColumn}>
          <FluentButton
            title="Continue"
            variant="lime"
            arrow
            onPress={() => transitionTo('language')}
          />
        </View>
      </View>
    );
  };

  // SCREEN 3: LANGUAGE
  const renderLanguage = () => (
    <View>
      <FluentProgressTrack progressPercent={progressPercent} />
      <View style={{ paddingTop: 4 }}>
        <Text style={styles.eyebrow}>{t.language.eyebrow}</Text>
        <FluentHeading lines={t.language.heading} />
        <Text style={styles.subtext}>
          {t.language.subtext}
        </Text>
      </View>

      <View style={{ marginTop: 18 }}>
        {LANGUAGES.map((l) => {
          const isSelected = language === l.id;
          return (
            <TouchableOpacity
              key={l.id}
              activeOpacity={0.8}
              onPress={() => {
                setLanguage(l.id);
                UserProfileRepository.saveProfile({ language: l.id });
              }}
              style={[styles.choiceCard, isSelected && styles.choiceCardSelected]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.choiceTitle}>{l.label}</Text>
                <Text style={styles.choiceSub}>{l.sub}</Text>
              </View>
              <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                {isSelected && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.softCard, { marginTop: 16 }]}>
        <View style={styles.row}>
          <Text style={{ fontSize: 20 }}>🌐</Text>
          <Text style={[styles.smallText, { flex: 1, marginLeft: 10 }]}>
            {t.language.infoNote}
          </Text>
        </View>
      </View>

      <View style={styles.actionColumn}>
        <FluentButton
          title={t.language.continueBtn.replace(' →', '')}
          variant="lime"
          arrow
          onPress={() => transitionTo('account')}
        />
      </View>
    </View>
  );

  // SCREEN 4: ACCOUNT
  const renderAccount = () => {
    const handleGoogle = () => {
      setAccountType('google');
      showToast(t.account.toastGoogle);
      setTimeout(() => transitionTo('level'), 350);
    };

    const handleEmail = () => {
      const trimmed = email.trim();
      if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
        showToast(t.account.toastInvalidEmail);
        return;
      }
      setAccountType('email');
      showToast(t.account.toastAccountReady(trimmed));
      setTimeout(() => transitionTo('level'), 350);
    };

    const handleGuest = () => {
      setAccountType('guest');
      showToast(t.account.toastGuest);
      transitionTo('level');
    };

    return (
      <View>
        <FluentProgressTrack progressPercent={progressPercent} />
        <View style={{ paddingTop: 4 }}>
          <Text style={styles.eyebrow}>{t.account.eyebrow}</Text>
          <FluentHeading lines={t.account.heading} />
          <Text style={styles.subtext}>
            {t.account.subtext}
          </Text>
        </View>

        <View style={[styles.heroCard, { padding: 20, marginTop: 20 }]}>
          <TouchableOpacity activeOpacity={0.85} onPress={handleGoogle} style={styles.googleButton}>
            <View style={styles.googleIconBox}>
              <Text style={styles.googleLetter}>G</Text>
            </View>
            <Text style={styles.googleButtonText}>{t.account.googleBtn}</Text>
            <Text style={{ fontSize: 17, color: '#19191D' }}>→</Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t.account.divider}</Text>
            <View style={styles.dividerLine} />
          </View>

          <Text style={styles.inputLabel}>{t.account.emailLabel}</Text>
          <TextInput
            style={styles.fieldInput}
            placeholder={t.account.emailPlaceholder}
            placeholderTextColor="#9999A2"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={[styles.smallText, { marginTop: 10 }]}>
            {t.account.terms}
          </Text>

          <View style={{ marginTop: 16 }}>
            <FluentButton
              title={t.account.emailBtn}
              variant="lime"
              arrow
              onPress={handleEmail}
            />
          </View>
        </View>

        <TouchableOpacity activeOpacity={0.7} onPress={handleGuest} style={styles.textButton}>
          <Text style={styles.textButtonLabel}>{t.account.guestBtn}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // SCREEN 5: LEVEL
  const renderLevel = () => {
    const levelCards: { id: UserLevel; emoji: string; title: string; desc: string; sub: string }[] = [
      {
        id: 'Beginner',
        emoji: '🌱',
        title: t.level.levels.Beginner.title,
        desc: t.level.levels.Beginner.desc,
        sub: t.level.levels.Beginner.sub,
      },
      {
        id: 'Intermediate',
        emoji: '🚀',
        title: t.level.levels.Intermediate.title,
        desc: t.level.levels.Intermediate.desc,
        sub: t.level.levels.Intermediate.sub,
      },
      {
        id: 'Advanced',
        emoji: '⚡',
        title: t.level.levels.Advanced.title,
        desc: t.level.levels.Advanced.desc,
        sub: t.level.levels.Advanced.sub,
      },
    ];

    return (
      <View>
        <FluentProgressTrack progressPercent={progressPercent} />
        <View style={{ paddingTop: 4 }}>
          <Text style={styles.eyebrow}>{t.level.eyebrow}</Text>
          <FluentHeading lines={t.level.heading} />
          <Text style={styles.subtext}>
            {t.level.subtext}
          </Text>
        </View>

        <View style={{ marginTop: 18 }}>
          {levelCards.map((c) => {
            const isSelected = level === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                activeOpacity={0.8}
                onPress={() => setLevel(c.id)}
                style={[
                  styles.choiceCard,
                  isSelected && styles.levelCardSelected,
                  { paddingVertical: 16 },
                ]}
              >
                <View style={styles.row}>
                  <Text style={{ fontSize: 26, marginRight: 12 }}>{c.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.choiceTitle}>{c.title}</Text>
                    <Text style={styles.choiceSub}>{c.desc}</Text>
                  </View>
                  {isSelected && <Text style={styles.checkTick}>✓</Text>}
                </View>
                <Text style={[styles.smallText, { marginLeft: 38, marginTop: 4 }]}>{c.sub}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.actionColumn}>
          <FluentButton
            title={t.level.continueBtn}
            variant="lime"
            arrow
            onPress={() => transitionTo('assessmentIntro')}
          />
        </View>
        <Text style={styles.footerNote}>{t.level.footerNote}</Text>
      </View>
    );
  };

  // SCREEN 6: ASSESSMENT INTRO
  const renderAssessmentIntro = () => (
    <View>
      <FluentProgressTrack progressPercent={progressPercent} />
      <FluentOrb size={100} />

      <View style={{ alignItems: 'center', marginTop: 4 }}>
        <Text style={styles.eyebrow}>{t.assessmentIntro.eyebrow}</Text>
        <FluentHeading
          center
          fontSize={32}
          lines={t.assessmentIntro.heading}
        />
        <Text style={[styles.subtext, { textAlign: 'center', marginTop: 4 }]}>
          {t.assessmentIntro.subtext(t.level.levels[level]?.title || level)}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>3</Text>
          <Text style={styles.statLabel}>{t.assessmentIntro.statQuestions}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{t.assessmentIntro.statTimeVal}</Text>
          <Text style={styles.statLabel}>{t.assessmentIntro.statTime}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{t.assessmentIntro.statPathVal}</Text>
          <Text style={styles.statLabel}>{t.assessmentIntro.statPath}</Text>
        </View>
      </View>

      <View style={[styles.heroCard, { padding: 16, marginTop: 14 }]}>
        <View style={styles.row}>
          <View style={styles.featureIconBadge}>
            <Text style={{ fontSize: 16 }}>✦</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#19191D' }}>
              {t.assessmentIntro.noPressureTitle}
            </Text>
            <Text style={[styles.smallText, { marginTop: 2 }]}>
              {t.assessmentIntro.noPressureDesc}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.actionColumn}>
        <FluentButton
          title={t.assessmentIntro.startBtn}
          variant="lime"
          arrow
          onPress={() => {
            questionFadeAnim.setValue(1);
            questionSlideAnim.setValue(0);
            blankShakeAnim.setValue(0);
            setQIndex(0);
            setAnswers([]);
            setWrongQuestions({});
            transitionTo('assessment');
          }}
        />
        <FluentButton
          title={t.assessmentIntro.skipBtn}
          variant="light"
          onPress={() => transitionTo('goal')}
        />
      </View>
      <Text style={styles.footerNote}>{t.assessmentIntro.footerNote}</Text>
    </View>
  );

  // SCREEN 7: ASSESSMENT QUESTIONS (Interactive Sentence Stage, Segmented HUD & Tactile Cards)
  const renderAssessment = () => {
    const selectedAnswer = answers[qIndex];
    const isSelected = selectedAnswer !== undefined;
    const isSelectedCorrect = isSelected && selectedAnswer === currentQuestion.correct;
    const isSelectedWrong = isSelected && !isSelectedCorrect;
    const parsed = parseAssessmentQuestion(currentQuestion.q);

    return (
      <View style={{ paddingBottom: 28 }}>
        {/* Sleek Segmented Progress HUD */}
        <View style={styles.assessmentHud}>
          <View style={styles.hudTopRow}>
            <View style={styles.hudTrackChip}>
              <View style={styles.hudPulsingDot} />
              <Text style={styles.hudTrackChipText}>
                {t.assessment.trackChip(level).toUpperCase()}
              </Text>
            </View>

            <View style={styles.hudCountBadge}>
              <Ionicons name="sparkles" size={13} color="#789600" style={{ marginRight: 4 }} />
              <Text style={styles.hudCountBadgeText}>
                {t.assessment.questionProgress(qIndex + 1, currentQuestions.length)}
              </Text>
            </View>
          </View>

          <View style={styles.hudSegmentedTrack}>
            {currentQuestions.map((_, idx) => {
              const isDone = idx < qIndex;
              const isCurrent = idx === qIndex;
              return (
                <View key={idx} style={styles.hudSegmentSlot}>
                  <View
                    style={[
                      styles.hudSegmentBar,
                      isDone && styles.hudSegmentBarDone,
                      isCurrent && styles.hudSegmentBarCurrent,
                    ]}
                  />
                </View>
              );
            })}
          </View>
        </View>

        {/* Animated Question Content */}
        <Animated.View
          style={{
            opacity: questionFadeAnim,
            transform: [{ translateX: questionSlideAnim }],
          }}
        >
          {/* Main Hero Card */}
          <View style={styles.assessmentHeroCard}>
            {/* Header: Category Badge & Streak */}
            <View style={styles.assessmentTopicRow}>
              <View style={styles.topicCapsule}>
                <Ionicons name="bookmark" size={11} color="#789600" style={{ marginRight: 5 }} />
                <Text style={styles.topicCapsuleText}>{currentQuestion.sub.toUpperCase()}</Text>
              </View>
              <View style={styles.streakBadge}>
                <Text style={styles.streakBadgeText}>⚡ +10 XP</Text>
              </View>
            </View>

            {/* Interactive Sentence Stage OR Standard Question Prompt */}
            {parsed.isFillInBlank ? (
              <View style={styles.interactiveStageCard}>
                {parsed.instruction ? (
                  <View style={styles.stageInstructionRow}>
                    <Ionicons name="create-outline" size={14} color="#789600" style={{ marginRight: 6 }} />
                    <Text style={styles.stageInstructionText}>{parsed.instruction}</Text>
                  </View>
                ) : null}

                <View style={styles.sentenceTokensRow}>
                  {parsed.prefix.split(/\s+/).filter(Boolean).map((word, wIdx) => (
                    <Text key={'pre_' + wIdx} style={styles.sentenceTokenText}>
                      {word}{' '}
                    </Text>
                  ))}

                  <Animated.View
                    style={[
                      styles.blankTokenCapsule,
                      isSelected
                        ? isSelectedWrong
                          ? styles.blankTokenCapsuleWrong
                          : styles.blankTokenCapsuleFilled
                        : styles.blankTokenCapsuleEmpty,
                      { transform: [{ translateX: blankShakeAnim }] },
                    ]}
                  >
                    <Text
                      style={[
                        styles.blankTokenCapsuleText,
                        isSelected
                          ? isSelectedWrong
                            ? styles.blankTokenCapsuleTextWrong
                            : styles.blankTokenCapsuleTextFilled
                          : styles.blankTokenCapsuleTextEmpty,
                      ]}
                    >
                      {isSelected
                        ? currentQuestion.opts[selectedAnswer]
                        : '  ?  '}
                    </Text>
                  </Animated.View>

                  {parsed.suffix.split(/\s+/).filter(Boolean).map((word, wIdx) => (
                    <Text key={'post_' + wIdx} style={styles.sentenceTokenText}>
                      {' '}{word}
                    </Text>
                  ))}
                </View>

                <View
                  style={[
                    styles.stageHintRow,
                    isSelectedWrong && styles.stageHintRowWrong,
                    isSelectedCorrect && styles.stageHintRowCorrect,
                  ]}
                >
                  <Ionicons
                    name={
                      isSelected
                        ? isSelectedWrong
                          ? 'close-circle'
                          : 'checkmark-circle'
                        : 'hand-left-outline'
                    }
                    size={15}
                    color={
                      isSelected
                        ? isSelectedWrong
                          ? '#E0261C'
                          : '#628000'
                        : '#8A8A96'
                    }
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.stageHintText,
                      isSelectedWrong && styles.stageHintTextWrong,
                      isSelectedCorrect && styles.stageHintTextCorrect,
                    ]}
                  >
                    {isSelected
                      ? isSelectedWrong
                        ? language === 'Hindi'
                          ? 'गलत उत्तर! शब्द कांप रहा है, सही विकल्प चुनें।'
                          : language === 'Hinglish'
                          ? 'Galat jawab! Word vibrate ho raha hai, sahi option chunein.'
                          : language === 'Spanish'
                          ? '¡Incorrecto! Elige la opción correcta.'
                          : 'Incorrect! Choose the correct option to continue.'
                        : language === 'Hindi'
                        ? 'शाबाश! बिल्कुल सही उत्तर।'
                        : language === 'Hinglish'
                        ? 'Bilkul sahi! Tap karke aage badhein.'
                        : language === 'Spanish'
                        ? '¡Correcto! Toca abajo para continuar.'
                        : 'Correct! Ready to proceed.'
                      : language === 'Hindi'
                      ? 'नीचे दिए गए सही विकल्प को चुनें'
                      : language === 'Hinglish'
                      ? 'Neeche sahi option choose karein'
                      : language === 'Spanish'
                      ? 'Elige la palabra correcta abajo'
                      : 'Choose the missing word below'}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.standardPromptCard}>
                <View style={styles.promptIconCircle}>
                  <Ionicons name="chatbubbles" size={22} color="#789600" />
                </View>
                <Text style={styles.standardPromptTitle}>{currentQuestion.q}</Text>
                <Text style={styles.standardPromptSub}>
                  Select the most accurate English sentence.
                </Text>
              </View>
            )}

            {/* Options List */}
            <View style={{ marginTop: 14 }}>
              {currentQuestion.opts.map((opt, idx) => {
                const isThisSelected = selectedAnswer === idx;
                const isThisWrong = isThisSelected && isSelectedWrong;
                const letter = String.fromCharCode(65 + idx);
                return (
                  <AssessmentOptionCard
                    key={idx}
                    letter={letter}
                    text={opt}
                    isSelected={isThisSelected}
                    isWrong={isThisWrong}
                    onPress={() => handleSelectAnswer(idx)}
                  />
                );
              })}
            </View>
          </View>
        </Animated.View>

        {/* Action Button & Footnote */}
        <View style={styles.assessmentActionSection}>
          {isSelected ? (
            <View
              style={[
                styles.liveFeedbackRow,
                isSelectedWrong && styles.liveFeedbackRowWrong,
                isSelectedCorrect && styles.liveFeedbackRowCorrect,
              ]}
            >
              <Ionicons
                name={isSelectedWrong ? 'alert-circle' : 'sparkles'}
                size={14}
                color={isSelectedWrong ? '#E0261C' : '#6A8800'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.liveFeedbackText,
                  isSelectedWrong && styles.liveFeedbackTextWrong,
                  isSelectedCorrect && styles.liveFeedbackTextCorrect,
                ]}
              >
                {isSelectedWrong
                  ? language === 'Hindi'
                    ? 'गलत विकल्प! आगे बढ़ने के लिए सही उत्तर चुनें।'
                    : language === 'Hinglish'
                    ? 'Galat option! Aage badhne ke liye sahi answer select karein.'
                    : language === 'Spanish'
                    ? 'Elige la opción correcta para avanzar.'
                    : 'Choose the correct answer to continue.'
                  : qIndex === currentQuestions.length - 1
                  ? 'All correct! Ready to see your placement results!'
                  : 'Answer correct! Tap Next to continue.'}
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            activeOpacity={isSelectedCorrect ? 0.82 : 1}
            disabled={!isSelectedCorrect}
            onPress={handleNextQuestion}
            style={[
              styles.assessmentSubmitBtn,
              isSelectedCorrect
                ? styles.assessmentSubmitBtnActive
                : styles.assessmentSubmitBtnDisabled,
            ]}
          >
            <Text
              style={[
                styles.assessmentSubmitBtnText,
                isSelectedCorrect
                  ? styles.assessmentSubmitBtnTextActive
                  : styles.assessmentSubmitBtnTextDisabled,
              ]}
            >
              {isSelectedWrong
                ? language === 'Hindi'
                  ? 'सही उत्तर चुनें'
                  : language === 'Hinglish'
                  ? 'Sahi answer chunein'
                  : 'Select correct answer'
                : qIndex === currentQuestions.length - 1
                ? t.assessment.seeResultBtn
                : t.assessment.nextBtn}
            </Text>
            <Ionicons
              name={isSelectedCorrect ? 'arrow-forward' : 'lock-closed'}
              size={17}
              color={isSelectedCorrect ? '#141418' : '#8E8E98'}
              style={{ marginLeft: 8 }}
            />
          </TouchableOpacity>

          <View style={styles.assessmentFootnoteRow}>
            <Ionicons name="shield-checkmark-outline" size={13} color="#8A8A96" style={{ marginRight: 5 }} />
            <Text style={styles.assessmentFootnoteText}>{t.assessment.footerNote}</Text>
          </View>
        </View>
      </View>
    );
  };

  // SCREEN 8: RESULT
  const renderResult = () => {
    const score = answers.reduce(
      (acc, ans, idx) =>
        acc + (ans === currentQuestions[idx].correct && !wrongQuestions[idx] ? 1 : 0),
      0
    );

    return (
      <View>
        <FluentProgressTrack progressPercent={progressPercent} />
        <FluentOrb size={90} />

        <View style={{ alignItems: 'center', marginTop: 4 }}>
          <Text style={styles.eyebrow}>{t.result.eyebrow}</Text>
          <FluentHeading
            center
            fontSize={32}
            lines={t.result.heading}
          />
          <Text style={[styles.subtext, { textAlign: 'center', marginTop: 4 }]}>
            {t.result.subtext(score, currentQuestions.length)}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{score}/{currentQuestions.length}</Text>
            <Text style={styles.statLabel}>{t.result.statCorrect}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: '#517B00' }]}>{suggestedLevel}</Text>
            <Text style={styles.statLabel}>{t.result.statSuggested}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{t.result.statStepVal}</Text>
            <Text style={styles.statLabel}>{t.result.statStep}</Text>
          </View>
        </View>

        <View style={[styles.heroCard, { padding: 18, marginTop: 14 }]}>
          <View style={styles.rowBetween}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#19191D' }}>{t.result.reviewTitle}</Text>
            <View style={styles.chip}>
              <Text style={styles.chipText}>{t.result.reviewChip(level)}</Text>
            </View>
          </View>

          {currentQuestions.map((q, idx) => {
            const isCorrect = answers[idx] === q.correct;
            return (
              <View key={idx} style={styles.reviewItem}>
                <View style={styles.row}>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: isCorrect ? '#517B00' : '#C5322A' }}>
                    {isCorrect ? '✓' : '↳'}
                  </Text>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#19191D' }}>{q.q}</Text>
                    <Text style={[styles.smallText, { marginTop: 4 }]}>{q.why}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.actionColumn}>
          <FluentButton
            title={t.result.buildPlanBtn}
            variant="lime"
            arrow
            onPress={() => {
              setLevel(suggestedLevel);
              transitionTo('goal');
            }}
          />
          <FluentButton
            title={t.result.tryAgainBtn}
            variant="light"
            onPress={handleRestartAssessment}
          />
        </View>
      </View>
    );
  };

  // SCREEN 9: DAILY GOAL
  const renderGoal = () => {
    const goals = t.goal.goals;

    return (
      <View>
        <FluentProgressTrack progressPercent={progressPercent} />
        <View style={{ paddingTop: 4 }}>
          <Text style={styles.eyebrow}>{t.goal.eyebrow}</Text>
          <FluentHeading lines={t.goal.heading} />
          <Text style={styles.subtext}>
            {t.goal.subtext}
          </Text>
        </View>

        <View style={styles.goalGrid}>
          {goals.map((g) => {
            const isSelected = goalMinutes === g.min;
            return (
              <TouchableOpacity
                key={g.min}
                activeOpacity={0.8}
                onPress={() => setGoalMinutes(g.min)}
                style={[styles.goalCard, isSelected && styles.goalCardSelected]}
              >
                <Text style={{ fontSize: 24 }}>{g.emoji}</Text>
                <Text style={styles.goalMinNumber}>{g.min} min</Text>
                <Text style={styles.choiceTitle}>{g.title}</Text>
                <Text style={styles.choiceSub}>{g.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={[styles.heroCard, { padding: 16, marginTop: 16 }]}>
          <View style={styles.row}>
            <Text style={{ fontSize: 24 }}>🎯</Text>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#19191D' }}>
                {t.goal.goalSummaryTitle(goalMinutes)}
              </Text>
              <Text style={[styles.smallText, { marginTop: 2 }]}>
                {t.goal.goalSummaryDesc}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actionColumn}>
          <FluentButton
            title={t.goal.continueBtn}
            variant="lime"
            arrow
            onPress={() => transitionTo('reminders')}
          />
        </View>
      </View>
    );
  };

  // SCREEN 10: REMINDERS (Time Selection & Working Daily Local Notifications)
  const renderReminders = () => {
    const timeDisplay = formatTimeDisplay(reminderHour, reminderMinute);

    const handleToggleReminder = () => {
      const nextState = !remindersEnabled;
      setRemindersEnabled(nextState);
      if (nextState) {
        showToast(
          language === 'Hindi'
            ? `प्रतिदिन ${timeDisplay.formatted} पर रिमाइंडर सेट है!`
            : language === 'Hinglish'
            ? `Daily reminder ${timeDisplay.formatted} par set hai!`
            : `Daily reminder set for ${timeDisplay.formatted}!`
        );
      } else {
        showToast(t.reminders.toastOff);
      }
    };

    const handleSelectPreset = (hour: number, minute: number) => {
      setReminderHour(hour);
      setReminderMinute(minute);
      setRemindersEnabled(true);
      const newDisplay = formatTimeDisplay(hour, minute);
      showToast(
        language === 'Hindi'
          ? `रिमाइंडर का समय बदलकर ${newDisplay.formatted} कर दिया गया`
          : language === 'Hinglish'
          ? `Reminder time ${newDisplay.formatted} set ho gaya`
          : `Reminder time updated to ${newDisplay.formatted}`
      );
    };

    const handleTestNotification = async () => {
      setIsTestingNotification(true);
      try {
        Vibration.vibrate([0, 70, 40, 70]);
      } catch (e) {}
      const res = await ReminderNotificationService.sendTestNotification(language);
      setIsTestingNotification(false);
      if (res.isNative) {
        showToast(
          language === 'Hindi'
            ? '🔔 टेस्ट रिमाइंडर भेजा गया! नोटिफिकेशन बार चेक करें।'
            : language === 'Hinglish'
            ? '🔔 Test reminder bhej diya gaya! Notification bar check karein.'
            : '🔔 Test reminder sent! Check your notification bar.'
        );
      } else {
        showToast(
          language === 'Hindi'
            ? `🔔 टेस्ट रिमाइंडर सक्रिय! प्रतिदिन ${timeDisplay.formatted} पर आएगा।`
            : language === 'Hinglish'
            ? `🔔 Test reminder active! Daily ${timeDisplay.formatted} par aayega.`
            : `🔔 Test reminder active! Set for ${timeDisplay.formatted} daily.`
        );
      }
    };

    const handleContinueReminders = async () => {
      if (remindersEnabled) {
        await ReminderNotificationService.scheduleDailyReminder(
          reminderHour,
          reminderMinute,
          language
        );
        showToast(
          language === 'Hindi'
            ? `🔔 प्रतिदिन ${timeDisplay.formatted} के लिए रिमाइंडर सेट है!`
            : language === 'Hinglish'
            ? `🔔 Daily reminder ${timeDisplay.formatted} ke liye set ho gaya!`
            : `🔔 Daily reminder set for ${timeDisplay.formatted}!`
        );
      } else {
        await ReminderNotificationService.cancelReminders();
      }
      transitionTo('formulas');
    };

    return (
      <View style={{ paddingBottom: 28 }}>
        <FluentProgressTrack progressPercent={progressPercent} />

        {/* Bell Hero Header */}
        <View style={{ alignItems: 'center', marginVertical: 14 }}>
          <View style={[styles.bellOrb, remindersEnabled && styles.bellOrbActive]}>
            <Ionicons
              name={remindersEnabled ? 'notifications' : 'notifications-outline'}
              size={36}
              color={remindersEnabled ? '#171717' : '#777782'}
            />
          </View>
        </View>

        <View style={{ alignItems: 'center' }}>
          <Text style={styles.eyebrow}>{t.reminders.eyebrow}</Text>
          <FluentHeading center fontSize={32} lines={t.reminders.heading} />
          <Text style={[styles.subtext, { textAlign: 'center', marginTop: 4 }]}>
            {t.reminders.subtext}
          </Text>
        </View>

        {/* Master Reminder Card */}
        <View style={[styles.heroCard, { padding: 18, marginTop: 18 }]}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#19191D' }}>
                  {t.reminders.cardTitle}
                </Text>
                {remindersEnabled && (
                  <View style={styles.activePillBadge}>
                    <Text style={styles.activePillText}>ACTIVE</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.choiceSub, { marginTop: 4 }]}>
                {remindersEnabled
                  ? `🔔 Every day at ${timeDisplay.formatted}`
                  : 'Notifications paused • Tap toggle to enable'}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleToggleReminder}
              style={[
                styles.toggleButton,
                remindersEnabled && styles.toggleButtonActive,
              ]}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '900',
                  color: remindersEnabled ? '#171717' : '#777780',
                }}
              >
                {remindersEnabled ? '✓' : '○'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Time Selection Section (Shown when reminders are enabled) */}
          {remindersEnabled && (
            <View style={{ marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(30, 30, 40, 0.08)' }}>
              {/* Presets Header */}
              <View style={styles.timeSectionHeaderRow}>
                <Ionicons name="time-outline" size={14} color="#658000" style={{ marginRight: 5 }} />
                <Text style={styles.timeSectionLabel}>CHOOSE YOUR PRACTICE TIME</Text>
              </View>

              {/* 2x2 Preset Grid */}
              <View style={styles.presetGrid}>
                {REMINDER_PRESETS.map((preset) => {
                  const isPresetActive =
                    reminderHour === preset.hour && reminderMinute === preset.minute;
                  return (
                    <TouchableOpacity
                      key={preset.id}
                      activeOpacity={0.82}
                      onPress={() => handleSelectPreset(preset.hour, preset.minute)}
                      style={[
                        styles.presetCard,
                        isPresetActive && styles.presetCardActive,
                      ]}
                    >
                      <View style={styles.presetTopRow}>
                        <Ionicons
                          name={preset.icon}
                          size={16}
                          color={isPresetActive ? '#19191D' : '#686874'}
                        />
                        {preset.isPopular && (
                          <View style={styles.popularMiniTag}>
                            <Text style={styles.popularMiniTagText}>POPULAR</Text>
                          </View>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.presetTimeText,
                          isPresetActive && styles.presetTimeTextActive,
                        ]}
                      >
                        {preset.time}
                      </Text>
                      <Text style={styles.presetLabelText}>{preset.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Custom Time Stepper */}
              <View style={styles.customTimeBox}>
                <Text style={styles.customTimeHeaderLabel}>Custom time adjust:</Text>
                <View style={styles.timeDialRow}>
                  {/* Hour Dial */}
                  <View style={styles.dialColumn}>
                    <TouchableOpacity
                      onPress={() => stepHour(1)}
                      style={styles.dialStepBtn}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="chevron-up" size={16} color="#19191D" />
                    </TouchableOpacity>
                    <View style={styles.dialNumberBox}>
                      <Text style={styles.dialNumberText}>{timeDisplay.hStr}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => stepHour(-1)}
                      style={styles.dialStepBtn}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="chevron-down" size={16} color="#19191D" />
                    </TouchableOpacity>
                    <Text style={styles.dialUnitLabel}>Hour</Text>
                  </View>

                  <Text style={styles.dialColon}>:</Text>

                  {/* Minute Dial */}
                  <View style={styles.dialColumn}>
                    <TouchableOpacity
                      onPress={() => stepMinute(1)}
                      style={styles.dialStepBtn}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="chevron-up" size={16} color="#19191D" />
                    </TouchableOpacity>
                    <View style={styles.dialNumberBox}>
                      <Text style={styles.dialNumberText}>{timeDisplay.mStr}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => stepMinute(-1)}
                      style={styles.dialStepBtn}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="chevron-down" size={16} color="#19191D" />
                    </TouchableOpacity>
                    <Text style={styles.dialUnitLabel}>Minute</Text>
                  </View>

                  {/* AM / PM Segmented Control */}
                  <View style={styles.ampmSwitchContainer}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={toggleAmPm}
                      style={[
                        styles.ampmPill,
                        timeDisplay.period === 'AM' && styles.ampmPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.ampmText,
                          timeDisplay.period === 'AM' && styles.ampmTextActive,
                        ]}
                      >
                        AM
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={toggleAmPm}
                      style={[
                        styles.ampmPill,
                        timeDisplay.period === 'PM' && styles.ampmPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.ampmText,
                          timeDisplay.period === 'PM' && styles.ampmTextActive,
                        ]}
                      >
                        PM
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Instant Test Reminder Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleTestNotification}
                disabled={isTestingNotification}
                style={styles.testNotificationBtn}
              >
                <Ionicons name="paper-plane-outline" size={14} color="#526900" style={{ marginRight: 6 }} />
                <Text style={styles.testNotificationBtnText}>
                  {isTestingNotification
                    ? 'Sending test notification...'
                    : '🔔 Send test reminder to this device'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.actionColumn}>
          <FluentButton
            title={t.reminders.continueBtn}
            variant="lime"
            arrow
            onPress={handleContinueReminders}
          />
          <FluentButton
            title={t.reminders.maybeLaterBtn}
            variant="light"
            onPress={async () => {
              setRemindersEnabled(false);
              await ReminderNotificationService.cancelReminders();
              transitionTo('formulas');
            }}
          />
        </View>
        <Text style={styles.footerNote}>{t.reminders.footerNote}</Text>
      </View>
    );
  };

  // SCREEN 11: FORMULA INTRO
  const renderFormulaIntro = () => {
    const data = t.formulas.formulaData[formulaTab];

    return (
      <View>
        <FluentProgressTrack progressPercent={progressPercent} />
        <View style={{ paddingTop: 4 }}>
          <Text style={styles.eyebrow}>{t.formulas.eyebrow}</Text>
          <FluentHeading lines={t.formulas.heading} />
          <Text style={styles.subtext}>
            {t.formulas.subtext}
          </Text>
        </View>

        {/* 3D Visual Card Deck */}
        <View style={styles.deckContainer}>
          <View style={styles.deckBackCard2}>
            <Text style={styles.deckCardCategory}>{t.formulas.deckCategoryCollection}</Text>
            <Text style={styles.deckCardFormula}>S + V + O</Text>
            <Text style={styles.deckCardNote}>{t.formulas.deckNoteCollection}</Text>
          </View>

          <View style={styles.deckBackCard1}>
            <Text style={styles.deckCardCategory}>{t.formulas.deckCategoryPractice}</Text>
            <Text style={styles.deckCardFormula}>EN ↔ {language === 'Spanish' ? 'ES' : 'HI'}</Text>
            <Text style={styles.deckCardNote}>{t.formulas.deckNotePractice}</Text>
          </View>

          <View style={styles.deckFrontCard}>
            <Text style={styles.deckCardCategory}>{t.formulas.deckCategoryTense(formulaTab)}</Text>
            <Text style={styles.deckCardFormula}>{data.structure}</Text>
            <Text style={styles.deckCardNote}>{t.formulas.deckNoteTense}</Text>
          </View>
        </View>

        {/* Interactive Tabs */}
        <View style={styles.tabBar}>
          {(['Present', 'Past', 'Future'] as const).map((tKey) => {
            const isActive = formulaTab === tKey;
            return (
              <TouchableOpacity
                key={tKey}
                activeOpacity={0.8}
                onPress={() => setFormulaTab(tKey)}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
              >
                <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
                  {t.formulas.tabs[tKey]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected Formula Breakdown */}
        <View style={[styles.heroCard, { padding: 18 }]}>
          <View style={styles.rowBetween}>
            <View style={styles.chip}>
              <Text style={styles.chipText}>{t.formulas.chipExample}</Text>
            </View>
            <View style={[styles.chip, { backgroundColor: '#D4FF00', borderColor: 'transparent' }]}>
              <Text style={[styles.chipText, { color: '#171717', fontWeight: '800' }]}>{formulaTab}</Text>
            </View>
          </View>

          <Text style={styles.formulaTitle}>{data.title}</Text>
          <Text style={styles.formulaStructureText}>{data.structure}</Text>

          <Text style={[styles.smallText, { marginTop: 10, color: '#777780' }]}>
            {t.formulas.translationLabel}
          </Text>
          <Text style={styles.hindiSentenceText}>{data.translation}</Text>

          <Text style={[styles.smallText, { marginTop: 12, color: '#777780' }]}>
            {t.formulas.highlightLabel}
          </Text>
          <Text style={styles.englishSentenceText}>
            {data.prefix}
            <Text style={styles.highlightRed}>{data.highlight}</Text>
            {data.suffix}
          </Text>
        </View>

        <View style={[styles.featureRow, { marginTop: 14 }]}>
          <View style={styles.featureIconBadge}>
            <Text style={{ fontSize: 14 }}>✓</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#19191D' }}>
              {t.formulas.feature1Title}
            </Text>
            <Text style={[styles.smallText, { marginTop: 2 }]}>
              {t.formulas.feature1Desc}
            </Text>
          </View>
        </View>

        <View style={styles.featureRow}>
          <View style={styles.featureIconBadge}>
            <Text style={{ fontSize: 14 }}>✦</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#19191D' }}>
              {t.formulas.feature2Title}
            </Text>
            <Text style={[styles.smallText, { marginTop: 2 }]}>
              {t.formulas.feature2Desc}
            </Text>
          </View>
        </View>

        <View style={styles.actionColumn}>
          <FluentButton
            title={t.formulas.continueBtn}
            variant="lime"
            arrow
            onPress={() => transitionTo('ready')}
          />
        </View>
      </View>
    );
  };

  // SCREEN 12: READY
  const renderReady = () => (
    <View>
      <FluentOrb size={88} state="listening" />

      <View style={{ alignItems: 'center', marginTop: 4 }}>
        <Text style={styles.eyebrow}>{t.ready.eyebrow}</Text>
        <FluentHeading
          center
          fontSize={30}
          lines={t.ready.heading}
        />
        <Text style={[styles.subtext, { textAlign: 'center', marginTop: 4 }]}>
          {t.ready.subtext}
        </Text>
      </View>

      <View style={[styles.heroCard, { padding: 18, marginTop: 16 }]}>
        <View style={styles.rowBetween}>
          <Text style={[styles.smallText, { flex: 1, marginRight: 8 }]} numberOfLines={1}>{t.ready.labelCountry}</Text>
          <Text style={styles.summaryValueText}>{countryName}</Text>
        </View>
        <View style={[styles.rowBetween, { marginTop: 12 }]}>
          <Text style={[styles.smallText, { flex: 1, marginRight: 8 }]} numberOfLines={1}>{t.ready.labelLanguage}</Text>
          <Text style={styles.summaryValueText}>{language}</Text>
        </View>
        <View style={[styles.rowBetween, { marginTop: 12 }]}>
          <Text style={[styles.smallText, { flex: 1, marginRight: 8 }]} numberOfLines={1}>{t.ready.labelLevel}</Text>
          <View style={[styles.chip, { backgroundColor: '#D4FF00', borderColor: 'transparent' }]}>
            <Text style={[styles.chipText, { color: '#171717', fontWeight: '800' }]}>{level}</Text>
          </View>
        </View>
        <View style={[styles.rowBetween, { marginTop: 12 }]}>
          <Text style={[styles.smallText, { flex: 1, marginRight: 8 }]} numberOfLines={1}>{t.ready.labelGoal}</Text>
          <Text style={styles.summaryValueText}>{t.ready.goalValue(goalMinutes)}</Text>
        </View>
        <View style={[styles.rowBetween, { marginTop: 12 }]}>
          <Text style={[styles.smallText, { flex: 1, marginRight: 8 }]} numberOfLines={1}>{t.ready.labelReminder}</Text>
          <Text style={styles.summaryValueText}>
            {remindersEnabled ? t.ready.reminderOn : t.ready.reminderOff}
          </Text>
        </View>
      </View>

      <View style={styles.checklistCard}>
        <View style={styles.checkline}>
          <Text style={styles.checkCircle}>✓</Text>
          <Text style={styles.checklineText}>{t.ready.check1}</Text>
        </View>
        <View style={styles.checkline}>
          <Text style={styles.checkCircle}>✓</Text>
          <Text style={styles.checklineText}>{t.ready.check2}</Text>
        </View>
        <View style={styles.checkline}>
          <Text style={styles.checkCircle}>✓</Text>
          <Text style={styles.checklineText}>{t.ready.check3}</Text>
        </View>
      </View>

      <View style={styles.actionColumn}>
        <FluentButton
          title={t.ready.startBtn}
          variant="lime"
          arrow
          onPress={() => finishOnboarding('/')}
        />
        <FluentButton
          title={t.ready.exploreBtn}
          variant="light"
          onPress={() => finishOnboarding('/formulas')}
        />
      </View>
    </View>
  );

  if (showCinematic) {
    return (
      <View style={styles.screenContainer}>
        <CinematicWelcomeExperience onComplete={handleCinematicComplete} />
      </View>
    );
  }

  return (
    <View style={[styles.screenContainer, { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 24 : 14), paddingBottom: insets.bottom }]}>
      {/* Futuristic Ambient Motion Scene */}
      <AmbientScene />

      {/* Top Bar */}
      <FluentTopBar
        title={stepTitles[currentStep] || 'Fluent'}
        showBack={currentStep !== 'welcome'}
        showHelp={!['welcome', 'ready'].includes(currentStep)}
        onBack={handleBack}
        onHelp={() =>
          Alert.alert(
            t.help.title,
            t.help.message
          )
        }
      />

      {/* Main Scrollable Content */}
      <ScrollView
        ref={scrollRef}
        style={styles.mainScrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
          }}
        >
          {currentStep === 'welcome' && renderWelcome()}
          {currentStep === 'country' && renderCountry()}
          {currentStep === 'language' && renderLanguage()}
          {currentStep === 'account' && renderAccount()}
          {currentStep === 'level' && renderLevel()}
          {currentStep === 'assessmentIntro' && renderAssessmentIntro()}
          {currentStep === 'assessment' && renderAssessment()}
          {currentStep === 'result' && renderResult()}
          {currentStep === 'goal' && renderGoal()}
          {currentStep === 'reminders' && renderReminders()}
          {currentStep === 'formulas' && renderFormulaIntro()}
          {currentStep === 'ready' && renderReady()}
        </Animated.View>
      </ScrollView>

      {/* Toast Notification */}
      {toastMessage && (
        <View style={styles.toastContainer}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: fluentTokens.bg,
  },
  mainScrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 56,
  },

  // Typography
  eyebrow: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.6,
    fontWeight: '800',
    color: '#777780',
    marginBottom: 4,
  },
  h1: {
    fontSize: 35,
    lineHeight: 36,
    fontWeight: '900',
    letterSpacing: -1.6,
    color: '#19191D',
    marginVertical: 8,
  },
  h1Large: {
    fontSize: 62,
    lineHeight: 55,
    fontWeight: '900',
    letterSpacing: -2.4,
    color: '#EBEBED',
    textAlign: 'center',
    marginVertical: 10,
    textShadowColor: 'rgba(25, 25, 32, 0.35)',
    textShadowOffset: { width: 3, height: 4.5 },
    textShadowRadius: 4.5,
  },
  outlineWord: {
    color: '#E7E7EA',
    textShadowColor: 'rgba(30, 30, 38, 0.32)',
    textShadowOffset: { width: 2.2, height: 3 },
    textShadowRadius: 3.5,
  },
  subtext: {
    fontSize: 14,
    lineHeight: 21,
    color: '#777780',
    fontWeight: '500',
  },
  smallText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#777780',
  },
  footerNote: {
    fontSize: 11,
    color: '#898991',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 12,
  },

  // Cards
  heroCard: {
    backgroundColor: '#EBEBF0',
    borderRadius: 28,
    padding: 20,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    ...Platform.select({
      ios: {
        shadowColor: '#C9C9CE',
        shadowOffset: { width: 4, height: 6 },
        shadowOpacity: 0.6,
        shadowRadius: 12,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  welcomeHeroCard: {
    alignItems: 'center',
    textAlign: 'center',
    paddingVertical: 24,
    paddingHorizontal: 14,
    minHeight: 232,
  },
  welcomeSubhead: {
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: -1.2,
    lineHeight: 27,
    color: '#19191D',
    marginTop: 6,
  },
  decorativeSparkle: {
    fontSize: 38,
    color: '#19191D',
  },
  softCard: {
    backgroundColor: '#E6E6EA',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(30, 30, 38, 0.08)',
  },

  // Chips & Badges
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(40, 40, 44, 0.1)',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#55555E',
  },

  // Layout & Actions
  actionColumn: {
    marginTop: 18,
  },
  textButton: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 10,
  },
  textButtonLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#777780',
  },

  // Search & List
  searchWrapper: {
    position: 'relative',
    marginVertical: 14,
  },
  searchIcon: {
    position: 'absolute',
    left: 14,
    top: 15,
    zIndex: 2,
  },
  searchField: {
    height: 48,
    borderRadius: 16,
    backgroundColor: '#E8E8EB',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    paddingLeft: 42,
    paddingRight: 14,
    fontSize: 14,
    color: '#19191D',
  },
  listContainer: {
    marginVertical: 6,
  },
  countryScrollBox: {
    maxHeight: 310,
    marginVertical: 6,
  },

  // Choice Cards
  choiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 20,
    backgroundColor: '#EBEBF0',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    marginVertical: 5,
    ...Platform.select({
      ios: {
        shadowColor: '#C9C9CE',
        shadowOffset: { width: 3, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 7,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  choiceCardSelected: {
    borderColor: '#19191D',
    borderWidth: 1.5,
  },
  levelCardSelected: {
    borderColor: '#A8C83D',
    backgroundColor: '#F4FFD0',
    borderWidth: 1.5,
  },
  flagEmoji: {
    fontSize: 24,
    width: 36,
    textAlign: 'center',
    marginRight: 10,
  },
  choiceTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#19191D',
  },
  choiceSub: {
    fontSize: 12,
    color: '#777780',
    marginTop: 2,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#9D9DA5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: '#28282C',
    backgroundColor: '#D4FF00',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#19191D',
  },
  checkTick: {
    fontSize: 18,
    fontWeight: '900',
    color: '#19191D',
    marginRight: 6,
  },

  // Google & Auth
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  googleIconBox: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  googleLetter: {
    fontSize: 17,
    fontWeight: '900',
    color: '#4285F4',
  },
  googleButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#19191D',
    flex: 1,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(40, 40, 44, 0.12)',
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#91919A',
    paddingHorizontal: 10,
    letterSpacing: 0.5,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#65656E',
    marginBottom: 6,
    marginLeft: 4,
  },
  fieldInput: {
    height: 48,
    borderRadius: 16,
    backgroundColor: '#E8E8EB',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#19191D',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 14,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#EBEBF0',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    ...Platform.select({
      ios: {
        shadowColor: '#C9C9CE',
        shadowOffset: { width: 2, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 5,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
    color: '#19191D',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#81818A',
    marginTop: 4,
  },
  featureIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: '#D4FF00',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Assessment Experience
  assessmentHud: {
    marginTop: 6,
    marginBottom: 12,
  },
  hudTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  hudTrackChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D4FF00',
    paddingHorizontal: 12,
    paddingVertical: 5.5,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#A4D600',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  hudPulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16161A',
    marginRight: 6,
  },
  hudTrackChipText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#16161A',
    letterSpacing: 0.6,
  },
  hudCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(40, 40, 50, 0.08)',
  },
  hudCountBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#3A3A46',
  },
  hudSegmentedTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hudSegmentSlot: {
    flex: 1,
    height: 6,
    borderRadius: 4,
    backgroundColor: '#D2D2DA',
    overflow: 'hidden',
  },
  hudSegmentBar: {
    height: '100%',
    width: '100%',
    backgroundColor: 'transparent',
    borderRadius: 4,
  },
  hudSegmentBarDone: {
    backgroundColor: '#D4FF00',
  },
  hudSegmentBarCurrent: {
    backgroundColor: '#D4FF00',
    ...Platform.select({
      ios: {
        shadowColor: '#B0E600',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
      },
    }),
  },
  assessmentHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    ...Platform.select({
      ios: {
        shadowColor: '#B8B8C4',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  assessmentTopicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  topicCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F5EA',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E1ECC0',
  },
  topicCapsuleText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#526900',
    letterSpacing: 0.6,
  },
  streakBadge: {
    backgroundColor: '#FAFCE8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EAF5BA',
  },
  streakBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#658000',
  },
  interactiveStageCard: {
    backgroundColor: '#F8F9FC',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: '#ECECF2',
    alignItems: 'center',
    marginBottom: 6,
  },
  stageInstructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  stageInstructionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#656574',
  },
  sentenceTokensRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  sentenceTokenText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#181822',
    letterSpacing: -0.3,
  },
  blankTokenCapsule: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 5,
    marginHorizontal: 6,
    marginVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blankTokenCapsuleFilled: {
    backgroundColor: '#D4FF00',
    borderColor: '#A8DF00',
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#A4D600',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.45,
        shadowRadius: 5,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  blankTokenCapsuleWrong: {
    backgroundColor: '#FF3B30',
    borderColor: '#D32F2F',
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#FF3B30',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.45,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  blankTokenCapsuleEmpty: {
    backgroundColor: '#FFFFFF',
    borderColor: '#9E9EA8',
    borderWidth: 2,
    borderStyle: 'dashed',
    minWidth: 64,
  },
  blankTokenCapsuleText: {
    letterSpacing: -0.2,
  },
  blankTokenCapsuleTextFilled: {
    fontSize: 20,
    fontWeight: '900',
    color: '#121217',
  },
  blankTokenCapsuleTextWrong: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  blankTokenCapsuleTextEmpty: {
    fontSize: 19,
    fontWeight: '800',
    color: '#868694',
  },
  stageHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stageHintRowWrong: {
    backgroundColor: '#FFF0F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  stageHintRowCorrect: {
    backgroundColor: '#F3FBDF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  stageHintText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7A7A88',
  },
  stageHintTextWrong: {
    color: '#D32F2F',
    fontWeight: '800',
  },
  stageHintTextCorrect: {
    color: '#4B6300',
    fontWeight: '800',
  },
  standardPromptCard: {
    backgroundColor: '#F8F9FC',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ECECF2',
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: 6,
  },
  promptIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F6DF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  standardPromptTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#16161D',
    textAlign: 'center',
    letterSpacing: -0.4,
    lineHeight: 25,
  },
  standardPromptSub: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#777786',
    textAlign: 'center',
    marginTop: 4,
  },
  assessmentCardBase: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  assessmentCardDefault: {
    backgroundColor: '#F6F6F9',
    borderColor: '#ECECF2',
  },
  assessmentCardSelected: {
    backgroundColor: '#F9FDEB',
    borderColor: '#A8DB00',
    ...Platform.select({
      ios: {
        shadowColor: '#9AC600',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  assessmentCardWrong: {
    backgroundColor: '#FFF1F0',
    borderColor: '#FF3B30',
    borderWidth: 1.8,
    ...Platform.select({
      ios: {
        shadowColor: '#FF3B30',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  optionLetterBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionLetterBadgeDefault: {
    backgroundColor: '#E7E7EE',
  },
  optionLetterBadgeSelected: {
    backgroundColor: '#D4FF00',
  },
  optionLetterBadgeWrong: {
    backgroundColor: '#FF3B30',
  },
  optionLetterGlyph: {
    fontSize: 13,
  },
  optionLetterGlyphDefault: {
    fontWeight: '800',
    color: '#555562',
  },
  optionLetterGlyphSelected: {
    fontWeight: '900',
    color: '#141418',
  },
  optionLetterGlyphWrong: {
    fontWeight: '900',
    color: '#FFFFFF',
  },
  optionTextLabel: {
    flex: 1,
    fontSize: 15.5,
    letterSpacing: -0.2,
  },
  optionTextLabelDefault: {
    fontWeight: '600',
    color: '#22222C',
  },
  optionTextLabelSelected: {
    fontWeight: '800',
    color: '#121216',
  },
  optionTextLabelWrong: {
    fontWeight: '800',
    color: '#C62828',
  },
  optionRadioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  optionRadioCircleDefault: {
    borderWidth: 1.5,
    borderColor: '#CECED6',
  },
  optionRadioCircleSelected: {
    backgroundColor: '#D4FF00',
    borderWidth: 1.5,
    borderColor: '#A4DC00',
  },
  optionRadioCircleWrong: {
    backgroundColor: '#FF3B30',
    borderWidth: 1.5,
    borderColor: '#D32F2F',
  },
  optionRadioEmptyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CECED6',
  },
  assessmentActionSection: {
    marginTop: 16,
  },
  liveFeedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  liveFeedbackRowWrong: {
    backgroundColor: '#FFF1F0',
  },
  liveFeedbackRowCorrect: {
    backgroundColor: '#F3FBDF',
  },
  liveFeedbackText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#526900',
  },
  liveFeedbackTextWrong: {
    color: '#D32F2F',
    fontWeight: '800',
  },
  liveFeedbackTextCorrect: {
    color: '#4D6600',
    fontWeight: '800',
  },
  assessmentSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 18,
  },
  assessmentSubmitBtnActive: {
    backgroundColor: '#D4FF00',
    ...Platform.select({
      ios: {
        shadowColor: '#9AC600',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  assessmentSubmitBtnDisabled: {
    backgroundColor: '#DFDFE5',
  },
  assessmentSubmitBtnText: {
    fontSize: 16,
    fontWeight: '800',
  },
  assessmentSubmitBtnTextActive: {
    color: '#141418',
  },
  assessmentSubmitBtnTextDisabled: {
    color: '#8E8E98',
  },
  assessmentFootnoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
  },
  assessmentFootnoteText: {
    fontSize: 11.5,
    color: '#80808C',
    textAlign: 'center',
    fontWeight: '500',
  },
  // Quiz
  miniProgressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CDCED3',
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 10,
  },
  miniProgressBar: {
    height: '100%',
    backgroundColor: '#19191D',
  },
  questionTopic: {
    fontSize: 11,
    fontWeight: '800',
    color: '#777780',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  questionTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.6,
    lineHeight: 26,
    color: '#19191D',
    marginTop: 8,
    marginBottom: 12,
  },
  quizOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    borderRadius: 16,
    backgroundColor: '#F2F2F5',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    marginVertical: 5,
  },
  quizOptionSelected: {
    borderColor: '#9AB900',
    backgroundColor: '#EFF7CC',
  },
  optionLetterBox: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(30, 30, 35, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  optionLetterSelected: {
    backgroundColor: '#D4FF00',
    borderColor: 'transparent',
  },
  optionLetterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#777780',
  },
  optionText: {
    fontSize: 14,
    color: '#19191D',
    flex: 1,
  },
  optionCheckmark: {
    fontSize: 16,
    fontWeight: '900',
    color: '#19191D',
    marginLeft: 6,
  },
  reviewItem: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(30, 30, 38, 0.11)',
    paddingTop: 12,
    marginTop: 12,
  },

  // Goals
  goalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
  },
  goalCard: {
    width: '48%',
    backgroundColor: '#EBEBF0',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    ...Platform.select({
      ios: {
        shadowColor: '#C9C9CE',
        shadowOffset: { width: 3, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 7,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  goalCardSelected: {
    backgroundColor: '#F3FFD4',
    borderColor: '#A8C83D',
    borderWidth: 1.5,
  },
  goalMinNumber: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
    color: '#19191D',
    marginVertical: 4,
  },

  // Reminders
  bellOrb: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#F0F0F4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    ...Platform.select({
      ios: {
        shadowColor: '#C9C9CE',
        shadowOffset: { width: 4, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  toggleButton: {
    width: 52,
    height: 42,
    borderRadius: 16,
    backgroundColor: '#F5F5F8',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#D4FF00',
    borderColor: '#EAFF7A',
  },
  bellOrbActive: {
    backgroundColor: '#F8FDE8',
    borderColor: '#B8EA00',
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#B8EA00',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  activePillBadge: {
    backgroundColor: '#D4FF00',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    marginLeft: 8,
  },
  activePillText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#16161A',
    letterSpacing: 0.6,
  },
  timeSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  timeSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#526900',
    letterSpacing: 0.7,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  presetCard: {
    width: '48.5%',
    backgroundColor: '#F4F4F8',
    borderRadius: 14,
    padding: 11,
    borderWidth: 1.5,
    borderColor: '#E8E8EE',
  },
  presetCardActive: {
    backgroundColor: '#F9FDEB',
    borderColor: '#A8DB00',
    ...Platform.select({
      ios: {
        shadowColor: '#9AC600',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  presetTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  popularMiniTag: {
    backgroundColor: '#D4FF00',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  popularMiniTagText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#151518',
  },
  presetTimeText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#19191D',
  },
  presetTimeTextActive: {
    color: '#111115',
    fontWeight: '900',
  },
  presetLabelText: {
    fontSize: 11,
    color: '#767682',
    marginTop: 2,
    fontWeight: '500',
  },
  customTimeBox: {
    backgroundColor: '#F6F6FA',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ECECF2',
    alignItems: 'center',
  },
  customTimeHeaderLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#555564',
    marginBottom: 8,
  },
  timeDialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialColumn: {
    alignItems: 'center',
    width: 50,
  },
  dialStepBtn: {
    width: 32,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#ECECEF',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  dialNumberBox: {
    width: 46,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8D8E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialNumberText: {
    fontSize: 19,
    fontWeight: '900',
    color: '#181822',
  },
  dialUnitLabel: {
    fontSize: 10,
    color: '#7E7E8C',
    marginTop: 2,
    fontWeight: '600',
  },
  dialColon: {
    fontSize: 22,
    fontWeight: '900',
    color: '#19191D',
    marginHorizontal: 8,
    marginTop: -16,
  },
  ampmSwitchContainer: {
    flexDirection: 'column',
    marginLeft: 12,
    gap: 4,
    marginTop: -14,
  },
  ampmPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#ECECEF',
    alignItems: 'center',
  },
  ampmPillActive: {
    backgroundColor: '#D4FF00',
  },
  ampmText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#727280',
  },
  ampmTextActive: {
    color: '#151518',
    fontWeight: '900',
  },
  testNotificationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F3F8DE',
    borderWidth: 1,
    borderColor: '#E1EDC0',
  },
  testNotificationBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#526900',
  },

  // Formula 3D Stack
  deckContainer: {
    height: 180,
    marginVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  deckBackCard2: {
    position: 'absolute',
    width: '75%',
    height: 130,
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#E9E7EF',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    transform: [{ rotate: '8deg' }],
  },
  deckBackCard1: {
    position: 'absolute',
    width: '78%',
    height: 132,
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#D7EC83',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    transform: [{ rotate: '-6deg' }],
  },
  deckFrontCard: {
    position: 'absolute',
    width: '82%',
    height: 136,
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#FAFADF',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    transform: [{ rotate: '1deg' }],
    ...Platform.select({
      ios: {
        shadowColor: '#C7C5CD',
        shadowOffset: { width: 5, height: 7 },
        shadowOpacity: 0.6,
        shadowRadius: 12,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  deckCardCategory: {
    fontSize: 10,
    fontWeight: '800',
    color: '#71717A',
  },
  deckCardFormula: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.4,
    color: '#19191D',
    marginVertical: 6,
  },
  deckCardNote: {
    fontSize: 12,
    color: '#5F5F67',
  },
  tabBar: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 14,
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 99,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(35, 35, 40, 0.12)',
  },
  tabButtonActive: {
    backgroundColor: '#19191D',
    borderColor: '#19191D',
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#65656E',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  formulaTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.4,
    color: '#19191D',
    marginTop: 12,
    marginBottom: 4,
  },
  formulaStructureText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#19191D',
    marginBottom: 8,
  },
  hindiSentenceText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#19191D',
  },
  englishSentenceText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#19191D',
    lineHeight: 22,
  },
  highlightRed: {
    color: '#FF3B30',
    fontWeight: '900',
    textDecorationLine: 'underline',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
  },

  // Ready Screen
  summaryValueText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#19191D',
  },
  checklistCard: {
    marginTop: 16,
    gap: 10,
  },
  checkline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DCF6A0',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '900',
    fontSize: 12,
    color: '#171717',
  },
  checklineText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4C4C54',
  },

  // Toast
  toastContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 30,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#222228',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
});
