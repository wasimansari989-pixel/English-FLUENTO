import { Storage } from './storage';
import { MistakeRecord } from '../types/ai';

const MISTAKES_KEY = '@english_formula_mistakes';
const MAX_MISTAKES = 100;

export const MistakeRepository = {
  async getMistakes(): Promise<MistakeRecord[]> {
    try {
      const data = await Storage.getItem(MISTAKES_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  async recordMistake(
    mistake: Omit<MistakeRecord, 'id' | 'timestamp'>
  ): Promise<MistakeRecord> {
    const list = await this.getMistakes();
    const newRecord: MistakeRecord = {
      ...mistake,
      id: `mistake_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
    };

    // Prepend and trim to MAX_MISTAKES
    const updated = [newRecord, ...list].slice(0, MAX_MISTAKES);
    await Storage.setItem(MISTAKES_KEY, JSON.stringify(updated));
    return newRecord;
  },

  async getWeakFormulaIds(limit: number = 8): Promise<number[]> {
    const mistakes = await this.getMistakes();
    const counts: Record<number, number> = {};

    mistakes.forEach((m) => {
      if (m.formulaId) {
        counts[m.formulaId] = (counts[m.formulaId] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => Number(id));
  },

  async getWeakCategories(limit: number = 5): Promise<{ category: string; count: number }[]> {
    const mistakes = await this.getMistakes();
    const counts: Record<string, number> = {};

    mistakes.forEach((m) => {
      const cat = m.category || 'General';
      counts[cat] = (counts[cat] || 0) + 1;
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([category, count]) => ({ category, count }));
  },

  async removeMistake(id: string): Promise<void> {
    const mistakes = await this.getMistakes();
    const filtered = mistakes.filter((m) => m.id !== id);
    await Storage.setItem(MISTAKES_KEY, JSON.stringify(filtered));
  },

  async clearAllMistakes(): Promise<void> {
    await Storage.removeItem(MISTAKES_KEY);
  },
};

