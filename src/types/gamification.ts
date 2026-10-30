export type RewardActivityType =
  | 'formula_lesson'
  | 'quiz_completed'
  | 'speaking_session'
  | 'daily_goal'
  | 'perfect_quiz'
  | 'streak_reward'
  | 'achievement_unlock';

export interface LevelTier {
  level: number;
  title: string;
  minXp: number;
  maxXp: number;
}

export const LEVEL_TIERS: LevelTier[] = [
  { level: 1, title: 'Novice Explorer', minXp: 0, maxXp: 100 },
  { level: 2, title: 'Spoken Learner', minXp: 100, maxXp: 250 },
  { level: 3, title: 'Sentence Builder', minXp: 250, maxXp: 500 },
  { level: 4, title: 'Fluent Communicator', minXp: 500, maxXp: 900 },
  { level: 5, title: 'Grammar Master', minXp: 900, maxXp: 1500 },
  { level: 6, title: 'Conversation Pro', minXp: 1500, maxXp: 2300 },
  { level: 7, title: 'Fluent Champion', minXp: 2300, maxXp: 3300 },
  { level: 8, title: 'Language Wizard', minXp: 3300, maxXp: 4500 },
  { level: 9, title: 'Master Speaker', minXp: 4500, maxXp: 6000 },
  { level: 10, title: 'English Maestro', minXp: 6000, maxXp: 10000 },
];

export interface RewardRecord {
  id: string;
  activityType: RewardActivityType;
  title: string;
  xp: number;
  timestamp: number;
  eventKey?: string;
}

export interface AchievementDefinition {
  id: string;
  title: string;
  hindiTitle: string;
  description: string;
  icon: string;
  color: string;
  xpReward: number;
  target: number;
}

export const ACHIEVEMENTS_CATALOG: AchievementDefinition[] = [
  {
    id: 'first_lesson',
    title: 'First Lesson',
    hindiTitle: 'पहली सीख',
    description: 'Complete your first English formula lesson',
    icon: 'book',
    color: '#10B981',
    xpReward: 25,
    target: 1,
  },
  {
    id: 'first_100_xp',
    title: 'First 100 XP',
    hindiTitle: 'पहला शतक',
    description: 'Reach 100 Experience Points in Fluent',
    icon: 'diamond',
    color: '#8B5CF6',
    xpReward: 30,
    target: 100,
  },
  {
    id: 'streak_3_days',
    title: '3-Day Streak',
    hindiTitle: '3 दिन की लगन',
    description: 'Maintain a learning streak for 3 consecutive days',
    icon: 'flame',
    color: '#F97316',
    xpReward: 35,
    target: 3,
  },
  {
    id: 'streak_7_days',
    title: '7-Day Streak',
    hindiTitle: 'साप्ताहिक लीजेंड',
    description: 'Maintain a learning streak for 7 consecutive days',
    icon: 'trophy',
    color: '#EAB308',
    xpReward: 75,
    target: 7,
  },
  {
    id: 'grammar_master',
    title: 'Grammar Master',
    hindiTitle: 'व्याकरण उस्ताद',
    description: 'Study and master 25 sentence formulas',
    icon: 'school',
    color: '#3B82F6',
    xpReward: 50,
    target: 25,
  },
  {
    id: 'speaking_starter',
    title: 'Speaking Starter',
    hindiTitle: 'बोलने की शुरुआत',
    description: 'Complete an AI Voice Speaking session',
    icon: 'mic',
    color: '#EC4899',
    xpReward: 30,
    target: 1,
  },
  {
    id: 'quiz_champion',
    title: 'Quiz Champion',
    hindiTitle: 'क्विज़ चैंपियन',
    description: 'Complete 10 adaptive practice quizzes',
    icon: 'ribbon',
    color: '#6366F1',
    xpReward: 60,
    target: 10,
  },
  {
    id: 'formula_explorer',
    title: 'Formula Explorer',
    hindiTitle: 'फॉर्मूला खोजी',
    description: 'Explore formulas across 5 different categories',
    icon: 'compass',
    color: '#14B8A6',
    xpReward: 40,
    target: 5,
  },
  {
    id: 'perfect_quiz',
    title: 'Perfect Quiz',
    hindiTitle: 'शत प्रतिशत',
    description: 'Score 100% accuracy on any practice quiz',
    icon: 'sparkles',
    color: '#D6FF57',
    xpReward: 50,
    target: 1,
  },
];

export interface AchievementItem extends AchievementDefinition {
  unlocked: boolean;
  unlockedAt?: number;
  current: number;
}

export interface GamificationProfile {
  totalXp: number;
  level: number;
  levelTitle: string;
  currentLevelXp: number;
  nextLevelXp: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string; // YYYY-MM-DD
  activeDays: string[]; // Set of YYYY-MM-DD
  formulasLearned: number;
  quizzesCompleted: number;
  perfectQuizzes: number;
  speakingSessionsCompleted: number;
  categoriesExplored: string[];
  unlockedAchievements: Record<string, number>; // achievementId -> timestamp
  dailyGoalCompletedDates: string[];
  rewardHistory: RewardRecord[];
}

export interface AwardXpOptions {
  activityType: RewardActivityType;
  title: string;
  xp?: number;
  eventKey?: string;
  formulaId?: number;
  category?: string;
  isPerfectQuiz?: boolean;
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  avatar?: string;
  xp: number;
  level: number;
  levelTitle: string;
  streak: number;
  rank: number;
  isCurrentUser?: boolean;
}

export interface LeaderboardResponse {
  period: 'weekly' | 'monthly' | 'all-time';
  rankings: LeaderboardEntry[];
  userRanking?: LeaderboardEntry;
  updatedAt: string;
  offline?: boolean;
}

export const GAMIFICATION_CONFIG = {
  XP_REWARDS: {
    formula_lesson: 10,
    quiz_completed: 15,
    speaking_session: 20,
    daily_goal: 25,
    perfect_quiz: 20,
    streak_reward: 30,
  },
  MAX_REWARD_HISTORY: 50,
};

