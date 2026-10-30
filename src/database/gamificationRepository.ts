import { Storage } from './storage';
import {
  GamificationProfile,
  RewardRecord,
  AwardXpOptions,
  AchievementItem,
  ACHIEVEMENTS_CATALOG,
  LEVEL_TIERS,
  GAMIFICATION_CONFIG,
} from '../types/gamification';

const GAMIFICATION_KEY = '@fluent_gamification';

export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getYesterdayDateString(d: Date = new Date()): string {
  const prev = new Date(d);
  prev.setDate(prev.getDate() - 1);
  return getLocalDateString(prev);
}

export function calculateLevelStats(totalXp: number) {
  let tier = LEVEL_TIERS[0];
  for (let i = LEVEL_TIERS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVEL_TIERS[i].minXp) {
      tier = LEVEL_TIERS[i];
      break;
    }
  }

  const currentLevelXp = Math.max(0, totalXp - tier.minXp);
  const nextLevelXp = Math.max(1, tier.maxXp - tier.minXp);

  return {
    level: tier.level,
    levelTitle: tier.title,
    currentLevelXp,
    nextLevelXp,
  };
}

const defaultProfile: GamificationProfile = {
  totalXp: 0,
  level: 1,
  levelTitle: 'Novice Explorer',
  currentLevelXp: 0,
  nextLevelXp: 100,
  currentStreak: 1,
  longestStreak: 1,
  lastActiveDate: getLocalDateString(),
  activeDays: [getLocalDateString()],
  formulasLearned: 0,
  quizzesCompleted: 0,
  perfectQuizzes: 0,
  speakingSessionsCompleted: 0,
  categoriesExplored: [],
  unlockedAchievements: {},
  dailyGoalCompletedDates: [],
  rewardHistory: [],
};

type AchievementUnlockListener = (achievement: AchievementItem) => void;
const unlockListeners: Set<AchievementUnlockListener> = new Set();

