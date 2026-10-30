import { Storage } from '../database/storage';
import { NetworkService } from './networkService';
import { LeaderboardClient } from './leaderboardClient';
import { GamificationRepository } from '../database/gamificationRepository';

const SYNC_QUEUE_KEY = '@fluent_sync_queue';
const MAX_RETRIES = 5;

export interface SyncTask {
  id: string;
  type: 'leaderboard_sync' | 'activity_sync';
  payload: any;
  timestamp: number;
  retryCount: number;
  eventKey?: string;
  nextRetryTime?: number;
}

class SyncQueueServiceClass {
  private isProcessing: boolean = false;

  constructor() {
    // Automatically process queue when connection is restored
    NetworkService.subscribe((isOnline) => {
      if (isOnline) {
        this.processQueue().catch(() => {});
      }
    });
  }

  public async getQueue(): Promise<SyncTask[]> {
    try {
      const data = await Storage.getItem(SYNC_QUEUE_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private async saveQueue(queue: SyncTask[]): Promise<void> {
    try {
      await Storage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch {
      // non-fatal
    }
  }

  public async enqueue(task: Omit<SyncTask, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    const queue = await this.getQueue();

    // 1. Duplicate check: if task has matching eventKey or same type, update payload
    if (task.eventKey) {
      const existingIdx = queue.findIndex((t) => t.eventKey === task.eventKey);
      if (existingIdx >= 0) {
        queue[existingIdx].payload = task.payload;
        queue[existingIdx].timestamp = Date.now();
        await this.saveQueue(queue);
        return;
      }
    } else if (task.type === 'leaderboard_sync') {
      const existingIdx = queue.findIndex((t) => t.type === 'leaderboard_sync');
      if (existingIdx >= 0) {
        // Conflict resolution: preserve higher XP
        const existingXp = queue[existingIdx].payload?.totalXp || 0;
        const newXp = task.payload?.totalXp || 0;
        if (newXp >= existingXp) {
          queue[existingIdx].payload = task.payload;
          queue[existingIdx].timestamp = Date.now();
        }
        await this.saveQueue(queue);
        return;
      }
    }

    const newTask: SyncTask = {
      ...task,
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      retryCount: 0,
    };

    queue.push(newTask);
    await this.saveQueue(queue);

    // Try processing if online
    if (NetworkService.getIsOnline()) {
      this.processQueue().catch(() => {});
    }
  }

  public async processQueue(): Promise<{ processed: number; remaining: number }> {
    if (this.isProcessing) return { processed: 0, remaining: 0 };
    this.isProcessing = true;

    try {
      const isOnline = await NetworkService.checkConnectivity();
      if (!isOnline) {
        const current = await this.getQueue();
        return { processed: 0, remaining: current.length };
      }

      let queue = await this.getQueue();
      if (queue.length === 0) {
        // Enqueue current gamification state if needed
        const profile = await GamificationRepository.getProfile();
        await LeaderboardClient.syncProfile(profile);
        return { processed: 0, remaining: 0 };
      }

      const now = Date.now();
      const remainingTasks: SyncTask[] = [];
      let processedCount = 0;

      for (const task of queue) {
        if (task.nextRetryTime && task.nextRetryTime > now) {
          remainingTasks.push(task);
          continue;
        }

        let success = false;

        try {
          if (task.type === 'leaderboard_sync') {
            const profile = task.payload || (await GamificationRepository.getProfile());
            success = await LeaderboardClient.syncProfile(profile);
          } else {
            // General activity sync
            success = true;
          }
        } catch {
          success = false;
        }

        if (success) {
          processedCount++;
        } else {
          // Increment retry count with exponential backoff
          const nextRetry = task.retryCount + 1;
          if (nextRetry < MAX_RETRIES) {
            remainingTasks.push({
              ...task,
              retryCount: nextRetry,
              nextRetryTime: now + Math.pow(2, nextRetry) * 1000,
            });
          }
        }
      }

      await this.saveQueue(remainingTasks);
      return { processed: processedCount, remaining: remainingTasks.length };
    } finally {
      this.isProcessing = false;
    }
  }

  public async clearQueue(): Promise<void> {
    await Storage.removeItem(SYNC_QUEUE_KEY);
  }
}

export const SyncQueueService = new SyncQueueServiceClass();

