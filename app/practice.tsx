import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { generateDeterministicQuestions } from '../src/features/quiz/quizService';
import { ProgressRepository, UserProgress } from '../src/database/progressRepository';
import { QuizQuestion } from '../src/components/QuizQuestion';
import { BottomNavBar } from '../src/components/BottomNavBar';
import { QuizQuestion as QuizQuestionType } from '../src/types/ai';
import { getFormulaById } from '../src/search/formulaSearch';
import { colors, radii, shadows } from '../src/theme';

export default function PracticeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { formulaId: paramFormulaId, category: paramCategory } = useLocalSearchParams<{
    formulaId?: string;
    category?: string;
  }>();

  const [questions, setQuestions] = useState<QuizQuestionType[]>(() =>
    generateDeterministicQuestions({
      count: 10,
      formulaId: paramFormulaId ? parseInt(paramFormulaId, 10) : undefined,
      category: paramCategory,
      difficulty: 'beginner',
    })
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const scrollViewRef = useRef<any>(null);

  const startQuiz = (options: { formulaId?: number; category?: string; weakRevision?: boolean } = {}) => {
    let targetFormulaId = options.formulaId ?? (paramFormulaId ? parseInt(paramFormulaId, 10) : undefined);
    let targetCategory = options.category ?? paramCategory;

    if (options.weakRevision && progress) {
      const mistakeEntries = Object.entries(progress.categoryMistakes);
      if (mistakeEntries.length > 0) {
        mistakeEntries.sort((a, b) => b[1] - a[1]);
        targetCategory = mistakeEntries[0][0];
      }
    }

    const generated = generateDeterministicQuestions({
      count: 10,
      formulaId: targetFormulaId,
      category: targetCategory,
      difficulty: 'beginner',
    });

    setQuestions(generated);
    setCurrentIndex(0);
    setScore(0);
    setQuizFinished(false);
  };

  useEffect(() => {
    ProgressRepository.getProgress().then((p) => {
      setProgress(p);
    });
  }, [paramFormulaId, paramCategory]);

  const handleAnswerSelected = async (isCorrect: boolean) => {
    if (isCorrect) {
      setScore((prev) => prev + 1);
    }

    const currentQ = questions[currentIndex];
    const formula = getFormulaById(currentQ.formulaId);

    await ProgressRepository.recordQuizAnswer({
      formulaId: currentQ.formulaId,
      category: formula?.category,
      helpingVerbs: formula?.helpingVerbs,
      isCorrect,
    });
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 50);
    } else {
      setQuizFinished(true);
    }
  };

  if (questions.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.lime} />
        <Text style={styles.loadingText}>Crafting Adaptive Quiz Drills...</Text>
      </View>
    );
  }

  // Quiz Finished Summary View
  if (quizFinished) {
    const percentage = Math.round((score / questions.length) * 100);
    let message = 'Keep practicing! Reviewing the formulas will boost your confidence.';
    let iconName: any = 'ribbon-outline';
    let iconBg = 'rgba(255, 90, 138, 0.2)';

    if (percentage >= 80) {
      message = 'शाबाश! Excellent performance! You have a solid grasp of these sentence formulas.';
      iconName = 'trophy';
      iconBg = 'rgba(214, 255, 87, 0.2)';
    } else if (percentage >= 50) {
      message = 'अच्छा प्रयास! Good effort! Practice a little more to master the subtleties.';
      iconName = 'star-half';
      iconBg = 'rgba(139, 92, 246, 0.2)';
    }

    return (
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={[
            styles.summaryContent,
            { paddingTop: Math.max(insets.top + 16, 32), paddingBottom: 130 + insets.bottom },
          ]}
        >
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIconCircle, { backgroundColor: iconBg }]}>
              <Ionicons name={iconName} size={36} color={colors.lime} />
            </View>
            <Text style={styles.summaryTitle}>Quiz Completed!</Text>
            <Text style={styles.summaryScore}>
              {score} / {questions.length} Correct
            </Text>
            <View style={styles.percentageBadge}>
              <Text style={styles.percentageText}>{percentage}% Accuracy</Text>
            </View>
            <Text style={styles.summaryMessage}>{message}</Text>
          </View>

          <View style={styles.summaryActions}>
            <TouchableOpacity
              style={styles.actionBtnPrimary}
              onPress={() => startQuiz()}
              activeOpacity={0.85}
            >
              <Ionicons name="refresh" size={18} color="#0A0A0B" />
              <Text style={styles.actionBtnPrimaryText}>Take Another Quiz</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtnSecondary}
              onPress={() => startQuiz({ weakRevision: true })}
              activeOpacity={0.85}
            >
              <Ionicons name="fitness-outline" size={18} color="#FFFFFF" />
              <Text style={styles.actionBtnSecondaryText}>Revise Weak Topics</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtnTertiary}
              onPress={() => router.push('/progress')}
              activeOpacity={0.85}
            >
              <Ionicons name="stats-chart-outline" size={18} color="rgba(255, 255, 255, 0.55)" />
              <Text style={styles.actionBtnTertiaryText}>View Full Learning Stats</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        <BottomNavBar activeTab="practice" />
      </View>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top + 8, 20), paddingBottom: 130 + insets.bottom },
        ]}
      >
        {/* Quiz Progress Header */}
        <View style={styles.quizHeader}>
          <View style={styles.progressInfo}>
            <Text style={styles.questionNumText}>
              Question <Text style={styles.activeNumText}>{currentIndex + 1}</Text> of {questions.length}
            </Text>
            <View style={styles.scoreBadge}>
              <Ionicons name="diamond" size={12} color="#7C3AED" />
              <Text style={styles.scoreText}>Score: {score}</Text>
            </View>
          </View>

          {/* Progress Bar with Lime fill */}
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${((currentIndex + 1) / questions.length) * 100}%` },
              ]}
            />
          </View>
        </View>

        {/* Render Active Question */}
        <QuizQuestion
          key={currentQuestion.id || `quiz-q-${currentIndex}`}
          question={currentQuestion}
          onAnswerSelected={handleAnswerSelected}
          onNextQuestion={handleNextQuestion}
          onViewFormula={(id) => router.push(`/formulas/${id}`)}
          isDark={false}
        />
      </ScrollView>

      {/* Floating Dock */}
      <BottomNavBar activeTab="practice" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E5E5EB',
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#E5E5EB',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111114',
  },
  quizHeader: {
    marginBottom: 16,
  },
  progressInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  questionNumText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeNumText: {
    color: '#111114',
    fontWeight: '800',
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111114',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.lime,
  },
  summaryContent: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  summaryCard: {
    width: '100%',
    padding: 24,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 4,
  },
  summaryIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 255, 0, 0.3)',
  },
  summaryTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111114',
    marginBottom: 6,
  },
  summaryScore: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 12,
  },
  percentageBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.lime,
    marginBottom: 16,
    shadowColor: colors.lime,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 3,
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0A0A0A',
  },
  summaryMessage: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 20,
  },
  summaryActions: {
    width: '100%',
    gap: 12,
  },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.lime,
    shadowColor: colors.lime,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 4,
  },
  actionBtnPrimaryText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0A0A0A',
  },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1E1E24',
    borderWidth: 1,
    borderColor: '#1E1E24',
  },
  actionBtnSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionBtnTertiary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 23,
  },
  actionBtnTertiaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
});
