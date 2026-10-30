import { ProgressRepository } from '../database/progressRepository';
import { GamificationRepository, getLocalDateString } from '../database/gamificationRepository';
import { MistakeRepository } from '../database/mistakeRepository';
import { UserProfileRepository } from '../database/userProfileRepository';
import { getAllFormulas, getFormulaById } from '../search/formulaSearch';
import {
  LearningAnalyticsData,
  WeeklyActivityPoint,
  MonthlyWeekPoint,
  CategoryAccuracyStat,
  WeakGrammarTopic,
  LearningRecommendation,
} from '../types/analytics';

const CATEGORY_COLORS: Record<string, string> = {
  'Am / Is / Are': '#10B981',
  'Can / Could': '#8B5CF6',
  'Common Expressions': '#3B82F6',
  'Conditional Sentences': '#F59E0B',
  'Daily Spoken English': '#EC4899',
  'Do / Does / Did': '#06B6D4',
  'Has / Have / Had': '#6366F1',
  'Modal Verbs': '#F97316',
  'Tenses': '#14B8A6',
};

export const AnalyticsService = {
  async getAnalyticsData(): Promise<LearningAnalyticsData> {
    const [progress, gamification, mistakes, profile] = await Promise.all([
      ProgressRepository.getProgress(),
      GamificationRepository.getProfile(),
      MistakeRepository.getMistakes(),
      UserProfileRepository.getProfile(),
    ]);

    const allFormulas = getAllFormulas();
    const totalFormulasTarget = 600;

    const totalFormulasCompleted = Math.max(
      progress.practicedFormulaIds.length,
      gamification.formulasLearned
    );
    const formulaCompletionPercent = Math.min(
      100,
      Math.round((totalFormulasCompleted / totalFormulasTarget) * 100)
    );

    const quizzesCompleted = Math.max(progress.totalQuizzes, gamification.quizzesCompleted);
    const totalQuestionsAnswered = progress.totalQuestions;
    const correctAnswers = progress.correctAnswers;
    const overallQuizAccuracy =
      totalQuestionsAnswered > 0
        ? Math.round((correctAnswers / totalQuestionsAnswered) * 100)
        : 0;

    const currentStreak = gamification.currentStreak || progress.streakDays || 1;
    const longestStreak = Math.max(gamification.longestStreak || 1, currentStreak);
    const totalXp = gamification.totalXp || 0;
    const speakingSessionsCount = gamification.speakingSessionsCompleted || 0;

    // Estimate genuine study time
    // 2.5 min per formula, 3 min per quiz, 4 min per speaking session
    const estimatedStudyTimeMinutes =
      totalFormulasCompleted * 2 +
      quizzesCompleted * 3 +
      speakingSessionsCount * 4;

    const hasHistory = totalFormulasCompleted > 0 || totalQuestionsAnswered > 0 || totalXp > 0;

    // 1. Weekly Activity Calculation (Monday - Sunday)
    const weeklyActivity = this.computeWeeklyActivity(gamification);

    // 2. Monthly 4-Week Activity Calculation
    const monthlyWeeks = this.computeMonthlyWeeks(gamification);

    // 3. Category Accuracies & Weak Grammar Analysis
    const { categoryAccuracies, weakTopics } = this.computeWeakTopicsAndAccuracies(
      progress,
      mistakes,
      allFormulas
    );

    // 4. Personalized Recommendations based on actual performance
    const recommendations = this.generateRecommendations(
      weakTopics,
      categoryAccuracies,
      totalFormulasCompleted,
      quizzesCompleted,
      overallQuizAccuracy,
      hasHistory
    );

    return {
      totalFormulasCompleted,
      totalFormulasTarget,
      formulaCompletionPercent,
      quizzesCompleted,
      totalQuestionsAnswered,
      correctAnswers,
      overallQuizAccuracy,
      learningSessionsCount: Math.max(gamification.activeDays.length, 1),
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
    };
  },

  computeWeeklyActivity(gamification: any): WeeklyActivityPoint[] {
    const today = new Date();
    const currentDay = today.getDay(); // 0 is Sun
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);

    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const activeSet = new Set(gamification.activeDays || []);
    const todayStr = getLocalDateString(today);

    // Map rewards by local date
    const xpByDate: Record<string, number> = {};
    (gamification.rewardHistory || []).forEach((r: any) => {
      const dStr = getLocalDateString(new Date(r.timestamp));
      xpByDate[dStr] = (xpByDate[dStr] || 0) + (r.xp || 0);
    });

    const result: WeeklyActivityPoint[] = [];
    let maxXpInWeek = 50;

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = getLocalDateString(d);
      const xp = xpByDate[dateStr] || (activeSet.has(dateStr) ? 20 : 0);
      if (xp > maxXpInWeek) maxXpInWeek = xp;

      result.push({
        day: dayLabels[i],
        dateStr,
        xp,
        isActive: activeSet.has(dateStr) || xp > 0,
        isToday: dateStr === todayStr,
        barPercent: 0, // will compute below
      });
    }

    return result.map((pt) => ({
      ...pt,
      barPercent: pt.xp > 0 ? Math.min(100, Math.max(15, Math.round((pt.xp / maxXpInWeek) * 100))) : (pt.isActive ? 25 : 8),
    }));
  },

  computeMonthlyWeeks(gamification: any): MonthlyWeekPoint[] {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const weeks: MonthlyWeekPoint[] = [
      { weekLabel: 'Week 1', activityCount: 0, xp: 0, barPercent: 10 },
      { weekLabel: 'Week 2', activityCount: 0, xp: 0, barPercent: 10 },
      { weekLabel: 'Week 3', activityCount: 0, xp: 0, barPercent: 10 },
      { weekLabel: 'Week 4', activityCount: 0, xp: 0, barPercent: 10 },
    ];

    (gamification.rewardHistory || []).forEach((r: any) => {
      const rDate = new Date(r.timestamp);
      if (rDate.getMonth() === currentMonth && rDate.getFullYear() === currentYear) {
        const day = rDate.getDate();
        const weekIdx = Math.min(3, Math.floor((day - 1) / 7));
        weeks[weekIdx].activityCount += 1;
        weeks[weekIdx].xp += r.xp || 0;
      }
    });

    const maxWeekXp = Math.max(50, ...weeks.map((w) => w.xp));
    return weeks.map((w) => ({
      ...w,
      barPercent: w.xp > 0 ? Math.min(100, Math.max(15, Math.round((w.xp / maxWeekXp) * 100))) : 10,
    }));
  },

  computeWeakTopicsAndAccuracies(
    progress: any,
    mistakes: any[],
    allFormulas: any[]
  ): { categoryAccuracies: CategoryAccuracyStat[]; weakTopics: WeakGrammarTopic[] } {
    const mistakeCountsByCat: Record<string, number> = {};

    // 1. From MistakeRepository
    mistakes.forEach((m) => {
      const cat = m.category || 'General';
      mistakeCountsByCat[cat] = (mistakeCountsByCat[cat] || 0) + 1;
    });

    // 2. From ProgressRepository categoryMistakes
    Object.entries(progress.categoryMistakes || {}).forEach(([cat, count]) => {
      mistakeCountsByCat[cat] = Math.max(mistakeCountsByCat[cat] || 0, count as number);
    });

    // Build Category Accuracy Stats
    const topCategories = ['Am / Is / Are', 'Can / Could', 'Conditional Sentences', 'Has / Have / Had', 'Daily Spoken English'];
    const categoryAccuracies: CategoryAccuracyStat[] = topCategories.map((catName) => {
      const catMistakes = mistakeCountsByCat[catName] || 0;
      const estimatedAnswered = Math.max(catMistakes + 2, 5);
      const acc = Math.max(10, Math.min(100, Math.round(((estimatedAnswered - catMistakes) / estimatedAnswered) * 100)));

      return {
        category: catName,
        totalAnswered: estimatedAnswered,
        mistakes: catMistakes,
        accuracy: acc,
        color: CATEGORY_COLORS[catName] || '#8B5CF6',
      };
    });

    // Build Weak Topics list sorted by mistake frequency
    const weakEntries = Object.entries(mistakeCountsByCat).sort((a, b) => b[1] - a[1]);
    const weakTopics: WeakGrammarTopic[] = weakEntries.map(([topic, count]) => {
      const matchedFormula = allFormulas.find(
        (f) => f.category === topic || (f.categories && f.categories.includes(topic))
      );

      return {
        topic,
        mistakeCount: count,
        status: count >= 3 ? 'critical' : count >= 1 ? 'developing' : 'mastered',
        suggestedFormulaId: matchedFormula?.id || 1,
        suggestedFormulaTitle: matchedFormula?.englishFormula || 'Subject + Helping Verb + Object',
      };
    });

    // If no mistakes recorded yet, add positive default guidance
    if (weakTopics.length === 0) {
      weakTopics.push({
        topic: 'Foundational Sentence Formation',
        mistakeCount: 0,
        status: 'mastered',
        suggestedFormulaId: 1,
        suggestedFormulaTitle: 'Subject + am/is/are + Object',
      });
    }

    return { categoryAccuracies, weakTopics };
  },

  generateRecommendations(
    weakTopics: WeakGrammarTopic[],
    categories: CategoryAccuracyStat[],
    formulasCount: number,
    quizzesCount: number,
    accuracy: number,
    hasHistory: boolean
  ): LearningRecommendation[] {
    const list: LearningRecommendation[] = [];

    // Empty state / New learner
    if (!hasHistory) {
      list.push({
        id: 'rec_start_f1',
        type: 'formula_review',
        title: 'Master Sentence Building Foundation',
        hindiTitle: 'शुरुआती फॉर्मूला सीखें',
        reason: 'Start with Formula #1 (Subject + am/is/are) to build a solid spoken grammar base.',
        actionRoute: '/formulas/1',
        actionText: 'Study Formula #1',
        formulaId: 1,
      });
      list.push({
        id: 'rec_start_quiz',
        type: 'quiz_practice',
        title: 'Take Your First Placement Drill',
        hindiTitle: 'पहला अभ्यास क्विज़ लें',
        reason: 'Testing your understanding with 10 questions will generate your personalized weak-topic map.',
        actionRoute: '/practice',
        actionText: 'Start Beginner Quiz (+15 XP)',
      });
      return list;
    }

    // Critical weak topic recommendation
    const critical = weakTopics.find((t) => t.status === 'critical' || t.mistakeCount >= 2);
    if (critical) {
      const fId = critical.suggestedFormulaId || 1;
      list.push({
        id: `rec_weak_${fId}`,
        type: 'formula_review',
        title: `Strengthen ${critical.topic}`,
        hindiTitle: `${critical.topic} को मजबूत करें`,
        reason: `You have encountered ${critical.mistakeCount} mistakes in "${critical.topic}". Reviewing Formula #${fId} will clarify the exact sentence structure.`,
        actionRoute: `/formulas/${fId}`,
        actionText: `Review Formula #${fId}`,
        formulaId: fId,
      });

      list.push({
        id: `rec_quiz_weak`,
        type: 'quiz_practice',
        title: `Targeted Drill: ${critical.topic}`,
        hindiTitle: 'कमजोर विषयों का अभ्यास',
        reason: `Practice 10 adaptive questions focusing directly on your missed topics in ${critical.topic}.`,
        actionRoute: `/practice?category=${encodeURIComponent(critical.topic)}`,
        actionText: 'Start Targeted Practice',
      });
    } else {
      // User is doing well!
      list.push({
        id: 'rec_explore_more',
        type: 'formula_review',
        title: 'Explore Advanced Spoken Idioms',
        hindiTitle: 'नए फॉर्मूले सीखें',
        reason: `Great accuracy (${accuracy}%)! You have mastered your current set. Learn new conditional and passive formulas to level up.`,
        actionRoute: '/formulas',
        actionText: 'Explore Formula Catalog',
      });
    }

    // Speaking recommendation
    list.push({
      id: 'rec_speaking',
      type: 'speaking_exercise',
      title: 'Practice Natural Pronunciation',
      hindiTitle: 'लाइव बोलकर अभ्यास करें',
      reason: 'Speaking sentences aloud reinforces grammar retention 3x faster than reading alone.',
      actionRoute: '/talk-to-ai',
      actionText: 'Launch Live Speaking (+20 XP)',
    });

    return list;
  },
};

