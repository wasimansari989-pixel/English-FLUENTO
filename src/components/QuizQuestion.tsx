import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  Easing,
  AccessibilityInfo,
} from 'react-native';
import { QuizQuestion as QuizQuestionType, QuizQuestionType as QTypeKey } from '../types/ai';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows } from '../theme';

interface QuizQuestionProps {
  question: QuizQuestionType;
  onAnswerSelected: (isCorrect: boolean, selectedOption: string) => void;
  onNextQuestion: () => void;
  onViewFormula?: (id: number) => void;
  isDark?: boolean;
}

const getQuestionTypeMeta = (type: QTypeKey | string) => {
  switch (type) {
    case 'formula-based':
    case 'choose-formula':
      return { label: 'FORMULA DRILL', color: '#15803D', bg: '#DCFCE7' };
    case 'helping-verb':
      return { label: 'HELPING VERB', color: '#7C3AED', bg: '#EDE9FE' };
    case 'fill-blank':
      return { label: 'FILL IN BLANK', color: '#2563EB', bg: '#DBEAFE' };
    case 'hindi-to-english':
      return { label: 'HINDI TO ENGLISH', color: '#0284C7', bg: '#E0F2FE' };
    case 'english-to-hindi':
      return { label: 'ENGLISH TO HINDI', color: '#0D9488', bg: '#CCFBF1' };
    case 'correct-sentence':
      return { label: 'CORRECT SENTENCE', color: '#059669', bg: '#D1FAE5' };
    case 'grammar-correction':
      return { label: 'GRAMMAR CORRECTION', color: '#EA580C', bg: '#FFEDD5' };
    case 'tense-practice':
      return { label: 'TENSE PRACTICE', color: '#9333EA', bg: '#F3E8FF' };
    case 'vocabulary-practice':
      return { label: 'VOCABULARY DRILL', color: '#DB2777', bg: '#FCE7F3' };
    case 'phrase-match':
      return { label: 'PHRASE MATCH', color: '#4F46E5', bg: '#EEF2FF' };
    default:
      return { label: 'PRACTICE DRILL', color: '#4B5563', bg: '#F3F4F6' };
  }
};

const getDifficultyMeta = (diff: string) => {
  switch (diff?.toLowerCase()) {
    case 'advanced':
      return { label: 'ADVANCED', color: '#DC2626', bg: '#FEE2E2', border: '#FECACA' };
    case 'intermediate':
      return { label: 'INTERMEDIATE', color: '#D97706', bg: '#FEF3C7', border: '#FDE68A' };
    case 'beginner':
    default:
      return { label: 'BEGINNER', color: '#15803D', bg: '#DCFCE7', border: '#BBF7D0' };
  }
};

