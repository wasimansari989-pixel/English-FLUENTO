import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
  Image,
  BackHandler,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProgressRepository, UserProgress } from '../src/database/progressRepository';
import { UserProfileRepository, UserOnboardingProfile, defaultUserProfile } from '../src/database/userProfileRepository';
import { getFormulaById } from '../src/search/formulaSearch';
import { BottomNavBar } from '../src/components/BottomNavBar';
import { FormulaLabGlassDeck } from '../src/components/FormulaLabGlassDeck';
import { SentenceFormula } from '../src/types/formula';
import { colors, radii, shadows, typography } from '../src/theme';
import { BookmarkRepository } from '../src/database/bookmarkRepository';
import { GamificationRepository } from '../src/database/gamificationRepository';
import { OfflineStatusBanner } from '../src/components/OfflineStatusBanner';
import { SessionManager } from '../src/database/sessionStore';
import { StatusBar } from 'expo-status-bar';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<UserOnboardingProfile>(defaultUserProfile);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [spotlightFormula, setSpotlightFormula] = useState<SentenceFormula | null>(() => {
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    const spotlightId = ((dayOfYear * 7) % 600) + 1;
    return getFormulaById(spotlightId) || getFormulaById(266) || getFormulaById(1) || null;
  });
  const [xpGems, setXpGems] = useState<number>(1299);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);

  // Subtle pulsing ambient animations for interactive elements
  const livePulseAnim = useRef(new Animated.Value(1)).current;

  // Hardware back on Home exits the app cleanly, avoiding unwanted back-navigation
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        BackHandler.exitApp();
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [])
  );

  const loadData = async () => {
    try {
      const isCompleted = await UserProfileRepository.isOnboardingCompleted();
      if (!isCompleted) {
        router.replace('/onboarding');
        return;
      }

      const [p, uProfile, gProfile] = await Promise.all([
        ProgressRepository.getProgress(),
        UserProfileRepository.getProfile(),
        GamificationRepository.getProfile(),
      ]);

      setProgress(p);
      setProfile(uProfile);
      setXpGems(gProfile.totalXp);

      const dayOfYear = Math.floor(
        (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
      );
      const spotlightId = ((dayOfYear * 7) % 600) + 1;
      const spot = getFormulaById(spotlightId) || getFormulaById(266) || getFormulaById(1);
      setSpotlightFormula(spot || null);
      if (spot?.id) {
        const bm = await BookmarkRepository.isBookmarked(spot.id);
        setIsBookmarked(bm);
      }
    } catch (err) {
      console.warn('Error loading home data:', err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(livePulseAnim, {
          toValue: 1.15,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(livePulseAnim, {
          toValue: 1.0,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    return () => {
      pulseLoop.stop();
    };
  }, [livePulseAnim]);

  const handleToggleBookmark = async () => {
    if (spotlightFormula?.id) {
      const state = await BookmarkRepository.toggleBookmark(spotlightFormula.id);
      setIsBookmarked(state);
    }
  };

  // Real calculated daily progress: for new learners with 0 activity, 0%
  const practicedCount = progress?.practicedFormulaIds.length || 0;
  const quizCount = progress?.totalQuizzes || 0;
  const estimatedActiveMinutes = Math.round(practicedCount * 0.5 + quizCount * 1.5);
  const goalTargetMinutes = profile.dailyGoalMinutes || 10;
  const goalPercent = Math.min(100, Math.round((estimatedActiveMinutes / goalTargetMinutes) * 100));


  return (
    <View style={styles.rootContainer}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top + 8, 16),
            paddingBottom: Math.max(insets.bottom + 90, 110),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ========================================================================= */}
        {/* TOP NAVBAR (Elevated Light Pills)                                         */}
        {/* ========================================================================= */}
        <View style={styles.topNavBar}>
          <TouchableOpacity
            style={styles.topCircleBtn}
            activeOpacity={0.8}
            onPress={() => router.push('/settings')}
            accessibilityLabel="Settings"
          >
            <Ionicons name="settings-outline" size={20} color="#1E1E24" />
          </TouchableOpacity>

          <View style={styles.topCenterPill}>
            <Text style={styles.topCenterPillText}>MY LEARNING</Text>
          </View>

          <TouchableOpacity
            style={styles.topCircleBtn}
            activeOpacity={0.8}
            onPress={handleToggleBookmark}
            accessibilityLabel="Bookmark"
          >
            <Ionicons
              name={isBookmarked ? 'heart' : 'heart-outline'}
              size={18}
              color={isBookmarked ? '#E11D48' : '#1E1E24'}
            />
          </TouchableOpacity>
        </View>

        {/* Offline Connection Status Banner */}
        <OfflineStatusBanner />

        {/* ========================================================================= */}
        {/* PROTOTYPE SCREEN 13: GREETING & LEVEL BADGE                               */}
        {/* ========================================================================= */}
        <View style={styles.greetingRow}>
          <View>
            <Text style={styles.eyebrow}>YOUR DAILY PRACTICE</Text>
            <Text style={styles.greetingTitle}>Hello, learner ✦</Text>
          </View>
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>{profile.level || 'Beginner'}</Text>
          </View>
        </View>

        {/* ========================================================================= */}
        {/* PROTOTYPE SCREEN 13: TODAY'S GOAL CARD                                    */}
        {/* ========================================================================= */}
        <View style={styles.heroCard}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.eyebrow}>TODAY’S GOAL</Text>
              <Text style={styles.goalMinTitle}>{goalTargetMinutes} minutes</Text>
              <Text style={styles.smallMuted}>You’re ready to keep going.</Text>
            </View>
            {/* Real Calculated Circular Progress Ring */}
            <View style={styles.progressRingOuter}>
              <View style={styles.progressRingInner}>
                <Text style={styles.progressRingText}>{goalPercent}%</Text>
              </View>
            </View>
          </View>

          <View style={styles.goalActionRow}>
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => router.push('/formulas')}
              style={[styles.smallBtn, styles.smallBtnLime]}
            >
              <Text style={styles.smallBtnLimeText}>Explore formulas →</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => router.push('/practice')}
              style={[styles.smallBtn, styles.smallBtnLight]}
            >
              <Text style={styles.smallBtnLightText}>Try level practice</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ========================================================================= */}
        {/* PROTOTYPE SCREEN 13: LEARNING TOOLKIT (3 Paths)                           */}
        {/* ========================================================================= */}
        <View style={styles.heroCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.toolkitHeading}>Your learning toolkit</Text>
            <View style={styles.chip}>
              <Text style={styles.chipText}>4 paths</Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push('/ai-teacher')}
            style={styles.toolkitItem}
          >
            <View style={[styles.toolkitIconBox, { backgroundColor: '#FFD166' }]}>
              <Text style={{ fontSize: 16 }}>💬</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.toolkitTitle}>AI Personal Teacher</Text>
              <Text style={styles.toolkitSub}>Chat lessons, grammar & sentence correction.</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#777780" />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push('/formulas')}
            style={styles.toolkitItem}
          >
            <View style={[styles.toolkitIconBox, { backgroundColor: '#CDB6E9' }]}>
              <Text style={{ fontSize: 16 }}>📘</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.toolkitTitle}>600+ Sentence Formulas</Text>
              <Text style={styles.toolkitSub}>Clear patterns with Hindi support.</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#777780" />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push('/talk-to-ai')}
            style={styles.toolkitItem}
          >
            <View style={[styles.toolkitIconBox, { backgroundColor: '#D4FF00' }]}>
              <Text style={{ fontSize: 16 }}>✦</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.toolkitTitle}>AI English Coach</Text>
              <Text style={styles.toolkitSub}>Personalised conversation practice with voice.</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#777780" />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push('/practice')}
            style={styles.toolkitItem}
          >
            <View style={[styles.toolkitIconBox, { backgroundColor: '#DCF6A0' }]}>
              <Text style={{ fontSize: 16 }}>✓</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.toolkitTitle}>Practice & review</Text>
              <Text style={styles.toolkitSub}>Quizzes, saved formulas, and progress.</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#777780" />
          </TouchableOpacity>
        </View>

        {/* ========================================================================= */}
        {/* CARD 1 — ELEVATED 3D HERO CARD (SPEAK ENGLISH 3D Image)                  */}
        {/* ========================================================================= */}
        <View style={styles.heroDarkCard}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push('/talk-to-ai')}
            style={styles.heroImageBlock}
            accessibilityLabel="Speak English"
            accessibilityRole="imagebutton"
          >
            <Image
              source={require('../src/Image/speak english.webp')}
              style={styles.heroImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        </View>

        {/* ========================================================================= */}
        {/* CARD 2 — ELEVATED 3D STATS & JOURNEY CARD (src/Image/speak english 1.webp)*/}
        {/* ========================================================================= */}
        <View style={styles.statsDarkCard}>
          <Image
            source={require('../src/Image/speak english 1.webp')}
            style={styles.statsImage}
            resizeMode="cover"
          />
        </View>

        {/* ========================================================================= */}
        {/* 600 FORMULA LAB INTERACTIVE GLASS DECK                                    */}
        {/* ========================================================================= */}
        <FormulaLabGlassDeck onAddXp={(amount) => setXpGems((prev) => prev + amount)} />
      </ScrollView>

      {/* Floating Modern Pill Dock Navigation */}
      <BottomNavBar activeTab="home" />
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#E8E8EB',
    position: 'relative',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#E8E8EB',
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 14,
    backgroundColor: '#E8E8EB',
  },

  // TOP NAVBAR (Elevated Light Pills)
  topNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  topCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.10,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  topCenterPill: {
    height: 44,
    paddingHorizontal: 26,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.10,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  topCenterPillText: {
    color: '#1E1E24',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // GREETING ROW (Screen 13)
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  eyebrow: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontWeight: '800',
    color: '#777780',
  },
  greetingTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.6,
    color: '#19191D',
    marginTop: 2,
  },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#D4FF00',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  levelBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#171717',
  },

  // HERO CARD & NEUMORPHIC CONTAINER
  heroCard: {
    backgroundColor: '#EBEBF0',
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    ...Platform.select({
      ios: {
        shadowColor: '#C9C9CE',
        shadowOffset: { width: 4, height: 6 },
        shadowOpacity: 0.6,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  goalMinTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.6,
    color: '#19191D',
    marginVertical: 2,
  },
  smallMuted: {
    fontSize: 12,
    color: '#777780',
  },
  progressRingOuter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#D4FF00',
    borderWidth: 4,
    borderColor: '#EAFF7A',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#7D9600',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  progressRingInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E8E8EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRingText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#19191D',
  },
  goalActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  smallBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallBtnLime: {
    backgroundColor: '#D4FF00',
    borderWidth: 1,
    borderColor: '#EAFF7A',
  },
  smallBtnLimeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#171717',
  },
  smallBtnLight: {
    backgroundColor: '#F2F2F6',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  smallBtnLightText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#19191D',
  },

  // TOOLKIT
  toolkitHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#19191D',
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(40, 40, 44, 0.1)',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#55555E',
  },
  toolkitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 4,
  },
  toolkitIconBox: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolkitTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#19191D',
  },
  toolkitSub: {
    fontSize: 12,
    color: '#777780',
    marginTop: 2,
  },

  // CARD 1 — SEAMLESS ELEVATED 3D HERO CARD
  heroDarkCard: {
    backgroundColor: '#DFDFDF',
    borderRadius: 36,
    padding: 0,
    height: 300,
    width: '100%',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.18,
        shadowRadius: 28,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  heroImageBlock: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },

  // CARD 2 — ELEVATED 3D STATS & JOURNEY CARD (src/Image/speak english 1.webp)
  statsDarkCard: {
    backgroundColor: '#DFDFDF',
    borderRadius: 36,
    padding: 0,
    width: '100%',
    aspectRatio: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.18,
        shadowRadius: 28,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  statsImage: {
    width: '100%',
    height: '100%',
  },
});
