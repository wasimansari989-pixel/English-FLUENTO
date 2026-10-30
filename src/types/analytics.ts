export interface WeeklyActivityPoint {
  day: string;
  dateStr: string;
  xp: number;
  isActive: boolean;
  isToday: boolean;
  barPercent: number; // 0 - 100%
}

export interface MonthlyWeekPoint {
  weekLabel: string;
  activityCount: number;
  xp: number;
  barPercent: number;
}

export interface CategoryAccuracyStat {
  category: string;
  totalAnswered: number;
  mistakes: number;
  accuracy: number;
  color: string;
}

export interface WeakGrammarTopic {
  topic: string;
  mistakeCount: number;
  status: 'critical' | 'developing' | 'mastered';
  suggestedFormulaId?: number;
  suggestedFormulaTitle?: string;
}

export interface LearningRecommendation {
  id: string;
  type: 'formula_review' | 'quiz_practice' | 'speaking_exercise';
  title: string;
  hindiTitle: string;
  reason: string;
  actionRoute: string;
  actionText: string;
  formulaId?: number;
}

export interface LearningAnalyticsData {
  totalFormulasCompleted: number;
  totalFormulasTarget: number;
  formulaCompletionPercent: number;
  quizzesCompleted: number;
  totalQuestionsAnswered: number;
  correctAnswers: number;
  overallQuizAccuracy: number;
  learningSessionsCount: number;
  currentStreak: number;
  longestStreak: number;
  totalXp: number;
  estimatedStudyTimeMinutes: number;
  speakingSessionsCount: number;
  weeklyActivity: WeeklyActivityPoint[];
  monthlyWeeks: MonthlyWeekPoint[];
  categoryAccuracies: CategoryAccuracyStat[];
  weakTopics: WeakGrammarTopic[];
  recommendations: LearningRecommendation[];
  hasHistory: boolean;
}