export const GamificationRepository = {
  subscribeUnlock(listener: AchievementUnlockListener): () => void {
    unlockListeners.add(listener);
    return () => unlockListeners.delete(listener);
  },

  notifyUnlock(achievement: AchievementItem) {
    unlockListeners.forEach((l) => {
      try {
        l(achievement);
      } catch {
        // non-fatal
      }
    });
  },

  async getProfile(): Promise<GamificationProfile> {
    try {
      const data = await Storage.getItem(GAMIFICATION_KEY);
      if (!data) {
        return { ...defaultProfile };
      }
      const parsed = JSON.parse(data);
      const profile: GamificationProfile = { ...defaultProfile, ...parsed };

      // Recalculate level stats from totalXp
      const levelStats = calculateLevelStats(profile.totalXp);
      profile.level = levelStats.level;
      profile.levelTitle = levelStats.levelTitle;
      profile.currentLevelXp = levelStats.currentLevelXp;
      profile.nextLevelXp = levelStats.nextLevelXp;

      return profile;
    } catch {
      return { ...defaultProfile };
    }
  },

  async saveProfile(profile: GamificationProfile): Promise<GamificationProfile> {
    const levelStats = calculateLevelStats(profile.totalXp);
    profile.level = levelStats.level;
    profile.levelTitle = levelStats.levelTitle;
    profile.currentLevelXp = levelStats.currentLevelXp;
    profile.nextLevelXp = levelStats.nextLevelXp;

    await Storage.setItem(GAMIFICATION_KEY, JSON.stringify(profile));
    return profile;
  },

  async updateDailyStreak(): Promise<GamificationProfile> {
    const profile = await this.getProfile();
    const today = getLocalDateString();
    const yesterday = getYesterdayDateString();

    if (profile.lastActiveDate === today) {
      // Already active today; streak maintained
      if (!profile.activeDays.includes(today)) {
        profile.activeDays.push(today);
      }
    } else if (profile.lastActiveDate === yesterday) {
      // Continued streak!
      profile.currentStreak += 1;
      if (profile.currentStreak > profile.longestStreak) {
        profile.longestStreak = profile.currentStreak;
      }
      profile.lastActiveDate = today;
      if (!profile.activeDays.includes(today)) {
        profile.activeDays.push(today);
      }
    } else {
      // Missed at least one day or first day
      profile.currentStreak = 1;
      if (profile.currentStreak > profile.longestStreak) {
        profile.longestStreak = profile.currentStreak;
      }
      profile.lastActiveDate = today;
      if (!profile.activeDays.includes(today)) {
        profile.activeDays.push(today);
      }
    }

    return await this.saveProfile(profile);
  },

  async awardXp(options: AwardXpOptions): Promise<{
    profile: GamificationProfile;
    reward: RewardRecord | null;
    newlyUnlocked: AchievementItem[];
  }> {
    const profile = await this.updateDailyStreak();

    // 1. Prevent duplicate rewards for identical event keys
    if (options.eventKey) {
      const alreadyAwarded = profile.rewardHistory.some(
        (r) => r.eventKey === options.eventKey
      );
      if (alreadyAwarded) {
        return { profile, reward: null, newlyUnlocked: [] };
      }
    }

    // 2. Determine XP amount
    const defaultXp = GAMIFICATION_CONFIG.XP_REWARDS[options.activityType as keyof typeof GAMIFICATION_CONFIG.XP_REWARDS] || 10;
    const amount = options.xp !== undefined ? options.xp : defaultXp;

    // 3. Update stats counters based on activity type
    if (options.activityType === 'formula_lesson') {
      profile.formulasLearned += 1;
      if (options.category && !profile.categoriesExplored.includes(options.category)) {
        profile.categoriesExplored.push(options.category);
      }
    } else if (options.activityType === 'quiz_completed') {
      profile.quizzesCompleted += 1;
      if (options.isPerfectQuiz) {
        profile.perfectQuizzes += 1;
      }
    } else if (options.activityType === 'speaking_session') {
      profile.speakingSessionsCompleted += 1;
    } else if (options.activityType === 'daily_goal') {
      const today = getLocalDateString();
      if (!profile.dailyGoalCompletedDates.includes(today)) {
        profile.dailyGoalCompletedDates.push(today);
      }
    }

    // 4. Record the reward
    profile.totalXp += amount;
    const rewardRecord: RewardRecord = {
      id: `rew_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      activityType: options.activityType,
      title: options.title,
      xp: amount,
      timestamp: Date.now(),
      eventKey: options.eventKey,
    };

    profile.rewardHistory = [rewardRecord, ...profile.rewardHistory].slice(
      0,
      GAMIFICATION_CONFIG.MAX_REWARD_HISTORY
    );

    // 5. Evaluate Achievements
    const newlyUnlocked = await this.checkAndUnlockAchievements(profile);

    // Save profile with updated XP and stats
    const updated = await this.saveProfile(profile);

    // Notify listeners for each unlocked achievement
    newlyUnlocked.forEach((ach) => this.notifyUnlock(ach));

    return { profile: updated, reward: rewardRecord, newlyUnlocked };
  },

  async checkAndUnlockAchievements(profile: GamificationProfile): Promise<AchievementItem[]> {
    const newlyUnlocked: AchievementItem[] = [];

    for (const def of ACHIEVEMENTS_CATALOG) {
      // If already unlocked, skip
      if (profile.unlockedAchievements[def.id]) {
        continue;
      }

      let isCompleted = false;
      let currentVal = 0;

      switch (def.id) {
        case 'first_lesson':
          currentVal = profile.formulasLearned;
          isCompleted = currentVal >= 1;
          break;
        case 'first_100_xp':
          currentVal = profile.totalXp;
          isCompleted = currentVal >= 100;
          break;
        case 'streak_3_days':
          currentVal = Math.max(profile.currentStreak, profile.longestStreak);
          isCompleted = currentVal >= 3;
          break;
        case 'streak_7_days':
          currentVal = Math.max(profile.currentStreak, profile.longestStreak);
          isCompleted = currentVal >= 7;
          break;
        case 'grammar_master':
          currentVal = profile.formulasLearned;
          isCompleted = currentVal >= 25;
          break;
        case 'speaking_starter':
          currentVal = profile.speakingSessionsCompleted;
          isCompleted = currentVal >= 1;
          break;
        case 'quiz_champion':
          currentVal = profile.quizzesCompleted;
          isCompleted = currentVal >= 10;
          break;
        case 'formula_explorer':
          currentVal = profile.categoriesExplored.length;
          isCompleted = currentVal >= 5;
          break;
        case 'perfect_quiz':
          currentVal = profile.perfectQuizzes;
          isCompleted = currentVal >= 1;
          break;
      }

      if (isCompleted) {
        const unlockTime = Date.now();
        profile.unlockedAchievements[def.id] = unlockTime;

        // Award achievement XP reward
        profile.totalXp += def.xpReward;
        profile.rewardHistory.unshift({
          id: `ach_rew_${def.id}_${unlockTime}`,
          activityType: 'achievement_unlock',
          title: `Achievement: ${def.title}`,
          xp: def.xpReward,
          timestamp: unlockTime,
          eventKey: `ach_${def.id}`,
        });

        const item: AchievementItem = {
          ...def,
          unlocked: true,
          unlockedAt: unlockTime,
          current: currentVal,
        };
        newlyUnlocked.push(item);
      }
    }

    return newlyUnlocked;
  },

  async getAchievements(): Promise<AchievementItem[]> {
    const profile = await this.getProfile();

    return ACHIEVEMENTS_CATALOG.map((def) => {
      const unlockedAt = profile.unlockedAchievements[def.id];
      let current = 0;

      switch (def.id) {
        case 'first_lesson':
          current = profile.formulasLearned;
          break;
        case 'first_100_xp':
          current = profile.totalXp;
          break;
        case 'streak_3_days':
        case 'streak_7_days':
          current = Math.max(profile.currentStreak, profile.longestStreak);
          break;
        case 'grammar_master':
          current = profile.formulasLearned;
          break;
        case 'speaking_starter':
          current = profile.speakingSessionsCompleted;
          break;
        case 'quiz_champion':
          current = profile.quizzesCompleted;
          break;
        case 'formula_explorer':
          current = profile.categoriesExplored.length;
          break;
        case 'perfect_quiz':
          current = profile.perfectQuizzes;
          break;
      }

      return {
        ...def,
        unlocked: !!unlockedAt,
        unlockedAt,
        current: Math.min(current, def.target),
      };
    });
  },

  async reset(): Promise<void> {
    await Storage.removeItem(GAMIFICATION_KEY);
  },
};

