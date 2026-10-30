import { Storage } from './storage';

export type UserLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type AppLanguage = 'Hindi' | 'English' | 'Hinglish' | 'Spanish';

export interface UserOnboardingProfile {
  country: string;
  countryName: string;
  callingCode: string;
  language: AppLanguage;
  accountType: 'guest' | 'google' | 'email';
  email?: string;
  level: UserLevel;
  assessmentScore?: number | null;
  suggestedLevel?: UserLevel;
  answers: number[];
  dailyGoalMinutes: number; // 5, 10, 15, 20
  remindersEnabled: boolean;
  reminderTime?: string; // e.g. "7:00 PM"
  reminderHour?: number; // 0-23
  reminderMinute?: number; // 0-59
  onboardingCompleted: boolean;
  completedAt?: string;
}

const ONBOARDING_PROFILE_KEY = '@fluent_user_profile';
const ONBOARDING_COMPLETED_KEY = '@fluent_onboarding_completed';
const CINEMATIC_INTRO_SEEN_KEY = '@fluent_cinematic_intro_seen';

export const defaultUserProfile: UserOnboardingProfile = {
  country: 'IN',
  countryName: 'India',
  callingCode: '+91',
  language: 'Hindi',
  accountType: 'guest',
  email: '',
  level: 'Beginner',
  assessmentScore: null,
  suggestedLevel: 'Beginner',
  answers: [],
  dailyGoalMinutes: 10,
  remindersEnabled: false,
  reminderTime: '7:00 PM',
  reminderHour: 19,
  reminderMinute: 0,
  onboardingCompleted: false,
};

export const UserProfileRepository = {
  async getProfile(): Promise<UserOnboardingProfile> {
    try {
      const data = await Storage.getItem(ONBOARDING_PROFILE_KEY);
      if (!data) return defaultUserProfile;
      return { ...defaultUserProfile, ...JSON.parse(data) };
    } catch {
      return defaultUserProfile;
    }
  },

  async saveProfile(profile: Partial<UserOnboardingProfile>): Promise<UserOnboardingProfile> {
    try {
      const current = await this.getProfile();
      const updated: UserOnboardingProfile = {
        ...current,
        ...profile,
      };
      await Storage.setItem(ONBOARDING_PROFILE_KEY, JSON.stringify(updated));
      if (updated.onboardingCompleted) {
        await Storage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
      }
      return updated;
    } catch {
      return defaultUserProfile;
    }
  },

  async isOnboardingCompleted(): Promise<boolean> {
    try {
      const flag = await Storage.getItem(ONBOARDING_COMPLETED_KEY);
      if (flag === 'true') return true;
      const profile = await this.getProfile();
      return !!profile.onboardingCompleted;
    } catch {
      return false;
    }
  },

  async isCinematicIntroSeen(): Promise<boolean> {
    try {
      const flag = await Storage.getItem(CINEMATIC_INTRO_SEEN_KEY);
      return flag === 'true';
    } catch {
      return false;
    }
  },

  async setCinematicIntroSeen(seen: boolean): Promise<void> {
    try {
      if (seen) {
        await Storage.setItem(CINEMATIC_INTRO_SEEN_KEY, 'true');
      } else {
        await Storage.removeItem(CINEMATIC_INTRO_SEEN_KEY);
      }
    } catch {
      // ignore
    }
  },

  async setOnboardingCompleted(completed: boolean): Promise<void> {
    try {
      if (completed) {
        await Storage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
        await this.saveProfile({ onboardingCompleted: true, completedAt: new Date().toISOString() });
      } else {
        await Storage.removeItem(ONBOARDING_COMPLETED_KEY);
        await this.saveProfile({ onboardingCompleted: false });
      }
    } catch {
      // ignore
    }
  },

  async resetProfile(): Promise<void> {
    try {
      await Storage.removeItem(ONBOARDING_PROFILE_KEY);
      await Storage.removeItem(ONBOARDING_COMPLETED_KEY);
      await Storage.removeItem(CINEMATIC_INTRO_SEEN_KEY);
    } catch {
      // ignore
    }
  },
};
