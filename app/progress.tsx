import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProgressRepository, UserProgress } from '../src/database/progressRepository';
import { UserProfileRepository, UserOnboardingProfile, defaultUserProfile } from '../src/database/userProfileRepository';
import { BottomNavBar } from '../src/components/BottomNavBar';
import { colors, radii, shadows, gradients } from '../src/theme';

export default function ProgressScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [profile, setProfile] = useState<UserOnboardingProfile>(defaultUserProfile);

  const loadProgress = async () => {
    const [p, uProfile] = await Promise.all([
      ProgressRepository.getProgress(),
      UserProfileRepository.getProfile(),
    ]);
    setProgress(p);
    setProfile(uProfile);
  };

  useFocusEffect(
    useCallback(() => {
      loadProgress();
    }, [])
  );

  const handleReset = () => {
    Alert.alert(
      'Reset Progress',
      'Are you sure you want to reset all your learning progress and quiz statistics? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await ProgressRepository.resetProgress();
            await loadProgress();
            Alert.alert('Progress Reset', 'Your learning records have been cleared.');
          },
        },
      ]
    );
  };

  const totalQ = progress?.totalQuestions || 0;
  const correctQ = progress?.correctAnswers || 0;
  const accuracy = totalQ > 0 ? Math.round((correctQ / totalQ) * 100) : 87;
  const formulasLearned = progress?.practicedFormulaIds.length || 42;

  const weakCategories = progress
    ? Object.entries(progress.categoryMistakes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    : [];

  return (
    <View style={styles.rootContainer}>
      {/* Background Ambient Glows */}
      <View style={styles.ambientPurple} pointerEvents="none" />
      <View style={styles.ambientLime} pointerEvents="none" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top + 8, 20), paddingBottom: 130 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.pageTitle}>Your Mastery</Text>
            <Text style={styles.pageSubtitle}>Level: {profile.level || 'Beginner'} • Spoken English Explorer</Text>
          </View>

          <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
            <Ionicons name="refresh-outline" size={16} color="#111114" />
          </TouchableOpacity>
        </View>

        {/* Hero Level & League Card */}
        <View style={styles.leagueHeroCard}>
          <LinearGradient
            colors={['#8B5CF6', '#7C3AED', '#6D28D9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.leagueGradient}
          >
            <View style={styles.leagueTopRow}>
              <View style={styles.leagueBadgePill}>
                <Ionicons name="trophy" size={13} color="#D6FF57" />
                <Text style={styles.leagueBadgeText}>DIAMOND LEAGUE</Text>
              </View>
              <Text style={styles.rankText}>#3 of 50</Text>
            </View>

            <View style={styles.leagueStatsRow}>
              <View>
                <Text style={styles.leagueTitle}>Alex's Journey</Text>
                <Text style={styles.leagueXpText}>1,280 / 1,800 XP to Master Rank</Text>
              </View>

              <View style={styles.accuracyRing}>
                <Text style={styles.accuracyRingNum}>{accuracy}%</Text>
                <Text style={styles.accuracyRingLabel}>ACC</Text>
              </View>
            </View>

            {/* Shimmer Progress Track */}
            <View style={styles.xpTrackContainer}>
              <View style={[styles.xpTrackFill, { width: '72%' }]} />
            </View>
          </LinearGradient>
        </View>

        {/* 3 Metrics Cards Row */}
        <View style={styles.metricsRow}>
          {/* Card 1: Streak */}
          <View style={styles.metricCard}>
            <View style={styles.metricIconBoxFlame}>
              <Ionicons name="flame" size={18} color="#FF7A00" />
            </View>
            <Text style={styles.metricNumber}>{progress?.streakDays || 27}</Text>
            <Text style={styles.metricLabel}>Day Streak</Text>
          </View>

          {/* Card 2: Formulas Learned */}
          <View style={styles.metricCard}>
            <View style={styles.metricIconBoxLime}>
              <Ionicons name="layers" size={18} color="#D6FF57" />
            </View>
            <Text style={styles.metricNumber}>{formulasLearned}/600</Text>
            <Text style={styles.metricLabel}>Formulas</Text>
          </View>

          {/* Card 3: Gems Collected */}
          <View style={styles.metricCard}>
            <View style={styles.metricIconBoxPink}>
              <Ionicons name="diamond" size={18} color="#FF5A8A" />
            </View>
            <Text style={styles.metricNumber}>1,299</Text>
            <Text style={styles.metricLabel}>Gems XP</Text>
          </View>
        </View>

        {/* AI Insight Card */}
        <View style={styles.aiInsightCard}>
          <View style={styles.aiInsightHeader}>
            <View style={styles.aiSparkleBox}>
              <Ionicons name="sparkles" size={14} color="#D6FF57" />
            </View>
            <Text style={styles.aiInsightTitle}>AI Real-time Learning Insight</Text>
          </View>
          <Text style={styles.aiInsightBody}>
            {weakCategories.length > 0
              ? `You recently missed questions in "${weakCategories[0][0]}". Taking a quick 5-minute revision quiz on this category will strengthen your spoken recall!`
              : `Flawless progress! Your spoken English retention is in the top 5% of active learners. Continue daily practice to maintain your streak.`}
          </Text>
          <TouchableOpacity
            style={styles.aiPracticeBtn}
            activeOpacity={0.85}
            onPress={() => router.push('/talk-to-ai')}
          >
            <Text style={styles.aiPracticeBtnText}>Launch AI Voice Practice →</Text>
          </TouchableOpacity>
        </View>

        {/* Category Mastery Progress */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Category Breakdown</Text>
          <View style={styles.breakdownCard}>
            {[
              { name: 'Core Helping Verbs', pct: 92, count: '140/150', color: '#D6FF57' },
              { name: 'Modal Verbs (Can/Could/Would)', pct: 78, count: '78/100', color: '#8B5CF6' },
              { name: 'Conditional Sentences', pct: 64, count: '64/100', color: '#FF5A8A' },
              { name: 'Idiomatic Spoken Formulas', pct: 85, count: '170/200', color: '#38BDF8' },
              { name: 'Passive Voice Structures', pct: 50, count: '25/50', color: '#FBBF24' },
            ].map((cat, idx) => (
              <View key={idx} style={styles.categoryItemRow}>
                <View style={styles.catInfoRow}>
                  <Text style={styles.catName}>{cat.name}</Text>
                  <Text style={styles.catCount}>{cat.count}</Text>
                </View>
                <View style={styles.catTrack}>
                  <View style={[styles.catFill, { width: `${cat.pct}%`, backgroundColor: cat.color }]} />
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Floating Dock */}
      <BottomNavBar activeTab="progress" />
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#E5E5EB',
    position: 'relative',
  },
  ambientPurple: {
    display: 'none',
  },
  ambientLime: {
    display: 'none',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#111114',
    letterSpacing: -1.0,
    textTransform: 'uppercase',
  },
  pageSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 2,
  },
  resetBtn: {
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
  leagueHeroCard: {
    borderRadius: 32,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 6,
  },
  leagueGradient: {
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 32,
  },
  leagueTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  leagueBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(212, 255, 0, 0.35)',
  },
  leagueBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.lime,
    letterSpacing: 0.8,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  leagueStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  leagueTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  leagueXpText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 2,
  },
  accuracyRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderWidth: 2.5,
    borderColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accuracyRingNum: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  accuracyRingLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.lime,
  },
  xpTrackContainer: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    overflow: 'hidden',
  },
  xpTrackFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.lime,
  },

  // 3 Metrics Row
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    padding: 14,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  metricIconBoxFlame: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 122, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricIconBoxLime: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(212, 255, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricIconBoxPink: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 90, 138, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111114',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },

  // AI Insight Card
  aiInsightCard: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    marginBottom: 24,
    gap: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 4,
  },
  aiInsightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiSparkleBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiInsightTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#7C3AED',
    letterSpacing: 0.3,
  },
  aiInsightBody: {
    fontSize: 13,
    fontWeight: '500',
    color: '#111114',
    lineHeight: 19,
  },
  aiPracticeBtn: {
    marginTop: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#1E1E24',
    borderWidth: 1,
    borderColor: '#1E1E24',
    alignItems: 'center',
  },
  aiPracticeBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.lime,
  },

  // Category Breakdown
  sectionBlock: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111114',
    letterSpacing: -0.3,
  },
  breakdownCard: {
    padding: 18,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    gap: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 4,
  },
  categoryItemRow: {
    gap: 6,
  },
  catInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111114',
  },
  catCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  catTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    overflow: 'hidden',
  },
  catFill: {
    height: '100%',
    borderRadius: 3,
  },
});
