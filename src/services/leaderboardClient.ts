import { getBackendUrl, getClientId } from './aiClient';
import { LeaderboardResponse, GamificationProfile } from '../types/gamification';
import { UserProfileRepository } from '../database/userProfileRepository';

export const LeaderboardClient = {
  async fetchLeaderboard(period: 'weekly' | 'monthly' | 'all-time' = 'weekly'): Promise<LeaderboardResponse> {
    try {
      const [backendUrl, userId] = await Promise.all([
        getBackendUrl(),
        getClientId(),
      ]);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`${backendUrl}/api/leaderboard?period=${period}&userId=${encodeURIComponent(userId)}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      return {
        ...data,
        offline: false,
      };
    } catch {
      // Offline fallback: do not fabricate false rankings!
      const userId = await getClientId();
      return {
        period,
        rankings: [],
        userRanking: {
          userId,
          displayName: 'You (Offline)',
          xp: 0,
          level: 1,
          levelTitle: 'Novice Explorer',
          streak: 1,
          rank: 1,
          isCurrentUser: true,
        },
        updatedAt: new Date().toISOString(),
        offline: true,
      };
    }
  },

  async syncProfile(profile: GamificationProfile): Promise<boolean> {
    try {
      const [backendUrl, userId, userProfile] = await Promise.all([
        getBackendUrl(),
        getClientId(),
        UserProfileRepository.getProfile(),
      ]);

      let displayName = userProfile.email ? userProfile.email.split('@')[0] : 'Learner';
      if (displayName) {
        displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`${backendUrl}/api/leaderboard/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          displayName,
          avatar: 'happy-outline',
          totalXp: profile.totalXp,
          level: profile.level,
          levelTitle: profile.levelTitle,
          streak: profile.currentStreak,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      return res.ok;
    } catch {
      return false;
    }
  },
};

