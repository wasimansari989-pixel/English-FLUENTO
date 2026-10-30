import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProgressRepository, UserProgress } from '../src/database/progressRepository';
import { UserProfileRepository, UserOnboardingProfile, defaultUserProfile } from '../src/database/userProfileRepository';
import { GamificationRepository, getLocalDateString } from '../src/database/gamificationRepository';
import { LeaderboardClient } from '../src/services/leaderboardClient';
import { AnalyticsService } from '../src/services/analyticsService';
import { LearningAnalyticsData } from '../src/types/analytics';
import {
  GamificationProfile,
  AchievementItem,
  LeaderboardResponse,
  LeaderboardEntry,
  RewardRecord,
} from '../src/types/gamification';
import { AchievementUnlockModal } from '../src/components/AchievementUnlockModal';
import { AnalyticsDashboard } from '../src/components/AnalyticsDashboard';
import { BottomNavBar } from '../src/components/BottomNavBar';
import { colors, radii, shadows, gradients } from '../src/theme';

export default function ProgressScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Progress & Gamification State
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [profile, setProfile] = useState<UserOnboardingProfile>(defaultUserProfile);
  const [gamification, setGamification] = useState<GamificationProfile | null>(null);
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);

  // Leaderboard State
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<'weekly' | 'monthly' | 'all-time'>('weekly');
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  // Modals & Selected items
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementItem | null>(null);
  const [unlockedCelebration, setUnlockedCelebration] = useState<AchievementItem | null>(null);
  const [analyticsData, setAnalyticsData] = useState<LearningAnalyticsData | null>(null);
  const [activeTab, setActiveTab] = useState<'analytics' | 'dashboard' | 'achievements' | 'leaderboard'>('analytics');

  const loadData = async () => {
    try {
      const [p, uProfile, gProfile, achs, analytics] = await Promise.all([
        ProgressRepository.getProgress(),
        UserProfileRepository.getProfile(),
        GamificationRepository.getProfile(),
        GamificationRepository.getAchievements(),
        AnalyticsService.getAnalyticsData(),
      ]);
      setProgress(p);
      setProfile(uProfile);
      setGamification(gProfile);
      setAchievements(achs);
      setAnalyticsData(analytics);

      // Background sync with genuine backend
      LeaderboardClient.syncProfile(gProfile).catch(() => {});
    } catch (err) {
      console.warn('Error loading progress data:', err);
    }
  };

  const loadLeaderboardData = async (period: 'weekly' | 'monthly' | 'all-time') => {
    setLoadingLeaderboard(true);
    try {
      const res = await LeaderboardClient.fetchLeaderboard(period);
      setLeaderboard(res);
    } catch {
      // non-fatal
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
      loadLeaderboardData(leaderboardPeriod);
    }, [leaderboardPeriod])
  );

  // Subscribe to real-time achievement unlocks
  useEffect(() => {
    const unsubscribe = GamificationRepository.subscribeUnlock((ach) => {
      setUnlockedCelebration(ach);
      loadData();
    });
    return unsubscribe;
  }, []);

  const handleReset = () => {
    Alert.alert(
      'Reset All Progress',
      'Are you sure you want to reset all your learning records, XP, and streak? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: async () => {
            await Promise.all([
              ProgressRepository.resetProgress(),
              GamificationRepository.reset(),
            ]);
            await loadData();
            Alert.alert('Reset Complete', 'Your learning and gamification records have been refreshed.');
          },
        },
      ]
    );
  };

  const totalQ = progress?.totalQuestions || 0;
  const correctQ = progress?.correctAnswers || 0;
  const accuracy = totalQ > 0 ? Math.round((correctQ / totalQ) * 100) : 0;
  const formulasLearned = gamification?.formulasLearned || progress?.practicedFormulaIds.length || 0;

  const currentLevelXp = gamification?.currentLevelXp || 0;
  const nextLevelXp = gamification?.nextLevelXp || 100;
  const xpPercent = Math.min(100, Math.round((currentLevelXp / nextLevelXp) * 100));

  // Current week 7-day activity helper
  const getWeekDays = () => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 is Sun
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);

    const days = [];
    const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const activeSet = new Set(gamification?.activeDays || []);
    const todayStr = getLocalDateString();

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const str = getLocalDateString(d);
      days.push({
        label: dayLabels[i],
        dateStr: str,
        isActive: activeSet.has(str),
        isToday: str === todayStr,
      });
    }
    return days;
  };

  const weekDays = getWeekDays();

  const weakCategories = progress
    ? Object.entries(progress.categoryMistakes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    : [];

  return (
    <View style={styles.rootContainer}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top + 8, 20), paddingBottom: 130 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Bar */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.pageTitle}>Mastery & Rewards</Text>
            <Text style={styles.pageSubtitle}>
              Level {gamification?.level || 1} • {gamification?.levelTitle || 'Novice Explorer'}
            </Text>
          </View>

          <TouchableOpacity style={styles.resetBtn} onPress={handleReset} activeOpacity={0.7}>
            <Ionicons name="refresh-outline" size={18} color="#111114" />
          </TouchableOpacity>
        </View>

        {/* Hero Level & XP Card */}
        <View style={styles.leagueHeroCard}>
          <LinearGradient
            colors={['#7C3AED', '#6D28D9', '#4C1D95']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.leagueGradient}
          >
            <View style={styles.leagueTopRow}>
              <View style={styles.leagueBadgePill}>
                <Ionicons name="diamond" size={13} color="#D6FF57" />
                <Text style={styles.leagueBadgeText}>LEVEL {gamification?.level || 1}</Text>
              </View>
              <View style={styles.streakHeroPill}>
                <Ionicons name="flame" size={14} color="#FF7A00" />
                <Text style={styles.streakHeroText}>{gamification?.currentStreak || 1} Day Streak</Text>
              </View>
            </View>

            <View style={styles.leagueStatsRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.leagueTitle}>{gamification?.levelTitle || 'Novice Explorer'}</Text>
                <Text style={styles.leagueXpText}>
                  {currentLevelXp} / {nextLevelXp} XP to Level {(gamification?.level || 1) + 1}
                </Text>
              </View>

              <View style={styles.accuracyRing}>
                <Text style={styles.accuracyRingNum}>{gamification?.totalXp || 0}</Text>
                <Text style={styles.accuracyRingLabel}>TOTAL XP</Text>
              </View>
            </View>

            {/* Shimmer Progress Track */}
            <View style={styles.xpTrackContainer}>
              <View style={[styles.xpTrackFill, { width: `${xpPercent}%` }]} />
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
            <Text style={styles.metricNumber}>{gamification?.currentStreak || 1}</Text>
            <Text style={styles.metricLabel}>Day Streak</Text>
            <Text style={styles.metricSubLabel}>Best: {gamification?.longestStreak || 1}d</Text>
          </View>

          {/* Card 2: Formulas Learned */}
          <View style={styles.metricCard}>
            <View style={styles.metricIconBoxLime}>
              <Ionicons name="layers" size={18} color="#16A34A" />
            </View>
            <Text style={styles.metricNumber}>{formulasLearned}/600</Text>
            <Text style={styles.metricLabel}>Formulas</Text>
            <Text style={styles.metricSubLabel}>Mastered</Text>
          </View>

          {/* Card 3: Quizzes & Accuracy */}
          <View style={styles.metricCard}>
            <View style={styles.metricIconBoxPink}>
              <Ionicons name="sparkles" size={18} color="#EC4899" />
            </View>
            <Text style={styles.metricNumber}>{accuracy}%</Text>
            <Text style={styles.metricLabel}>Accuracy</Text>
            <Text style={styles.metricSubLabel}>{gamification?.quizzesCompleted || 0} Quizzes</Text>
          </View>
        </View>

        {/* Weekly Activity Dot Matrix */}
        <View style={styles.weeklyMatrixCard}>
          <View style={styles.weeklyMatrixHeader}>
            <View style={styles.matrixTitleRow}>
              <Ionicons name="calendar-outline" size={16} color="#111114" />
              <Text style={styles.weeklyMatrixTitle}>This Week's Activity</Text>
            </View>
            <Text style={styles.weeklyMatrixStreakText}>
              🔥 {gamification?.currentStreak || 1} day streak active
            </Text>
          </View>

          <View style={styles.daysRow}>
            {weekDays.map((d, idx) => (
              <View key={idx} style={styles.dayCol}>
                <Text style={[styles.dayLabel, d.isToday && styles.dayLabelToday]}>{d.label}</Text>
                <View
                  style={[
                    styles.dayCircle,
                    d.isActive && styles.dayCircleActive,
                    d.isToday && !d.isActive && styles.dayCircleToday,
                  ]}
                >
                  {d.isActive ? (
                    <Ionicons name="checkmark" size={14} color="#0A0A0B" />
                  ) : d.isToday ? (
                    <View style={styles.todayInnerDot} />
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Navigation Tabs for Analytics & Gamification Sections */}
        <View style={styles.tabSwitchContainer}>
          <TouchableOpacity
            style={[styles.tabSwitchBtn, activeTab === 'analytics' && styles.tabSwitchBtnActive]}
            onPress={() => setActiveTab('analytics')}
          >
            <Ionicons
              name="stats-chart"
              size={13}
              color={activeTab === 'analytics' ? '#0A0A0B' : '#6B7280'}
            />
            <Text
              style={[
                styles.tabSwitchText,
                activeTab === 'analytics' && styles.tabSwitchTextActive,
              ]}
            >
              Analytics
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabSwitchBtn, activeTab === 'dashboard' && styles.tabSwitchBtnActive]}
            onPress={() => setActiveTab('dashboard')}
          >
            <Ionicons
              name="sparkles-outline"
              size={13}
              color={activeTab === 'dashboard' ? '#0A0A0B' : '#6B7280'}
            />
            <Text
              style={[
                styles.tabSwitchText,
                activeTab === 'dashboard' && styles.tabSwitchTextActive,
              ]}
            >
              Rewards
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabSwitchBtn, activeTab === 'achievements' && styles.tabSwitchBtnActive]}
            onPress={() => setActiveTab('achievements')}
          >
            <Ionicons
              name="trophy-outline"
              size={13}
              color={activeTab === 'achievements' ? '#0A0A0B' : '#6B7280'}
            />
            <Text
              style={[
                styles.tabSwitchText,
                activeTab === 'achievements' && styles.tabSwitchTextActive,
              ]}
            >
              Badges
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabSwitchBtn, activeTab === 'leaderboard' && styles.tabSwitchBtnActive]}
            onPress={() => setActiveTab('leaderboard')}
          >
            <Ionicons
              name="podium-outline"
              size={13}
              color={activeTab === 'leaderboard' ? '#0A0A0B' : '#6B7280'}
            />
            <Text
              style={[
                styles.tabSwitchText,
                activeTab === 'leaderboard' && styles.tabSwitchTextActive,
              ]}
            >
              League
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB 0: LEARNING ANALYTICS DASHBOARD */}
        {activeTab === 'analytics' && analyticsData && (
          <AnalyticsDashboard analytics={analyticsData} onRefresh={loadData} />
        )}

        {/* TAB 1: OVERVIEW & ACTIVITY HISTORY */}
        {activeTab === 'dashboard' && (
          <>
            {/* AI Insight Card */}
            <View style={styles.aiInsightCard}>
              <View style={styles.aiInsightHeader}>
                <View style={styles.aiSparkleBox}>
                  <Ionicons name="sparkles" size={14} color="#D6FF57" />
                </View>
                <Text style={styles.aiInsightTitle}>AI Learning Coach</Text>
              </View>
              <Text style={styles.aiInsightBody}>
                {weakCategories.length > 0
                  ? `Focusing on "${weakCategories[0][0]}" will earn you fast mastery. Take a quick 5-question adaptive quiz to level up!`
                  : `Terrific progress! You have earned ${gamification?.totalXp || 0} XP. Practice voice conversations or formulas daily to keep your ${gamification?.currentStreak || 1}-day streak alive!`}
              </Text>
              <View style={styles.aiInsightActionRow}>
                <TouchableOpacity
                  style={styles.aiPracticeBtn}
                  activeOpacity={0.85}
                  onPress={() => router.push('/practice')}
                >
                  <Text style={styles.aiPracticeBtnText}>Take Practice Quiz (+15 XP) →</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Recent XP Reward Activity Log */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Recent XP Rewards</Text>
                <Text style={styles.sectionSubtitleText}>
                  {gamification?.rewardHistory.length || 0} activities logged
                </Text>
              </View>

              <View style={styles.historyCard}>
                {(!gamification?.rewardHistory || gamification.rewardHistory.length === 0) ? (
                  <View style={styles.emptyHistory}>
                    <Ionicons name="gift-outline" size={32} color="#9CA3AF" />
                    <Text style={styles.emptyHistoryText}>
                      Complete formula lessons, quizzes, or speaking sessions to earn XP!
                    </Text>
                  </View>
                ) : (
                  gamification.rewardHistory.slice(0, 7).map((item) => (
                    <View key={item.id} style={styles.historyItemRow}>
                      <View style={styles.historyIconCircle}>
                        <Ionicons
                          name={
                            item.activityType === 'formula_lesson'
                              ? 'book'
                              : item.activityType === 'quiz_completed' || item.activityType === 'perfect_quiz'
                              ? 'checkmark-circle'
                              : item.activityType === 'speaking_session'
                              ? 'mic'
                              : 'sparkles'
                          }
                          size={16}
                          color="#7C3AED"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.historyItemTitle}>{item.title}</Text>
                        <Text style={styles.historyItemTime}>
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                          {new Date(item.timestamp).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={styles.historyXpBadge}>
                        <Text style={styles.historyXpText}>+{item.xp} XP</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>
          </>
        )}

        {/* TAB 2: ACHIEVEMENTS BADGES */}
        {activeTab === 'achievements' && (
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Achievement Badges</Text>
              <Text style={styles.sectionSubtitleText}>
                {achievements.filter((a) => a.unlocked).length} of {achievements.length} Unlocked
              </Text>
            </View>

            <View style={styles.achievementsGrid}>
              {achievements.map((ach) => {
                const progressPct = Math.min(100, Math.round((ach.current / ach.target) * 100));
                return (
                  <TouchableOpacity
                    key={ach.id}
                    style={[styles.badgeCard, ach.unlocked && styles.badgeCardUnlocked]}
                    onPress={() => setSelectedAchievement(ach)}
                    activeOpacity={0.85}
                  >
                    <View
                      style={[
                        styles.badgeIconCircle,
                        ach.unlocked
                          ? { backgroundColor: ach.color }
                          : { backgroundColor: '#E5E7EB' },
                      ]}
                    >
                      <Ionicons
                        name={ach.unlocked ? (ach.icon as any) : 'lock-closed'}
                        size={22}
                        color={ach.unlocked ? '#0A0A0B' : '#9CA3AF'}
                      />
                    </View>

                    <Text style={styles.badgeCardTitle} numberOfLines={1}>
                      {ach.title}
                    </Text>
                    <Text style={styles.badgeCardHindi} numberOfLines={1}>
                      {ach.hindiTitle}
                    </Text>

                    {ach.unlocked ? (
                      <View style={styles.badgeUnlockedPill}>
                        <Ionicons name="checkmark-circle" size={12} color="#16A34A" />
                        <Text style={styles.badgeUnlockedText}>+{ach.xpReward} XP</Text>
                      </View>
                    ) : (
                      <View style={styles.badgeProgressBox}>
                        <View style={styles.badgeProgressBar}>
                          <View
                            style={[
                              styles.badgeProgressFill,
                              { width: `${progressPct}%`, backgroundColor: ach.color },
                            ]}
                          />
                        </View>
                        <Text style={styles.badgeProgressText}>
                          {ach.current} / {ach.target}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* TAB 3: LEADERBOARD */}
        {activeTab === 'leaderboard' && (
          <View style={styles.sectionBlock}>
            {/* Period Selector */}
            <View style={styles.leaderboardPeriodRow}>
              {(['weekly', 'monthly', 'all-time'] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.periodBtn,
                    leaderboardPeriod === p && styles.periodBtnActive,
                  ]}
                  onPress={() => {
                    setLeaderboardPeriod(p);
                    loadLeaderboardData(p);
                  }}
                >
                  <Text
                    style={[
                      styles.periodBtnText,
                      leaderboardPeriod === p && styles.periodBtnTextActive,
                    ]}
                  >
                    {p === 'weekly' ? 'This Week' : p === 'monthly' ? 'This Month' : 'All-Time'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {loadingLeaderboard ? (
              <View style={styles.leaderboardLoading}>
                <ActivityIndicator size="small" color={colors.lime} />
                <Text style={styles.leaderboardLoadingText}>Loading rankings...</Text>
              </View>
            ) : leaderboard?.offline ? (
              <View style={styles.offlineBox}>
                <Ionicons name="cloud-offline-outline" size={32} color="#6B7280" />
                <Text style={styles.offlineTitle}>Offline Mode</Text>
                <Text style={styles.offlineSubtitle}>
                  Connect to your local backend to view global learner rankings. Your XP is securely saved locally!
                </Text>
                <View style={styles.offlineUserCard}>
                  <Text style={styles.offlineUserCardText}>
                    Your Current XP: <Text style={{ fontWeight: '900' }}>{gamification?.totalXp || 0} XP</Text>
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.leaderboardList}>
                {leaderboard?.rankings.map((user) => {
                  const isTop3 = user.rank <= 3;
                  const medalColor =
                    user.rank === 1 ? '#EAB308' : user.rank === 2 ? '#94A3B8' : '#D97706';

                  return (
                    <View
                      key={user.userId}
                      style={[
                        styles.leaderboardRow,
                        user.isCurrentUser && styles.leaderboardRowCurrent,
                      ]}
                    >
                      {/* Rank Number / Medal */}
                      <View style={styles.rankBadge}>
                        {isTop3 ? (
                          <Ionicons name="trophy" size={18} color={medalColor} />
                        ) : (
                          <Text style={styles.rankNumText}>#{user.rank}</Text>
                        )}
                      </View>

                      {/* Avatar */}
                      <View style={styles.userAvatar}>
                        <Ionicons name="person" size={16} color="#7C3AED" />
                      </View>

                      {/* Name & Level */}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.userNameText} numberOfLines={1}>
                          {user.displayName} {user.isCurrentUser ? '(You)' : ''}
                        </Text>
                        <Text style={styles.userLevelText}>
                          Level {user.level} • {user.levelTitle}
                        </Text>
                      </View>

                      {/* XP & Streak */}
                      <View style={styles.userStatsCol}>
                        <Text style={styles.userXpText}>{user.xp} XP</Text>
                        <View style={styles.streakSmallRow}>
                          <Ionicons name="flame" size={12} color="#FF7A00" />
                          <Text style={styles.streakSmallText}>{user.streak}d</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Selected Achievement Detail Modal */}
      {selectedAchievement && (
        <Modal
          transparent
          visible={!!selectedAchievement}
          animationType="fade"
          onRequestClose={() => setSelectedAchievement(null)}
        >
          <View style={styles.detailOverlay}>
            <View style={styles.detailCard}>
              <View style={[styles.detailIconCircle, { backgroundColor: selectedAchievement.color }]}>
                <Ionicons name={selectedAchievement.icon as any} size={36} color="#0A0A0B" />
              </View>
              <Text style={styles.detailTitle}>{selectedAchievement.title}</Text>
              <Text style={styles.detailHindi}>{selectedAchievement.hindiTitle}</Text>
              <Text style={styles.detailDesc}>{selectedAchievement.description}</Text>

              <View style={styles.detailRewardRow}>
                <Ionicons name="diamond" size={16} color="#7C3AED" />
                <Text style={styles.detailRewardText}>Reward: +{selectedAchievement.xpReward} XP</Text>
              </View>

              <View style={styles.detailStatusBox}>
                <Text style={styles.detailStatusText}>
                  Status: {selectedAchievement.unlocked ? '✅ Unlocked' : `⏳ Progress: ${selectedAchievement.current} / ${selectedAchievement.target}`}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.detailCloseBtn}
                onPress={() => setSelectedAchievement(null)}
              >
                <Text style={styles.detailCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Achievement Celebratory Notification */}
      <AchievementUnlockModal
        achievement={unlockedCelebration}
        onDismiss={() => setUnlockedCelebration(null)}
      />

      {/* Bottom Nav */}
      <BottomNavBar activeTab="progress" />
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#E5E5EB',
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
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#111114',
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  resetBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  leagueHeroCard: {
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 4,
  },
  leagueGradient: {
    padding: 22,
  },
  leagueTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  leagueBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  leagueBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#D6FF57',
    letterSpacing: 0.8,
  },
  streakHeroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  streakHeroText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  leagueStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  leagueTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  leagueXpText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
  },
  accuracyRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#D6FF57',
  },
  accuracyRingNum: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  accuracyRingLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#D6FF57',
  },
  xpTrackContainer: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    overflow: 'hidden',
  },
  xpTrackFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.lime,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  metricIconBoxFlame: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricIconBoxLime: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricIconBoxPink: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FDF2F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricNumber: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111114',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  metricSubLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  weeklyMatrixCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  weeklyMatrixHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  matrixTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  weeklyMatrixTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111114',
  },
  weeklyMatrixStreakText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF7A00',
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCol: {
    alignItems: 'center',
    gap: 6,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  dayLabelToday: {
    color: '#7C3AED',
    fontWeight: '900',
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleActive: {
    backgroundColor: colors.lime,
  },
  dayCircleToday: {
    borderWidth: 2,
    borderColor: '#7C3AED',
  },
  todayInnerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#7C3AED',
  },
  tabSwitchContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  tabSwitchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabSwitchBtnActive: {
    backgroundColor: colors.lime,
  },
  tabSwitchText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  tabSwitchTextActive: {
    color: '#0A0A0B',
    fontWeight: '900',
  },
  sectionBlock: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111114',
  },
  sectionSubtitleText: {
    fontSize: 12,
    color: '#6B7280',
  },
  aiInsightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  aiInsightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  aiSparkleBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#1E1E24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiInsightTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111114',
  },
  aiInsightBody: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  aiInsightActionRow: {
    flexDirection: 'row',
  },
  aiPracticeBtn: {
    backgroundColor: '#1E1E24',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  aiPracticeBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D6FF57',
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    gap: 12,
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyHistoryText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    maxWidth: 240,
  },
  historyItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111114',
  },
  historyItemTime: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 1,
  },
  historyXpBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  historyXpText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16A34A',
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badgeCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  badgeCardUnlocked: {
    borderColor: 'rgba(214, 255, 87, 0.4)',
    shadowColor: colors.lime,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 2,
  },
  badgeIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  badgeCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111114',
    textAlign: 'center',
    marginBottom: 2,
  },
  badgeCardHindi: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  badgeUnlockedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeUnlockedText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16A34A',
  },
  badgeProgressBox: {
    width: '100%',
    alignItems: 'center',
    gap: 4,
  },
  badgeProgressBar: {
    width: '100%',
    height: 5,
    borderRadius: 3,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
  },
  badgeProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  badgeProgressText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  leaderboardPeriodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  periodBtnActive: {
    backgroundColor: '#1E1E24',
    borderColor: '#1E1E24',
  },
  periodBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  periodBtnTextActive: {
    color: '#D6FF57',
    fontWeight: '800',
  },
  leaderboardLoading: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  leaderboardLoadingText: {
    fontSize: 12,
    color: '#6B7280',
  },
  offlineBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    gap: 8,
  },
  offlineTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111114',
  },
  offlineSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  offlineUserCard: {
    marginTop: 8,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  offlineUserCardText: {
    fontSize: 13,
    color: '#111114',
  },
  leaderboardList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    gap: 8,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 14,
  },
  leaderboardRowCurrent: {
    backgroundColor: 'rgba(214, 255, 87, 0.25)',
    borderWidth: 1,
    borderColor: colors.lime,
  },
  rankBadge: {
    width: 28,
    alignItems: 'center',
  },
  rankNumText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6B7280',
  },
  userAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userNameText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111114',
  },
  userLevelText: {
    fontSize: 11,
    color: '#6B7280',
  },
  userStatsCol: {
    alignItems: 'flex-end',
  },
  userXpText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#111114',
  },
  streakSmallRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  streakSmallText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF7A00',
  },
  // Achievement detail modal
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  detailCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#1E1E24',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
  },
  detailIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  detailHindi: {
    fontSize: 13,
    color: '#A1A1AA',
    marginBottom: 8,
  },
  detailDesc: {
    fontSize: 12,
    color: '#D4D4D8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
  },
  detailRewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#27272A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 10,
  },
  detailRewardText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D6FF57',
  },
  detailStatusBox: {
    marginBottom: 16,
  },
  detailStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E4E4E7',
  },
  detailCloseBtn: {
    width: '100%',
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailCloseBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0A0A0B',
  },
});
