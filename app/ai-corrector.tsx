import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AIClient } from '../src/services/aiClient';
import { getFormulaById } from '../src/search/formulaSearch';
import { FormulaCard } from '../src/components/FormulaCard';
import { SentenceCorrectionResult } from '../src/types/ai';
import { colors, spacing, typography, radii, shadows } from '../src/theme';

export default function AICorrectorScreen() {
  const router = useRouter();
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SentenceCorrectionResult | null>(null);

  const sampleSentences = [
    'He have been working.',
    'She do not knows my brother.',
    'I am agree with your opinion.',
    'Show me to speak this word.',
    'I cannot find my watch.',
  ];

  const handleCheck = async (sentenceToCheck?: string) => {
    const s = (sentenceToCheck || inputText).trim();
    if (!s || loading) return;

    if (sentenceToCheck) {
      setInputText(sentenceToCheck);
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await AIClient.correctSentence(s);
      setResult(res);
    } catch (err: any) {
      Alert.alert('Correction Error', err.message || 'Could not verify sentence.');
    } finally {
      setLoading(false);
    }
  };

  const matchingFormulas = result?.suggestedFormulaIds
    ? result.suggestedFormulaIds
        .map((id) => getFormulaById(id))
        .filter((f): f is NonNullable<typeof f> => !!f)
    : [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Editorial Intro Banner */}
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Ionicons name="sparkles" size={20} color={colors.lime} />
        </View>
        <Text style={styles.title}>SENTENCE CORRECTOR</Text>
        <Text style={styles.subtitle}>
          Enter any English sentence. AI checks grammar, explains corrections in clear Hindi, and maps them directly to the 600 Sentence Formulas.
        </Text>
      </View>

      {/* Input Workspace Card */}
      <View style={styles.inputCard}>
        <TextInput
          style={styles.textInput}
          placeholder="Type or paste your English sentence here..."
          placeholderTextColor={colors.secondaryText}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={300}
        />

        <View style={styles.inputActions}>
          <Text style={styles.charCount}>{inputText.length}/300</Text>
          <TouchableOpacity
            style={[styles.checkBtn, !inputText.trim() && styles.checkBtnDisabled]}
            onPress={() => handleCheck()}
            disabled={!inputText.trim() || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={colors.darkSurface} size="small" />
            ) : (
              <>
                <Ionicons name="sparkles" size={15} color={colors.darkSurface} />
                <Text style={styles.checkBtnText}>Check Grammar</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Sample Sentences Chips */}
      <View style={styles.samplesSection}>
        <Text style={styles.samplesLabel}>Or try one of these test sentences:</Text>
        <View style={styles.samplesList}>
          {sampleSentences.map((sample, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.sampleChip}
              onPress={() => handleCheck(sample)}
              activeOpacity={0.8}
            >
              <Text style={styles.sampleChipText}>"{sample}"</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Correction Result Box */}
      {result && (
        <View
          style={[
            styles.resultCard,
            result.isCorrect ? styles.resultCorrect : styles.resultIncorrect,
          ]}
        >
          <View style={styles.resultHeader}>
            <View
              style={[
                styles.resultStatusIconBadge,
                { backgroundColor: result.isCorrect ? '#DCFCE7' : '#FEE2E2' },
              ]}
            >
              <Ionicons
                name={result.isCorrect ? 'checkmark-circle' : 'alert-circle'}
                size={20}
                color={result.isCorrect ? colors.success : '#DC2626'}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.resultTitle,
                  result.isCorrect ? styles.resultTitleGreen : styles.resultTitleRed,
                ]}
              >
                {result.isCorrect ? 'Grammatically Correct!' : 'Grammar Correction Needed'}
              </Text>
            </View>
          </View>

          {/* Original sentence */}
          <View style={styles.sentenceBox}>
            <Text style={styles.comparisonLabel}>YOUR INPUT:</Text>
            <Text style={styles.originalText}>{result.original}</Text>
          </View>

          {/* Corrected sentence */}
          <View style={styles.sentenceBox}>
            <Text style={styles.comparisonLabel}>CORRECTED SENTENCE:</Text>
            <Text style={styles.correctedText}>{result.corrected}</Text>
          </View>

          {/* Hindi Explanation */}
          <View style={styles.explanationBox}>
            <Text style={styles.explanationLabel}>व्याख्या (HINDI EXPLANATION):</Text>
            <Text style={styles.explanationBody}>{result.explanationHindi}</Text>
          </View>

          {/* Grammar Tags */}
          {result.grammarTags && result.grammarTags.length > 0 && (
            <View style={styles.tagsRow}>
              {result.grammarTags.map((tag) => (
                <View key={tag} style={styles.tagBadge}>
                  <Text style={styles.tagBadgeText}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Additional Practice Example */}
          {result.practiceExample && (
            <View style={styles.practiceBox}>
              <Text style={styles.practiceBoxHeader}>ADDITIONAL PRACTICE SENTENCE:</Text>
              <Text style={styles.practiceEng}>{result.practiceExample.english}</Text>
              <Text style={styles.practiceHin}>{result.practiceExample.hindi}</Text>
            </View>
          )}

          {/* Matching Formula from 600 dataset */}
          {matchingFormulas.length > 0 && (
            <View style={styles.matchingFormulaSection}>
              <Text style={styles.matchingFormulaHeader}>
                Relevant Formula from the 600 Dataset:
              </Text>
              {matchingFormulas.map((f) => (
                <FormulaCard
                  key={f.id}
                  formula={f}
                  onPress={() => router.push(`/formulas/${f.id}`)}
                  onAskAI={() => router.push({ pathname: '/ai-teacher', params: { formulaId: f.id } })}
                />
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl + 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingTop: spacing.xs,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  title: {
    ...typography.antonHero,
    fontSize: 32,
    lineHeight: 36,
    color: colors.foreground,
    letterSpacing: -1,
  },
  subtitle: {
    ...typography.bodySecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 18,
    paddingHorizontal: spacing.md,
    color: colors.textMuted2,
  },
  inputCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.card,
  },
  textInput: {
    ...typography.body,
    color: colors.foreground,
    minHeight: 85,
    textAlignVertical: 'top',
  },
  inputActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  charCount: {
    ...typography.caption,
    color: colors.textMuted2,
  },
  checkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.lime,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.dock,
    ...shadows.limeGlow,
  },
  checkBtnDisabled: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    opacity: 0.4,
  },
  checkBtnText: {
    ...typography.buttonSmall,
    color: colors.limeText,
    fontWeight: '900',
  },
  samplesSection: {
    marginTop: spacing.lg,
  },
  samplesLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textMuted2,
    marginBottom: spacing.sm,
  },
  samplesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sampleChip: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.dock,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  sampleChipText: {
    ...typography.caption,
    color: colors.foreground,
    fontWeight: '700',
  },
  resultCard: {
    marginTop: spacing.xl,
    borderRadius: radii.card,
    padding: 22,
    borderWidth: 1.5,
    ...shadows.card,
  },
  resultCorrect: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(212, 255, 0, 0.4)',
  },
  resultIncorrect: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(255, 59, 48, 0.4)',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  resultStatusIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTitle: {
    ...typography.h3,
    fontWeight: '800',
  },
  resultTitleGreen: {
    color: colors.lime,
  },
  resultTitleRed: {
    color: colors.matchedHighlight,
  },
  sentenceBox: {
    marginBottom: spacing.sm,
  },
  comparisonLabel: {
    ...typography.badge,
    color: colors.textMuted2,
    letterSpacing: 0.8,
  },
  originalText: {
    ...typography.body,
    color: colors.textMuted2,
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  correctedText: {
    ...typography.h3,
    color: colors.lime,
    fontWeight: '900',
    marginTop: 2,
  },
  explanationBox: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 20,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.lime,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  explanationLabel: {
    ...typography.badge,
    color: colors.foreground,
    marginBottom: 4,
  },
  explanationBody: {
    ...typography.hindiBody,
    color: colors.foreground,
    lineHeight: 22,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  tagBadge: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.dock,
  },
  tagBadgeText: {
    fontSize: 11,
    color: colors.textMuted2,
    fontWeight: '700',
  },
  practiceBox: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 20,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  practiceBoxHeader: {
    ...typography.badge,
    color: colors.textMuted2,
    marginBottom: 4,
  },
  practiceEng: {
    ...typography.body,
    fontWeight: '700',
    color: colors.foreground,
  },
  practiceHin: {
    ...typography.hindiBody,
    color: colors.matchedHighlight,
    marginTop: 2,
  },
  matchingFormulaSection: {
    marginTop: spacing.lg,
  },
  matchingFormulaHeader: {
    ...typography.badge,
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
});
