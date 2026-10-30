import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { generateDeterministicQuestions } from '../src/features/quiz/quizService';
import { ProgressRepository, UserProgress } from '../src/database/progressRepository';
import { MistakeRepository } from '../src/database/mistakeRepository';
import { GamificationRepository } from '../src/database/gamificationRepository';
import { QuizQuestion } from '../src/components/QuizQuestion';
import { OfflineStatusBanner } from '../src/components/OfflineStatusBanner';
import { BottomNavBar } from '../src/components/BottomNavBar';
import { QuizQuestion as QuizQuestionType, MistakeRecord, ExplanationMode } from '../src/types/ai';
import { getFormulaById } from '../src/search/formulaSearch';
import { colors, radii, shadows } from '../src/theme';

export default function PracticeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { formulaId: paramFormulaId, category: paramCategory } = useLocalSearchParams<{
    formulaId?: string;
    category?: string;
  }>();

  // Difficulty & Adaptive State
  const [currentDifficulty, setCurrentDifficulty] = useState<ExplanationMode>('beginner');
  const [adaptiveMode, setAdaptiveMode] = useState(true);
  const [streak, setStreak] = useState(0); // positive for correct streak, negative for wrong streak
  const [difficultyAlert, setDifficultyAlert] = useState<string | null>(null);

  // Quiz State
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
  const [isWeakRevisionMode, setIsWeakRevisionMode] = useState(false);

  // Mistakes Tracking
  const [sessionMistakes, setSessionMistakes] = useState<MistakeRecord[]>([]);
  const [savedMistakes, setSavedMistakes] = useState<MistakeRecord[]>([]);
  const [isMistakeBankVisible, setIsMistakeBankVisible] = useState(false);
  const [weakCategories, setWeakCategories] = useState<{ category: string; count: number }[]>([]);

  const scrollViewRef = useRef<any>(null);

  // Load progress and saved mistakes count on mount
  useEffect(() => {
    loadSavedMistakesAndProgress();
  }, [paramFormulaId, paramCategory]);

  const loadSavedMistakesAndProgress = async () => {
    try {
      const [prog, mistakes, categories] = await Promise.all([
        ProgressRepository.getProgress(),
        MistakeRepository.getMistakes(),
        MistakeRepository.getWeakCategories(5),
      ]);
      setProgress(prog);
      setSavedMistakes(mistakes);
      setWeakCategories(categories);
    } catch {
      // non-fatal
    }
  };

  const adaptUpcomingQuestions = (newDiff: ExplanationMode, fromIndex: number) => {
    setQuestions((prev) => {
      if (fromIndex >= prev.length) return prev;
      const remainingCount = prev.length - fromIndex;
      const newBatch = generateDeterministicQuestions({
        count: remainingCount,
        difficulty: newDiff,
        category: paramCategory,
      });
      return [...prev.slice(0, fromIndex), ...newBatch];
    });
  };

  const startQuiz = async (options: {
    formulaId?: number;
    category?: string;
    weakRevision?: boolean;
    difficulty?: ExplanationMode;
  } = {}) => {
    let targetFormulaId = options.formulaId ?? (paramFormulaId ? parseInt(paramFormulaId, 10) : undefined);
    let targetCategory = options.category ?? paramCategory;
    let targetDiff = options.difficulty ?? currentDifficulty;
    let weakIds: number[] = [];

    if (options.weakRevision) {
      weakIds = await MistakeRepository.getWeakFormulaIds(10);
      if (weakIds.length === 0 && progress) {
        const mistakeEntries = Object.entries(progress.categoryMistakes || {});
        if (mistakeEntries.length > 0) {
          mistakeEntries.sort((a, b) => b[1] - a[1]);
          targetCategory = mistakeEntries[0][0];
        }
      }
      setIsWeakRevisionMode(true);
    } else {
      setIsWeakRevisionMode(false);
    }

    const generated = generateDeterministicQuestions({
      count: 10,
      formulaId: targetFormulaId,
      category: targetCategory,
      difficulty: targetDiff,
      weakFormulaIds: weakIds.length > 0 ? weakIds : undefined,
    });

    setQuestions(generated);
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setSessionMistakes([]);
    setQuizFinished(false);
    setDifficultyAlert(null);
  };

  const handleAnswerSelected = async (isCorrect: boolean, selectedOption: string) => {
    if (isCorrect) {
      setScore((prev) => prev + 1);
    }

    const currentQ = questions[currentIndex];
    const formula = getFormulaById(currentQ.formulaId);

    // 1. Record in ProgressRepository
    await ProgressRepository.recordQuizAnswer({
      formulaId: currentQ.formulaId,
      category: formula?.category,
      helpingVerbs: formula?.helpingVerbs,
      isCorrect,
    });

    // 2. If incorrect, store in MistakeRepository & local session list
    if (!isCorrect) {
      const recorded = await MistakeRepository.recordMistake({
        questionId: currentQ.id,
        type: currentQ.type,
        prompt: currentQ.prompt,
        hindiSubtext: currentQ.hindiSubtext,
        selectedAnswer: selectedOption,
        correctAnswer: currentQ.correctAnswer,
        explanationHindi: currentQ.explanationHindi || '',
        formulaId: currentQ.formulaId,
        category: formula?.category || 'General',
        difficulty: currentQ.difficulty,
      });

      setSessionMistakes((prev) => [recorded, ...prev]);
      setSavedMistakes((prev) => [recorded, ...prev]);
    }

    // 3. Dynamic Adaptive Progression
    if (adaptiveMode && !isWeakRevisionMode) {
      if (isCorrect) {
        const newStreak = streak >= 0 ? streak + 1 : 1;
        setStreak(newStreak);

        // 3 consecutive correct -> upgrade difficulty
        if (newStreak >= 3 && currentDifficulty !== 'advanced') {
          const nextDiff: ExplanationMode = currentDifficulty === 'beginner' ? 'intermediate' : 'advanced';
          setCurrentDifficulty(nextDiff);
          setStreak(0);
          setDifficultyAlert(`⚡ Level Up! Adapted to ${nextDiff.toUpperCase()}`);
          adaptUpcomingQuestions(nextDiff, currentIndex + 1);
          setTimeout(() => setDifficultyAlert(null), 3500);
        }
      } else {
        const newStreak = streak <= 0 ? streak - 1 : -1;
        setStreak(newStreak);

        // 2 consecutive wrong -> downgrade difficulty
        if (newStreak <= -2 && currentDifficulty !== 'beginner') {
          const lowerDiff: ExplanationMode = currentDifficulty === 'advanced' ? 'intermediate' : 'beginner';
          setCurrentDifficulty(lowerDiff);
          setStreak(0);
          setDifficultyAlert(`🎯 Adjusting to ${lowerDiff.toUpperCase()} to build confidence`);
          adaptUpcomingQuestions(lowerDiff, currentIndex + 1);
          setTimeout(() => setDifficultyAlert(null), 3500);
        }
      }
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 50);
    } else {
      setQuizFinished(true);
      loadSavedMistakesAndProgress();

      // Award Gamification XP
      const isPerfect = score === questions.length;
      GamificationRepository.awardXp({
        activityType: isPerfect ? 'perfect_quiz' : 'quiz_completed',
        title: isPerfect ? `Perfect Quiz Score (${score}/${questions.length})!` : `Completed Quiz (${score}/${questions.length})`,
        isPerfectQuiz: isPerfect,
        xp: isPerfect ? 35 : 15,
        eventKey: `quiz_${Date.now()}`,
      });
    }
  };

  const handleRemoveMistake = async (id: string) => {
    await MistakeRepository.removeMistake(id);
    setSavedMistakes((prev) => prev.filter((m) => m.id !== id));
    const categories = await MistakeRepository.getWeakCategories(5);
    setWeakCategories(categories);
  };

  const handleClearAllMistakes = async () => {
    await MistakeRepository.clearAllMistakes();
    setSavedMistakes([]);
    setWeakCategories([]);
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
    let message = 'Keep practicing! Reviewing your mistakes below will boost your confidence.';
    let iconName: any = 'ribbon-outline';
    let iconBg = 'rgba(255, 90, 138, 0.2)';

    if (percentage >= 80) {
      message = 'शाबाश! Excellent performance! You have a solid grasp of these sentence formulas.';
      iconName = 'trophy';
      iconBg = 'rgba(214, 255, 87, 0.2)';
    } else if (percentage >= 50) {
      message = 'अच्छा प्रयास! Good effort! Practice the weak formulas below to master them.';
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
          {/* Main Score Card */}
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIconCircle, { backgroundColor: iconBg }]}>
              <Ionicons name={iconName} size={36} color={colors.lime} />
            </View>
            <Text style={styles.summaryTitle}>Quiz Completed!</Text>
            <Text style={styles.summaryScore}>
              {score} / {questions.length} Correct
            </Text>

            <View style={styles.badgeRow}>
              <View style={styles.percentageBadge}>
                <Text style={styles.percentageText}>{percentage}% Accuracy</Text>
              </View>
              <View style={styles.difficultyBadge}>
                <Ionicons name="sparkles" size={12} color="#D6FF57" />
                <Text style={styles.difficultyBadgeText}>{currentDifficulty.toUpperCase()}</Text>
              </View>
            </View>

            <Text style={styles.summaryMessage}>{message}</Text>
          </View>

          {/* Session Mistakes Breakdown */}
          {sessionMistakes.length > 0 && (
            <View style={styles.mistakesSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" />
                <Text style={styles.sectionTitle}>
                  Mistakes in this Quiz ({sessionMistakes.length})
                </Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                Review what went wrong and learn the correct rule:
              </Text>

              {sessionMistakes.map((m, idx) => (
                <View key={m.id || idx} style={styles.mistakeCard}>
                  <View style={styles.mistakeTopRow}>
                    <View style={styles.mistakeBadge}>
                      <Text style={styles.mistakeBadgeText}>
                        {m.type.replace(/-/g, ' ').toUpperCase()}
                      </Text>
                    </View>
                    {m.formulaId ? (
                      <TouchableOpacity
                        style={styles.mistakeFormulaTag}
                        onPress={() => router.push(`/formulas/${m.formulaId}`)}
                      >
                        <Text style={styles.mistakeFormulaTagText}>Formula #{m.formulaId}</Text>
                        <Ionicons name="chevron-forward" size={12} color="#D6FF57" />
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  <Text style={styles.mistakePrompt}>{m.prompt}</Text>
                  {m.hindiSubtext && (
                    <Text style={styles.mistakeHindiSubtext}>{m.hindiSubtext}</Text>
                  )}

                  <View style={styles.mistakeAnswerCompare}>
                    <View style={styles.compareItemWrong}>
                      <Ionicons name="close-circle" size={14} color="#EF4444" />
                      <Text style={styles.compareTextWrong}>
                        Your Answer: {m.selectedAnswer}
                      </Text>
                    </View>
                    <View style={styles.compareItemRight}>
                      <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                      <Text style={styles.compareTextRight}>
                        Correct: {m.correctAnswer}
                      </Text>
                    </View>
                  </View>

                  {m.explanationHindi && (
                    <View style={styles.mistakeExplanationBox}>
                      <Ionicons name="information-circle-outline" size={14} color="#D6FF57" />
                      <Text style={styles.mistakeExplanationText}>{m.explanationHindi}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Action Buttons */}
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
              <Text style={styles.actionBtnSecondaryText}>
                Practice Weak Formulas {savedMistakes.length > 0 ? `(${savedMistakes.length})` : ''}
              </Text>
            </TouchableOpacity>

            {savedMistakes.length > 0 && (
              <TouchableOpacity
                style={styles.actionBtnMistakeBank}
                onPress={() => setIsMistakeBankVisible(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="bookmarks-outline" size={18} color="#D6FF57" />
                <Text style={styles.actionBtnMistakeBankText}>
                  Open Mistake Bank ({savedMistakes.length} Saved)
                </Text>
              </TouchableOpacity>
            )}

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

        {/* Mistake Bank Modal */}
        {renderMistakeBankModal()}

        <BottomNavBar activeTab="practice" />
      </View>
    );
  }

  const currentQuestion = questions[currentIndex];

  function renderMistakeBankModal() {
    return (
      <Modal
        visible={isMistakeBankVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsMistakeBankVisible(false)}
      >
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Mistake Bank</Text>
              <Text style={styles.modalSubtitle}>
                {savedMistakes.length} questions to master
              </Text>
            </View>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setIsMistakeBankVisible(false)}
            >
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            {/* Weak Categories Breakdown */}
            {weakCategories.length > 0 && (
              <View style={styles.weakCatSection}>
                <Text style={styles.weakCatTitle}>Weak Grammar Topics:</Text>
                <View style={styles.catChipsRow}>
                  {weakCategories.map((c, i) => (
                    <View key={i} style={styles.catChip}>
                      <Text style={styles.catChipText}>{c.category}</Text>
                      <View style={styles.catChipBadge}>
                        <Text style={styles.catChipBadgeText}>{c.count}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* List of mistakes */}
            {savedMistakes.length === 0 ? (
              <View style={styles.emptyMistakes}>
                <Ionicons name="checkmark-done-circle" size={48} color={colors.lime} />
                <Text style={styles.emptyTitle}>All Caught Up!</Text>
                <Text style={styles.emptySubtitle}>
                  You have no pending mistakes. Practice more quizzes to challenge yourself!
                </Text>
              </View>
            ) : (
              savedMistakes.map((m) => (
                <View key={m.id} style={styles.bankMistakeCard}>
                  <View style={styles.bankCardHeader}>
                    <View style={styles.bankTypeBadge}>
                      <Text style={styles.bankTypeText}>
                        {m.type.replace(/-/g, ' ').toUpperCase()}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removeMistakeBtn}
                      onPress={() => handleRemoveMistake(m.id)}
                    >
                      <Ionicons name="trash-outline" size={14} color="#EF4444" />
                      <Text style={styles.removeMistakeBtnText}>Mastered</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.bankPrompt}>{m.prompt}</Text>
                  {m.hindiSubtext && (
                    <Text style={styles.bankHindi}>{m.hindiSubtext}</Text>
                  )}

                  <View style={styles.bankAnswersBox}>
                    <Text style={styles.bankWrongAns}>
                      ❌ Your Choice: <Text style={{ fontWeight: '700' }}>{m.selectedAnswer}</Text>
                    </Text>
                    <Text style={styles.bankRightAns}>
                      ✅ Correct: <Text style={{ fontWeight: '700' }}>{m.correctAnswer}</Text>
                    </Text>
                  </View>

                  {m.explanationHindi && (
                    <Text style={styles.bankExplanation}>
                      💡 {m.explanationHindi}
                    </Text>
                  )}

                  {m.formulaId ? (
                    <TouchableOpacity
                      style={styles.bankFormulaLink}
                      onPress={() => {
                        setIsMistakeBankVisible(false);
                        router.push(`/formulas/${m.formulaId}`);
                      }}
                    >
                      <Ionicons name="book-outline" size={14} color="#D6FF57" />
                      <Text style={styles.bankFormulaLinkText}>Study Formula #{m.formulaId}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))
            )}
          </ScrollView>

          {/* Modal Footer */}
          {savedMistakes.length > 0 && (
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalPracticeBtn}
                onPress={() => {
                  setIsMistakeBankVisible(false);
                  startQuiz({ weakRevision: true });
                }}
              >
                <Ionicons name="flash" size={18} color="#0A0A0B" />
                <Text style={styles.modalPracticeBtnText}>Practice All Weak Topics</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalClearBtn}
                onPress={handleClearAllMistakes}
              >
                <Text style={styles.modalClearBtnText}>Clear Bank</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top + 8, 20), paddingBottom: 130 + insets.bottom },
        ]}
      >
        {/* Adaptive Alert Banner if level changed */}
        {difficultyAlert && (
          <View style={styles.adaptiveBanner}>
            <Ionicons name="sparkles" size={16} color="#0A0A0B" />
            <Text style={styles.adaptiveBannerText}>{difficultyAlert}</Text>
          </View>
        )}

        {/* Offline Status Indicator */}
        <OfflineStatusBanner compact />

        {/* Quiz Progress Header */}
        <View style={styles.quizHeader}>
          <View style={styles.progressInfo}>
            <View style={styles.progressInfoLeft}>
              <Text style={styles.questionNumText}>
                Question <Text style={styles.activeNumText}>{currentIndex + 1}</Text> of {questions.length}
              </Text>
              {isWeakRevisionMode && (
                <View style={styles.weakRevisionPill}>
                  <Text style={styles.weakRevisionPillText}>WEAK TOPIC DRILL</Text>
                </View>
              )}
            </View>

            <View style={styles.headerRightStats}>
              {/* Difficulty Indicator */}
              <View style={styles.adaptiveDiffPill}>
                <Ionicons name="speedometer-outline" size={12} color="#D6FF57" />
                <Text style={styles.adaptiveDiffText}>
                  {currentDifficulty.toUpperCase()}
                </Text>
              </View>

              {/* Score Badge */}
              <View style={styles.scoreBadge}>
                <Ionicons name="diamond" size={12} color="#7C3AED" />
                <Text style={styles.scoreText}>Score: {score}</Text>
              </View>
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

        {/* Quick Link to Mistake Bank if user has saved mistakes */}
        {savedMistakes.length > 0 && !isWeakRevisionMode && (
          <TouchableOpacity
            style={styles.weakTopicShortcut}
            onPress={() => setIsMistakeBankVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.shortcutLeft}>
              <Ionicons name="alert-circle-outline" size={18} color="#EF4444" />
              <Text style={styles.shortcutText}>
                You have {savedMistakes.length} saved weak questions
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#6B7280" />
          </TouchableOpacity>
        )}
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
  adaptiveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.lime,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: colors.lime,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 3,
  },
  adaptiveBannerText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0A0A0B',
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
  progressInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  weakRevisionPill: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  weakRevisionPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  headerRightStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adaptiveDiffPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E1E24',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  adaptiveDiffText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D6FF57',
    letterSpacing: 0.5,
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
  weakTopicShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  shortcutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shortcutText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111114',
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
    marginBottom: 20,
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
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  percentageBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.lime,
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0A0A0A',
  },
  difficultyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1E1E24',
  },
  difficultyBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D6FF57',
  },
  summaryMessage: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 20,
  },
  mistakesSection: {
    width: '100%',
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111114',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  mistakeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  mistakeTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mistakeBadge: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  mistakeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
  },
  mistakeFormulaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E1E24',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mistakeFormulaTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D6FF57',
  },
  mistakePrompt: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111114',
    marginBottom: 4,
  },
  mistakeHindiSubtext: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  mistakeAnswerCompare: {
    gap: 4,
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 12,
    marginBottom: 8,
  },
  compareItemWrong: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compareTextWrong: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  compareItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compareTextRight: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '700',
  },
  mistakeExplanationBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#1E1E24',
    padding: 10,
    borderRadius: 12,
  },
  mistakeExplanationText: {
    fontSize: 12,
    color: '#FFFFFF',
    flex: 1,
    lineHeight: 18,
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
    color: '#0A0A0B',
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
  actionBtnMistakeBank: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  actionBtnMistakeBankText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D6FF57',
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
  // Mistake Bank Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#111114',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 24 : 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#A1A1AA',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  weakCatSection: {
    marginBottom: 20,
  },
  weakCatTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#A1A1AA',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  catChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E1E24',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2E2E38',
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  catChipBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  catChipBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emptyMistakes: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#A1A1AA',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
  bankMistakeCard: {
    backgroundColor: '#1E1E24',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#2E2E38',
  },
  bankCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  bankTypeBadge: {
    backgroundColor: '#27272A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bankTypeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D6FF57',
  },
  removeMistakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  removeMistakeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
  },
  bankPrompt: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  bankHindi: {
    fontSize: 12,
    color: '#A1A1AA',
    marginBottom: 10,
  },
  bankAnswersBox: {
    backgroundColor: '#141416',
    padding: 10,
    borderRadius: 12,
    gap: 4,
    marginBottom: 10,
  },
  bankWrongAns: {
    fontSize: 12,
    color: '#F87171',
  },
  bankRightAns: {
    fontSize: 12,
    color: '#4ADE80',
  },
  bankExplanation: {
    fontSize: 12,
    color: '#D1D5DB',
    lineHeight: 18,
    marginBottom: 10,
  },
  bankFormulaLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#27272A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  bankFormulaLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D6FF57',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#27272A',
    backgroundColor: '#111114',
    gap: 10,
  },
  modalPracticeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.lime,
  },
  modalPracticeBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0A0A0B',
  },
  modalClearBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  modalClearBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#71717A',
  },
});
