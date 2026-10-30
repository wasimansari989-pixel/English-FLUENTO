import { Storage } from '../database/storage';

const WEAK_TOPICS_KEY = '@ai_teacher_weak_topics';
const MAX_WEAK_TOPICS = 10;

export interface WeakTopic {
  tag: string;
  count: number;
  lastSeen: number;
}

/**
 * Tracks grammar tags from corrections to personalize future AI lessons.
 */
export const WeakTopicsTracker = {
  async getWeakTopics(): Promise<WeakTopic[]> {
    try {
      const saved = await Storage.getItem(WEAK_TOPICS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  },

  async recordMistake(grammarTags: string[]): Promise<void> {
    try {
      const topics = await this.getWeakTopics();
      for (const tag of grammarTags) {
        if (!tag || tag === 'general-english') continue;
        const existing = topics.find((t) => t.tag === tag);
        if (existing) {
          existing.count += 1;
          existing.lastSeen = Date.now();
        } else {
          topics.push({ tag, count: 1, lastSeen: Date.now() });
        }
      }
      // Sort by count descending & keep top N
      topics.sort((a, b) => b.count - a.count);
      await Storage.setItem(WEAK_TOPICS_KEY, JSON.stringify(topics.slice(0, MAX_WEAK_TOPICS)));
    } catch (e) {
      console.warn('Failed to save weak topics:', e);
    }
  },

  async getTopWeakTags(limit: number = 5): Promise<string[]> {
    const topics = await this.getWeakTopics();
    return topics.slice(0, limit).map((t) => t.tag);
  },

  async clear(): Promise<void> {
    await Storage.removeItem(WEAK_TOPICS_KEY);
  },
};

