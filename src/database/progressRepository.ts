import { Storage } from './storage';

const PROGRESS_KEY = '@english_formula_progress';
const RECENT_KEY = '@english_formula_recent';

export interface UserProgress {
  totalQuizzes: number;
  totalQuestions: number;
  correctAnswers: number;
  practicedFormulaIds: number[];
  categoryMistakes: Record<string, number>;
  helpingVerbMistakes: Record<string, number>;
  streakDays: number;
  lastActiveDate: string;
}

const defaultProgress: UserProgress = {
  totalQuizzes: 0,
  totalQuestions: 0,
  correctAnswers: 0,
  practicedFormulaIds: [],
  categoryMistakes: {},
  helpingVerbMistakes: {},
  streakDays: 1,
  lastActiveDate: new Date().toISOString().slice(0, 10),
};

export const ProgressRepository = {
  async getProgress(): Promise<UserProgress> {
    try {
      const data = await Storage.getItem(PROGRESS_KEY);
      if (!data) return defaultProgress;
      return { ...defaultProgress, ...JSON.parse(data) };
    } catch {
      return defaultProgress;
    }
  },

  async recordQuizAnswer(options: {
    formulaId: number;
    category?: string;
    helpingVerbs?: string[];
    isCorrect: boolean;
  }): Promise<UserProgress> {
    const progress = await this.getProgress();
    progress.totalQuestions++;
    if (options.isCorrect) {
      progress.correctAnswers++;
    }

    if (!progress.practicedFormulaIds.includes(options.formulaId)) {
      progress.practicedFormulaIds.push(options.formulaId);
    }

    if (!options.isCorrect) {
      if (options.category) {
        progress.categoryMistakes[options.category] = (progress.categoryMistakes[options.category] || 0) + 1;
      }
      if (options.helpingVerbs) {
        for (let hv of options.helpingVerbs) {
          progress.helpingVerbMistakes[hv] = (progress.helpingVerbMistakes[hv] || 0) + 1;
        }
      }
    }

    // Update daily streak
    const today = new Date().toISOString().slice(0, 10);
    if (progress.lastActiveDate !== today) {
      progress.lastActiveDate = today;
    }

    await Storage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    return progress;
  },

  async getRecentlyViewed(): Promise<number[]> {
    try {
      const data = await Storage.getItem(RECENT_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  async recordFormulaViewed(id: number): Promise<void> {
    const list = await this.getRecentlyViewed();
    const filtered = list.filter(item => item !== id);
    filtered.unshift(id);
    const trimmed = filtered.slice(0, 25);
    await Storage.setItem(RECENT_KEY, JSON.stringify(trimmed));
  },

  async resetProgress(): Promise<void> {
    await Storage.removeItem(PROGRESS_KEY);
    await Storage.removeItem(RECENT_KEY);
  }
};
