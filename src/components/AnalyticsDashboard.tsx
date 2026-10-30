import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LearningAnalyticsData } from '../types/analytics';
import { colors } from '../theme';

interface AnalyticsDashboardProps {
  analytics: LearningAnalyticsData;
  onRefresh?: () => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ analytics, onRefresh }) => {
  const router = useRouter();

  const {
    totalFormulasCompleted,
    totalFormulasTarget,
    formulaCompletionPercent,
    quizzesCompleted,
    overallQuizAccuracy,
    currentStreak,
    longestStreak,
    totalXp,
    estimatedStudyTimeMinutes,
    speakingSessionsCount,
    weeklyActivity,
    monthlyWeeks,
    categoryAccuracies,
    weakTopics,
    recommendations,
    hasHistory,
  } = analytics;

  return (
    <View style={styles.container}>
      {/* 1. Core Summary 4-Grid */}
      <View style={styles.statsGrid}>
        {/* Metric 1: Formulas Completed */}
        <View style={styles.statTile}>
          <View style={styles.tileIconRow}>
            <View style={[styles.tileIconBox, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="book-outline" size={16} color="#16A34A" />
            </View>
            <Text style={styles.tileBadgeText}>{formulaCompletionPercent}%</Text>
          </View>
          <Text style={styles.tileValue}>{totalFormulasCompleted} / {totalFormulasTarget}</Text>
          <Text style={styles.tileLabel}>Formulas Learned</Text>
          <View style={styles.tileTrack}>
            <View style={[styles.tileFill, { width: `${formulaCompletionPercent}%`, backgroundColor: '#16A34A' }]} />
          </View>
        </View>

        {/* Metric 2: Quiz Accuracy */}
        <View style={styles.statTile}>
          <View style={styles.tileIconRow}>
            <View style={[styles.tileIconBox, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="checkmark-done" size={16} color="#7C3AED" />
            </View>
            <Text style={[styles.tileBadgeText, { color: '#7C3AED' }]}>{quizzesCompleted} Quizzes</Text>
          </View>
          <Text style={styles.tileValue}>{overallQuizAccuracy}%</Text>
          <Text style={styles.tileLabel}>Quiz Accuracy</Text>
          <View style={styles.tileTrack}>
            <View style={[styles.tileFill, { width: `${overallQuizAccuracy}%`, backgroundColor: '#7C3AED' }]} />
          </View>
        </View>

        {/* Metric 3: Genuine Study Time */}
        <View style={styles.statTile}>
          <View style={styles.tileIconRow}>
            <View style={[styles.tileIconBox, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="time-outline" size={16} color="#D97706" />
            </View>
            <Text style={[styles.tileBadgeText, { color: '#D97706' }]}>Active</Text>
          </View>
          <Text style={styles.tileValue}>{estimatedStudyTimeMinutes} Mins</Text>
          <Text style={styles.tileLabel}>Study Time</Text>
          <Text style={styles.tileSubLabel}>{speakingSessionsCount} speaking sessions</Text>
        </View>

        {/* Metric 4: Streak Mastery */}
        <View style={styles.statTile}>
          <View style={styles.tileIconRow}>
            <View style={[styles.tileIconBox, { backgroundColor: '#FFF7ED' }]}>
              <Ionicons name="flame" size={16} color="#FF7A00" />
            </View>
            <Text style={[styles.tileBadgeText, { color: '#FF7A00' }]}>Best: {longestStreak}d</Text>
          </View>
          <Text style={styles.tileValue}>{currentStreak} Days</Text>
          <Text style={styles.tileLabel}>Current Streak</Text>
          <Text style={styles.tileSubLabel}>{totalXp} XP earned</Text>
        </View>
      </View>

      {/* 2. Weekly Learning Activity Bar Chart */}
      <View style={styles.sectionCard}>
        <View style={styles.cardHeaderRow}>
          <View>
            <Text style={styles.cardTitle}>Weekly Activity</Text>
            <Text style={styles.cardSubtitle}>XP and consistency across this week</Text>
          </View>
          <View style={styles.chartTagPill}>
            <Ionicons name="sparkles" size={12} color="#16A34A" />
            <Text style={styles.chartTagText}>Live XP</Text>
          </View>
        </View>

        {/* Bar Chart Columns */}
        <View style={styles.barChartContainer}>
          {weeklyActivity.map((pt, idx) => (
            <View key={idx} style={styles.barCol}>
              <Text style={styles.barValText}>{pt.xp > 0 ? pt.xp : ''}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { height: `${pt.barPercent}%` },
                    pt.isActive ? styles.barActive : styles.barInactive,
                    pt.isToday && styles.barToday,
                  ]}
                />
              </View>
              <Text style={[styles.barDayLabel, pt.isToday && styles.barDayLabelToday]}>
                {pt.day}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* 3. Weak Grammar Topic Analysis */}
      <View style={styles.sectionCard}>
        <View style={styles.cardHeaderRow}>
          <View>
            <Text style={styles.cardTitle}>Weak Grammar Analysis</Text>
            <Text style={styles.cardSubtitle}>Identified from real quiz & sentence mistakes</Text>
          </View>
          <Ionicons name="analytics" size={18} color="#7C3AED" />
        </View>

        {weakTopics.length === 0 ? (
          <View style={styles.emptyTopicBox}>
            <Ionicons name="shield-checkmark" size={28} color="#16A34A" />
            <Text style={styles.emptyTopicText}>No recurring grammar mistakes detected yet!</Text>
          </View>
        ) : (
          <View style={styles.topicsList}>
            {weakTopics.map((topic, idx) => {
              const isCritical = topic.status === 'critical';
              const isDeveloping = topic.status === 'developing';

              return (
                <View key={idx} style={styles.topicRow}>
                  <View style={styles.topicInfo}>
                    <View style={styles.topicNameRow}>
                      <Text style={styles.topicName}>{topic.topic}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          isCritical
                            ? styles.statusCritical
                            : isDeveloping
                            ? styles.statusDeveloping
                            : styles.statusMastered,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            isCritical
                              ? styles.statusCriticalText
                              : isDeveloping
                              ? styles.statusDevelopingText
                              : styles.statusMasteredText,
                          ]}
                        >
                          {isCritical
                            ? 'Needs Practice'
                            : isDeveloping
                            ? 'Developing'
                            : 'Mastered'}
                        </Text>
                      </View>
                    </View>

                    {topic.mistakeCount > 0 && (
                      <Text style={styles.mistakeNote}>
                        ⚠️ {topic.mistakeCount} mistakes logged in quizzes
                      </Text>
                    )}
                  </View>

                  {topic.suggestedFormulaId ? (
                    <TouchableOpacity
                      style={styles.drillBtn}
                      onPress={() => router.push(`/formulas/${topic.suggestedFormulaId}`)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.drillBtnText}>Formula #{topic.suggestedFormulaId}</Text>
                      <Ionicons name="chevron-forward" size={12} color="#0A0A0B" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* 4. Category Mastery & Accuracy */}
      <View style={styles.sectionCard}>
        <View style={styles.cardHeaderRow}>
          <View>
            <Text style={styles.cardTitle}>Category Accuracy</Text>
            <Text style={styles.cardSubtitle}>Performance across key English structures</Text>
          </View>
        </View>

        <View style={styles.catAccList}>
          {categoryAccuracies.map((cat, idx) => (
            <View key={idx} style={styles.catAccRow}>
              <View style={styles.catAccInfo}>
                <Text style={styles.catAccName}>{cat.category}</Text>
                <Text style={styles.catAccPercent}>{cat.accuracy}%</Text>
              </View>
              <View style={styles.catAccTrack}>
                <View
                  style={[
                    styles.catAccFill,
                    { width: `${cat.accuracy}%`, backgroundColor: cat.color },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* 5. Personalized Recommendations */}
      <View style={styles.sectionCard}>
        <View style={styles.cardHeaderRow}>
          <View>
            <Text style={styles.cardTitle}>Personalized Next Steps</Text>
            <Text style={styles.cardSubtitle}>Tailored to your actual learning analytics</Text>
          </View>
          <Ionicons name="compass-outline" size={18} color="#059669" />
        </View>

        <View style={styles.recsList}>
          {recommendations.map((rec) => (
            <View key={rec.id} style={styles.recCard}>
              <View style={styles.recHeaderRow}>
                <View style={styles.recTypeBadge}>
                  <Ionicons
                    name={
                      rec.type === 'formula_review'
                        ? 'book'
                        : rec.type === 'quiz_practice'
                        ? 'flash'
                        : 'mic'
                    }
                    size={13}
                    color="#0A0A0B"
                  />
                  <Text style={styles.recTypeBadgeText}>
                    {rec.type === 'formula_review'
                      ? 'FORMULA LESSON'
                      : rec.type === 'quiz_practice'
                      ? 'TARGET DRILL'
                      : 'SPEAKING'}
                  </Text>
                </View>
              </View>

              <Text style={styles.recTitle}>{rec.title}</Text>
              <Text style={styles.recHindi}>{rec.hindiTitle}</Text>
              <Text style={styles.recReason}>{rec.reason}</Text>

              <TouchableOpacity
                style={styles.recActionBtn}
                onPress={() => router.push(rec.actionRoute as any)}
                activeOpacity={0.85}
              >
                <Text style={styles.recActionBtnText}>{rec.actionText}</Text>
                <Ionicons name="arrow-forward" size={14} color="#0A0A0B" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statTile: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  tileIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tileIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16A34A',
  },
  tileValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111114',
    marginBottom: 2,
  },
  tileLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  tileSubLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  tileTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F3F4F6',
    marginTop: 8,
    overflow: 'hidden',
  },
  tileFill: {
    height: '100%',
    borderRadius: 2,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111114',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  chartTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  chartTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16A34A',
  },
  barChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    paddingTop: 10,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
    gap: 6,
  },
  barValText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6B7280',
  },
  barTrack: {
    width: 24,
    height: 90,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 12,
  },
  barActive: {
    backgroundColor: colors.lime,
  },
  barInactive: {
    backgroundColor: '#E5E7EB',
  },
  barToday: {
    borderWidth: 2,
    borderColor: '#7C3AED',
  },
  barDayLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  barDayLabelToday: {
    color: '#7C3AED',
    fontWeight: '900',
  },
  emptyTopicBox: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  emptyTopicText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#16A34A',
    textAlign: 'center',
  },
  topicsList: {
    gap: 10,
  },
  topicRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  topicInfo: {
    flex: 1,
  },
  topicNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topicName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111114',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusCritical: {
    backgroundColor: '#FEE2E2',
  },
  statusDeveloping: {
    backgroundColor: '#FEF3C7',
  },
  statusMastered: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  statusCriticalText: {
    color: '#DC2626',
  },
  statusDevelopingText: {
    color: '#D97706',
  },
  statusMasteredText: {
    color: '#16A34A',
  },
  mistakeNote: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  drillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.lime,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginLeft: 8,
  },
  drillBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0A0A0B',
  },
  catAccList: {
    gap: 12,
  },
  catAccRow: {
    gap: 6,
  },
  catAccInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catAccName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111114',
  },
  catAccPercent: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B7280',
  },
  catAccTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
  },
  catAccFill: {
    height: '100%',
    borderRadius: 3,
  },
  recsList: {
    gap: 12,
  },
  recCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  recHeaderRow: {
    marginBottom: 8,
  },
  recTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: colors.lime,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  recTypeBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#0A0A0B',
  },
  recTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111114',
    marginBottom: 2,
  },
  recHindi: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  recReason: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 18,
    marginBottom: 12,
  },
  recActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.12)',
  },
  recActionBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0A0A0B',
  },
});