const AnimatedOptionRow: React.FC<{
  letter: string;
  opt: string;
  idx: number;
  isSelected: boolean;
  isAnswered: boolean;
  isCorrect: boolean;
  onSelect: () => void;
}> = ({ letter, opt, idx, isSelected, isAnswered, isCorrect, onSelect }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shakeX = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    if (isAnswered) return;
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      speed: 50,
      bounciness: 0,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      speed: 35,
      bounciness: 4,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    if (!isAnswered) {
      shakeX.setValue(0);
      scaleAnim.setValue(1);
      return;
    }

    if (isAnswered && isSelected) {
      AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
        if (reduced) return;

        if (!isCorrect) {
          // Subtle tactile shake for incorrect answer
          Animated.sequence([
            Animated.timing(shakeX, { toValue: -6, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeX, { toValue: 6, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeX, { toValue: -4, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeX, { toValue: 4, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeX, { toValue: 0, duration: 60, useNativeDriver: true }),
          ]).start();
        } else {
          // Gentle celebrate pop for correct answer
          Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 1.03, duration: 120, useNativeDriver: true }),
            Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 90, useNativeDriver: true }),
          ]).start();
        }
      });
    }
  }, [isAnswered, isSelected, isCorrect]);

  let btnStyle: any = [styles.optionButton];
  let letterStyle: any = [styles.optLetter];
  let textStyle: any = [styles.optionText];

  if (isSelected && !isAnswered) {
    btnStyle.push(styles.optionSelected);
    letterStyle.push(styles.optLetterSelected);
    textStyle.push(styles.optionSelectedText);
  }

  if (isAnswered) {
    if (isCorrect) {
      btnStyle.push(styles.optionCorrect);
      letterStyle.push(styles.optLetterCorrect);
      textStyle.push(styles.optionCorrectText);
    } else if (isSelected && !isCorrect) {
      btnStyle.push(styles.optionIncorrect);
      letterStyle.push(styles.optLetterIncorrect);
      textStyle.push(styles.optionIncorrectText);
    }
  }

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }, { translateX: shakeX }],
      }}
    >
      <TouchableOpacity
        style={btnStyle}
        onPress={onSelect}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isAnswered}
        activeOpacity={0.88}
      >
        <View style={letterStyle}>
          <Text style={[styles.optLetterText, isSelected && !isAnswered && { color: '#0A0A0B' }]}>
            {letter}
          </Text>
        </View>

        <Text style={textStyle}>{opt}</Text>

        <View style={styles.radioWrapper}>
          {isAnswered && isCorrect ? (
            <View style={styles.radioCorrect}>
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            </View>
          ) : isAnswered && isSelected && !isCorrect ? (
            <View style={styles.radioIncorrect}>
              <Ionicons name="close" size={14} color="#FFFFFF" />
            </View>
          ) : isSelected ? (
            <View style={styles.radioActive}>
              <Ionicons name="checkmark" size={14} color="#0A0A0B" />
            </View>
          ) : (
            <View style={styles.radioInactive} />
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const QuizQuestion: React.FC<QuizQuestionProps> = ({
  question,
  onAnswerSelected,
  onNextQuestion,
  onViewFormula,
  isDark = true,
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const feedbackAnim = useRef(new Animated.Value(0)).current;

  // Reset internal state when a new question is loaded
  useEffect(() => {
    setSelectedOption(null);
    setIsAnswered(false);
    feedbackAnim.setValue(0);
  }, [question.id, question.prompt]);

  useEffect(() => {
    if (isAnswered) {
      feedbackAnim.setValue(0);
      Animated.timing(feedbackAnim, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [isAnswered]);

  const handleSelect = (option: string) => {
    if (isAnswered) return;
    setSelectedOption(option);
    setIsAnswered(true);
    const isCorrect = option.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
    onAnswerSelected(isCorrect, option);
  };

  const isSelectedCorrect = selectedOption?.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
  const typeMeta = getQuestionTypeMeta(question.type);
  const diffMeta = getDifficultyMeta(question.difficulty);

  return (
    <View style={styles.card}>
      {/* Question Type & Difficulty */}
      <View style={styles.topRow}>
        <View style={[styles.typeBadge, { backgroundColor: typeMeta.bg, borderColor: typeMeta.color + '40' }]}>
          <Text style={[styles.typeBadgeText, { color: typeMeta.color }]}>
            {typeMeta.label}
          </Text>
        </View>

        <View style={[styles.diffBadge, { backgroundColor: diffMeta.bg, borderColor: diffMeta.border }]}>
          <Ionicons name="sparkles" size={10} color={diffMeta.color} />
          <Text style={[styles.diffBadgeText, { color: diffMeta.color }]}>
            {diffMeta.label}
          </Text>
        </View>
      </View>

      {/* Prompt */}
      <Text style={styles.prompt}>
        {question.prompt}
      </Text>

      {/* Hindi subtext if available */}
      {question.hindiSubtext && (
        <View style={styles.hindiSubtextBox}>
          <Text style={styles.hindiSubtext}>
            {question.hindiSubtext}
          </Text>
        </View>
      )}

      {/* Options */}
      <View style={styles.optionsList}>
        {question.options.map((opt, idx) => {
          const letter = String.fromCharCode(65 + idx);
          const isThisOptionSelected = selectedOption === opt;
          const isThisOptionCorrect = opt.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();

          return (
            <AnimatedOptionRow
              key={`${idx}-${opt}`}
              letter={letter}
              opt={opt}
              idx={idx}
              isSelected={isThisOptionSelected}
              isAnswered={isAnswered}
              isCorrect={isThisOptionCorrect}
              onSelect={() => handleSelect(opt)}
            />
          );
        })}
      </View>

      {/* Answer Explanation & Feedback */}
      {isAnswered && (
        <Animated.View
          style={[
            styles.feedbackBox,
            isSelectedCorrect ? styles.feedbackCorrect : styles.feedbackIncorrect,
            {
              opacity: feedbackAnim,
              transform: [
                {
                  translateY: feedbackAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.feedbackHeader}>
            <Ionicons
              name={isSelectedCorrect ? 'checkmark-circle' : 'alert-circle'}
              size={20}
              color={isSelectedCorrect ? '#D6FF57' : '#EF4444'}
            />
            <Text style={[styles.feedbackTitle, { color: isSelectedCorrect ? '#D6FF57' : '#EF4444' }]}>
              {isSelectedCorrect ? 'बिल्कुल सही! (Correct)' : 'गलत उत्तर (Incorrect)'}
            </Text>
          </View>

          {/* If incorrect, show correct answer clearly */}
          {!isSelectedCorrect && (
            <View style={styles.answerComparisonBox}>
              <Text style={styles.comparisonLabel}>सही उत्तर (Correct Answer):</Text>
              <Text style={styles.comparisonValueCorrect}>{question.correctAnswer}</Text>
            </View>
          )}

          {question.explanationHindi ? (
            <Text style={styles.explanationText}>
              {question.explanationHindi}
            </Text>
          ) : null}

          {/* Action Row */}
          <View style={styles.actionRow}>
            {question.formulaId && onViewFormula ? (
              <TouchableOpacity
                style={styles.formulaBtn}
                onPress={() => onViewFormula(question.formulaId!)}
              >
                <Ionicons name="book-outline" size={14} color="#FFFFFF" />
                <Text style={styles.formulaBtnText}>Formula #{question.formulaId}</Text>
              </TouchableOpacity>
            ) : <View />}

            <TouchableOpacity style={styles.nextBtn} onPress={onNextQuestion}>
              <Text style={styles.nextBtnText}>Next Question</Text>
              <Ionicons name="arrow-forward" size={16} color="#0A0A0B" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 22,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: Platform.OS === 'android' ? 0 : 4,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  typeBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7C3AED',
    letterSpacing: 0.6,
  },
  diffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEFCE8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#FEF08A',
  },
  diffBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#854D0E',
    letterSpacing: 0.5,
  },
  prompt: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 25,
    color: '#111114',
    marginBottom: 10,
  },
  hindiSubtextBox: {
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    marginBottom: 16,
  },
  hindiSubtext: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111114',
    lineHeight: 20,
  },
  optionsList: {
    gap: 10,
    marginVertical: 6,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    padding: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: Platform.OS === 'android' ? 0 : 2,
  },
  optionSelected: {
    borderColor: '#84CC16',
    backgroundColor: '#F7FEE7',
  },
  optionCorrect: {
    backgroundColor: '#F0FDF4',
    borderColor: '#16A34A',
  },
  optionIncorrect: {
    backgroundColor: '#FEF2F2',
    borderColor: '#DC2626',
  },
  optLetter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  optLetterSelected: {
    backgroundColor: colors.lime,
    borderColor: colors.lime,
  },
  optLetterCorrect: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  optLetterIncorrect: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  optLetterText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111114',
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111114',
    lineHeight: 20,
  },
  optionSelectedText: {
    color: '#111114',
    fontWeight: '800',
  },
  optionCorrectText: {
    color: '#15803D',
    fontWeight: '700',
  },
  optionIncorrectText: {
    color: '#B91C1C',
    fontWeight: '700',
  },
  radioWrapper: {
    marginLeft: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInactive: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.20)',
  },
  radioActive: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCorrect: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioIncorrect: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackBox: {
    marginTop: 16,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: '#18181B',
    borderColor: 'rgba(0, 0, 0, 0.12)',
  },
  feedbackCorrect: {
    backgroundColor: '#18181B',
    borderColor: '#16A34A',
  },
  feedbackIncorrect: {
    backgroundColor: '#18181B',
    borderColor: '#DC2626',
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  feedbackTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  answerComparisonBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
    marginBottom: 10,
  },
  comparisonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F87171',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  comparisonValueCorrect: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  explanationText: {
    fontSize: 13,
    color: '#FFFFFF',
    lineHeight: 20,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    gap: 10,
  },
  formulaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E1E24',
    borderWidth: 1,
    borderColor: '#1E1E24',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  formulaBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.lime,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 9999,
    shadowColor: colors.lime,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: Platform.OS === 'android' ? 0 : 3,
  },
  nextBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0A0A0A',
  },
});
