import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { QuizQuestion as QuizQuestionType } from '../types/ai';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows } from '../theme';

interface QuizQuestionProps {
  question: QuizQuestionType;
  onAnswerSelected: (isCorrect: boolean, selectedOption: string) => void;
  onNextQuestion: () => void;
  onViewFormula?: (id: number) => void;
  isDark?: boolean;
}

export const QuizQuestion: React.FC<QuizQuestionProps> = ({
  question,
  onAnswerSelected,
  onNextQuestion,
  onViewFormula,
  isDark = true
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  // Reset internal state when a new question is loaded
  useEffect(() => {
    setSelectedOption(null);
    setIsAnswered(false);
  }, [question.id, question.prompt]);

  const handleSelect = (option: string) => {
    if (isAnswered) return;
    setSelectedOption(option);
    setIsAnswered(true);
    const isCorrect = option.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
    onAnswerSelected(isCorrect, option);
  };

  const isSelectedCorrect = selectedOption?.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();

  return (
    <View style={styles.card}>
      {/* Question Type & Difficulty */}
      <View style={styles.topRow}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>
            {question.type.replace(/-/g, ' ').toUpperCase()}
          </Text>
        </View>

        <View style={styles.diffBadge}>
          <Ionicons name="sparkles" size={10} color="#D6FF57" />
          <Text style={styles.diffBadgeText}>
            {question.difficulty.toUpperCase()}
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

          let btnStyle: any = [styles.optionButton];
          let letterStyle: any = [styles.optLetter];
          let textStyle: any = [styles.optionText];

          if (isThisOptionSelected && !isAnswered) {
            btnStyle.push(styles.optionSelected);
            letterStyle.push(styles.optLetterSelected);
            textStyle.push(styles.optionSelectedText);
          }

          if (isAnswered) {
            if (isThisOptionCorrect) {
              btnStyle.push(styles.optionCorrect);
              letterStyle.push(styles.optLetterCorrect);
              textStyle.push(styles.optionCorrectText);
            } else if (isThisOptionSelected && !isThisOptionCorrect) {
              btnStyle.push(styles.optionIncorrect);
              letterStyle.push(styles.optLetterIncorrect);
              textStyle.push(styles.optionIncorrectText);
            }
          }

          return (
            <TouchableOpacity
              key={`${idx}-${opt}`}
              style={btnStyle}
              onPress={() => handleSelect(opt)}
              disabled={isAnswered}
              activeOpacity={0.8}
            >
              <View style={letterStyle}>
                <Text style={[styles.optLetterText, isThisOptionSelected && !isAnswered && { color: '#0A0A0B' }]}>
                  {letter}
                </Text>
              </View>

              <Text style={textStyle}>
                {opt}
              </Text>

              {/* Radio checkmark badge */}
              <View style={styles.radioWrapper}>
                {isAnswered && isThisOptionCorrect ? (
                  <View style={styles.radioCorrect}>
                    <Ionicons name="checkmark" size={14} color="#0A0A0B" />
                  </View>
                ) : isAnswered && isThisOptionSelected && !isThisOptionCorrect ? (
                  <View style={styles.radioIncorrect}>
                    <Ionicons name="close" size={14} color="#FFFFFF" />
                  </View>
                ) : isThisOptionSelected ? (
                  <View style={styles.radioActive}>
                    <Ionicons name="checkmark" size={14} color="#0A0A0B" />
                  </View>
                ) : (
                  <View style={styles.radioInactive} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Answer Explanation & Feedback */}
      {isAnswered && (
        <View style={[styles.feedbackBox, isSelectedCorrect ? styles.feedbackCorrect : styles.feedbackIncorrect]}>
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

          {question.explanationHindi && (
            <Text style={styles.explanationText}>
              {question.explanationHindi}
            </Text>
          )}

          {/* Action Row */}
          <View style={styles.actionRow}>
            {question.formulaId && onViewFormula && (
              <TouchableOpacity
                style={styles.formulaBtn}
                onPress={() => onViewFormula(question.formulaId!)}
              >
                <Ionicons name="book-outline" size={14} color="#FFFFFF" />
                <Text style={styles.formulaBtnText}>Formula #{question.formulaId}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.nextBtn} onPress={onNextQuestion}>
              <Text style={styles.nextBtnText}>Next Question</Text>
              <Ionicons name="arrow-forward" size={16} color="#0A0A0B" />
            </TouchableOpacity>
          </View>
        </View>
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
