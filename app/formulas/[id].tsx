import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getFormulaById } from '../../src/search/formulaSearch';
import { BookmarkRepository } from '../../src/database/bookmarkRepository';
import { ProgressRepository } from '../../src/database/progressRepository';
import { ExamplePair } from '../../src/components/ExamplePair';
import { HighlightLegend } from '../../src/components/HighlightedSentence';
import { AIClient } from '../../src/services/aiClient';
import { SentenceFormula } from '../../src/types/formula';
import { AIGeneratedExample } from '../../src/types/ai';
import { colors, spacing, typography, radii, shadows } from '../../src/theme';

export default function FormulaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const formulaId = parseInt(id || '1', 10);
  const [formula, setFormula] = useState<SentenceFormula | undefined>(() => getFormulaById(formulaId));
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [generatedExamples, setGeneratedExamples] = useState<AIGeneratedExample[]>([]);
  const [generatingAI, setGeneratingAI] = useState(false);

  useEffect(() => {
    const f = getFormulaById(formulaId);
    setFormula(f);
    setGeneratedExamples([]);

    if (f) {
      BookmarkRepository.isBookmarked(formulaId).then(setIsBookmarked);
      setTimeout(() => {
        ProgressRepository.recordFormulaViewed(formulaId);
      }, 80);
    }
  }, [formulaId]);

  const toggleBookmark = async () => {
    const newState = await BookmarkRepository.toggleBookmark(formulaId);
    setIsBookmarked(newState);
  };

  const handleGenerateMoreExamples = async () => {
    setGeneratingAI(true);
    try {
      const examples = await AIClient.generateExamples(formulaId, 5);
      setGeneratedExamples(examples);
    } catch (err: any) {
      Alert.alert('AI Example Generator', err?.message || 'Could not generate examples at this time.');
    } finally {
      setGeneratingAI(false);
    }
  };

  if (!formula) {
    return (
      <View style={styles.notFoundContainer}>
        <View style={styles.notFoundIconCircle}>
          <Ionicons name="alert-circle-outline" size={36} color={colors.secondaryText} />
        </View>
        <Text style={styles.notFoundText}>Formula #{formulaId} not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Return to Formulas</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hasPrev = formulaId > 1;
  const hasNext = formulaId < 600;

  return (
    <>
      <Stack.Screen
        options={{
          title: `Formula ${formula.id}`,
          headerStyle: { backgroundColor: '#E5E5EB' },
          headerTintColor: '#111114',
          headerTitleStyle: { ...typography.h3, color: '#111114', fontWeight: '800' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: '#E5E5EB' },
          headerRight: () => (
            <TouchableOpacity
              onPress={toggleBookmark}
              style={[styles.headerBookmarkBtn, isBookmarked && styles.headerBookmarkBtnActive]}
              accessibilityLabel="Bookmark formula"
            >
              <Ionicons
                name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                size={19}
                color={isBookmarked ? '#E11D48' : '#111114'}
              />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Top Prev / Next Navigation Row */}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[styles.navBtn, !hasPrev && styles.navBtnDisabled]}
            disabled={!hasPrev}
            onPress={() => router.replace(`/formulas/${formulaId - 1}`)}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={16} color={hasPrev ? '#111114' : '#9CA3AF'} />
            <Text style={[styles.navBtnText, !hasPrev && styles.navBtnTextDisabled]}>
              #{formulaId - 1}
            </Text>
          </TouchableOpacity>

          <View style={styles.sourcePill}>
            <Ionicons name="document-text-outline" size={12} color="#6B7280" />
            <Text style={styles.sourcePillText}>PDF Page {formula.sourcePage || formulaId + 1}</Text>
          </View>

          <TouchableOpacity
            style={[styles.navBtn, !hasNext && styles.navBtnDisabled]}
            disabled={!hasNext}
            onPress={() => router.replace(`/formulas/${formulaId + 1}`)}
            activeOpacity={0.7}
          >
            <Text style={[styles.navBtnText, !hasNext && styles.navBtnTextDisabled]}>
              #{formulaId + 1}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={hasNext ? '#111114' : '#9CA3AF'} />
          </TouchableOpacity>
        </View>

        {/* Central Editorial Bento Formula Card */}
        <View style={styles.heroFormulaCard}>
          {/* Header Badges */}
          <View style={styles.heroHeader}>
            <View style={styles.formulaNumberBadge}>
              <Text style={styles.formulaNumberText}>FORMULA {formula.id}</Text>
              <Text style={styles.formulaTotalText}>/ 600</Text>
            </View>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>{formula.category}</Text>
            </View>
          </View>

          {/* Pastel Yellow Box Structure (High Contrast Bento container) */}
          <View style={styles.formulaBox}>
            <Text style={styles.formulaBoxText}>{formula.englishFormula}</Text>
          </View>

          {/* Hindi Meaning & Identification */}
          <View style={styles.hindiMeaningBox}>
            <View style={styles.hindiMeaningTag}>
              <Text style={styles.hindiMeaningTagText}>पहचान / अर्थ</Text>
            </View>
            <Text style={styles.hindiMeaningText}>{formula.hindiMeaning}</Text>
          </View>

          {/* Helping Verbs Chips */}
          {formula.helpingVerbs && formula.helpingVerbs.length > 0 && (
            <View style={styles.verbsSection}>
              <Text style={styles.verbsLabel}>Helping Verbs:</Text>
              <View style={styles.verbsList}>
                {formula.helpingVerbs.map((v) => (
                  <View key={v} style={styles.verbBadge}>
                    <Text style={styles.verbBadgeText}>{v}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Primary Learning Actions */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.askAIBigBtn}
              onPress={() => router.push({ pathname: '/ai-teacher', params: { formulaId: formula.id } })}
              activeOpacity={0.88}
            >
              <Ionicons name="sparkles" size={16} color="#FFFFFF" />
              <Text style={styles.askAIBigBtnText}>Ask AI Tutor</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.practiceBigBtn}
              onPress={() => router.push({ pathname: '/practice', params: { formulaId: formula.id } })}
              activeOpacity={0.88}
            >
              <Ionicons name="trophy-outline" size={16} color="#FFFFFF" />
              <Text style={styles.practiceBigBtnText}>Take Quiz</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Hindi-English Phrase Matching Legend (Light Mode) */}
        <HighlightLegend isDark={false} />

        {/* Verified Examples Section */}
        <View style={styles.examplesSection}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>
              Verified Sentence Examples ({formula.examples.length})
            </Text>
            <View style={styles.verifiedSourceBadge}>
              <Ionicons name="checkmark-circle" size={12} color="#10B981" />
              <Text style={styles.verifiedSourceText}>Verified</Text>
            </View>
          </View>

          {formula.examples.map((ex, index) => (
            <ExamplePair
              key={ex.id}
              example={ex}
              index={index}
              isDark={true}
            />
          ))}
        </View>

        {/* AI Generator Bento Card */}
        <View style={styles.aiGeneratorSection}>
          <View style={styles.aiHeaderRow}>
            <View style={styles.aiIconBadge}>
              <Ionicons name="sparkles" size={18} color="#7C3AED" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.aiTitle}>Need More Practice Examples?</Text>
              <Text style={styles.aiDesc}>
                Generate 5 real-world spoken sentences with synchronized red phrase highlighting.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.generateBtn}
            onPress={handleGenerateMoreExamples}
            disabled={generatingAI}
            activeOpacity={0.85}
          >
            {generatingAI ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.generateBtnText}>Generate 5 AI Examples</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.voicePracticeBtn}
            onPress={() => router.push((`/talk-to-ai?formulaId=${formulaId}`) as any)}
            activeOpacity={0.88}
          >
            <Ionicons name="mic" size={18} color="#0A0A0A" />
            <Text style={styles.voicePracticeBtnText}>Talk to AI (Voice Practice)</Text>
          </TouchableOpacity>

          {generatedExamples.length > 0 && (
            <View style={styles.generatedList}>
              <Text style={styles.generatedListTitle}>AI Generated Spoken Examples:</Text>
              {generatedExamples.map((genEx, idx) => (
                <ExamplePair
                  key={`ai-${idx}`}
                  example={{
                    id: `ai-${idx}`,
                    hindiSegments: genEx.hindiSegments,
                    englishSegments: genEx.englishSegments,
                    originalHindi: genEx.hindiTranslation,
                    originalEnglish: genEx.englishSentence,
                    reviewStatus: 'reviewed',
                  }}
                  index={idx}
                  isDark={true}
                />
              ))}
            </View>
          )}
        </View>

        {/* Bottom Nav Row */}
        <View style={[styles.navRow, { marginTop: spacing.xl, marginBottom: 80 }]}>
          <TouchableOpacity
            style={[styles.navBtn, !hasPrev && styles.navBtnDisabled]}
            disabled={!hasPrev}
            onPress={() => router.replace(`/formulas/${formulaId - 1}`)}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={16} color={hasPrev ? '#111114' : '#9CA3AF'} />
            <Text style={[styles.navBtnText, !hasPrev && styles.navBtnTextDisabled]}>
              Previous (#{formulaId - 1})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navBtn, !hasNext && styles.navBtnDisabled]}
            disabled={!hasNext}
            onPress={() => router.replace(`/formulas/${formulaId + 1}`)}
            activeOpacity={0.7}
          >
            <Text style={[styles.navBtnText, !hasNext && styles.navBtnTextDisabled]}>
              Next (#{formulaId + 1})
            </Text>
            <Ionicons name="chevron-forward" size={16} color={hasNext ? '#111114' : '#9CA3AF'} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E5E5EB',
  },
  content: {
    padding: spacing.lg,
  },
  headerBookmarkBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    marginRight: 4,
  },
  headerBookmarkBtnActive: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FDA4AF',
  },
  notFoundContainer: {
    flex: 1,
    backgroundColor: '#E5E5EB',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  notFoundIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  notFoundText: {
    ...typography.h3,
    color: '#111114',
  },
  backBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.orange,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: 9999,
  },
  backBtnText: {
    ...typography.buttonSmall,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    gap: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  navBtnDisabled: {
    opacity: 0.35,
  },
  navBtnText: {
    ...typography.caption,
    fontWeight: '700',
    color: '#111114',
  },
  navBtnTextDisabled: {
    color: '#9CA3AF',
  },
  sourcePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    gap: 5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  sourcePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  heroFormulaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    marginBottom: spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 4,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  formulaNumberBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 5,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    gap: 3,
  },
  formulaNumberText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7C3AED',
    letterSpacing: 0.5,
  },
  formulaTotalText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#6B7280',
  },
  categoryPill: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 5,
    borderRadius: 9999,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#111114',
  },
  formulaBox: {
    backgroundColor: colors.lime,
    borderColor: '#C4EC00',
    borderWidth: 1.5,
    borderRadius: 20,
    padding: spacing.md + 4,
    marginBottom: spacing.md,
    alignItems: 'center',
    shadowColor: colors.lime,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  formulaBoxText: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '900',
    color: '#0A0A0A',
    textAlign: 'center',
  },
  hindiMeaningBox: {
    backgroundColor: '#FEFCE8',
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#FEF08A',
  },
  hindiMeaningTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF08A',
    borderWidth: 1,
    borderColor: '#FDE047',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  hindiMeaningTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#854D0E',
    letterSpacing: 0.5,
  },
  hindiMeaningText: {
    fontSize: 18,
    lineHeight: 26,
    color: '#111114',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  verbsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  verbsLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: '#6B7280',
  },
  verbsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  verbBadge: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  verbBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111114',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  askAIBigBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: '#1E1E24',
    borderWidth: 1,
    borderColor: '#1E1E24',
    paddingVertical: 13,
    borderRadius: 9999,
  },
  askAIBigBtnText: {
    ...typography.buttonSmall,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  practiceBigBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.lime,
    paddingVertical: 13,
    borderRadius: 9999,
    shadowColor: colors.lime,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 3,
  },
  practiceBigBtnText: {
    ...typography.buttonSmall,
    color: '#0A0A0A',
    fontWeight: '900',
  },
  examplesSection: {
    marginTop: spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
    color: '#111114',
    fontWeight: '800',
  },
  verifiedSourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.35)',
    paddingHorizontal: spacing.xs + 4,
    paddingVertical: 3,
    borderRadius: 9999,
    gap: 3,
  },
  verifiedSourceText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16A34A',
  },
  aiGeneratorSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    padding: spacing.lg,
    marginTop: spacing.lg,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 4,
  },
  aiHeaderRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  aiIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111114',
  },
  aiDesc: {
    ...typography.caption,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 16,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: '#1E1E24',
    borderWidth: 1,
    borderColor: '#1E1E24',
    paddingVertical: 13,
    borderRadius: 9999,
  },
  generateBtnText: {
    ...typography.buttonSmall,
    color: '#FFFFFF',
    fontWeight: '900',
  },
  voicePracticeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.lime,
    paddingVertical: 13,
    borderRadius: 9999,
    marginTop: 10,
    shadowColor: colors.lime,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 3,
  },
  voicePracticeBtnText: {
    ...typography.buttonSmall,
    color: '#0A0A0A',
    fontWeight: '900',
  },
  generatedList: {
    marginTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
    paddingTop: spacing.md,
  },
  generatedListTitle: {
    ...typography.caption,
    fontWeight: '800',
    color: '#111114',
    marginBottom: spacing.sm,
  },
});
