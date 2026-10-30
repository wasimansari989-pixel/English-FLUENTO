import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import { Storage } from '../database/storage';

// In Expo Go (SDK 53+), native notification modules like ExpoPushTokenManager
// are not bundled. We safely detect Expo Go and gracefully avoid calling require('expo-notifications')
// to prevent the Uncaught Error: Cannot find native module 'ExpoPushTokenManager'.
// In standalone APK or development builds, native notifications are fully initialized.

let Notifications: any = null;
let isNativeSupported = false;

if (!isRunningInExpoGo()) {
  try {
    Notifications = require('expo-notifications');
    if (Notifications && typeof Notifications.setNotificationHandler === 'function') {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
      isNativeSupported = true;
    }
  } catch (e) {
    console.warn('Native expo-notifications not available in this client:', e);
    isNativeSupported = false;
    Notifications = null;
  }
}

const CHANNEL_ID = 'daily-learning-reminders';
const STORAGE_KEY = '@fluent_learning_reminder_config';

export const ReminderNotificationService = {
  isNativeAvailable(): boolean {
    return isNativeSupported && Notifications !== null;
  },

  async initChannel(): Promise<void> {
    if (!this.isNativeAvailable() || Platform.OS !== 'android') return;
    try {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Daily Learning Reminders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#D4FF00',
        sound: 'default',
      });
    } catch (e) {
      console.warn('Failed to set notification channel:', e);
    }
  },

  async requestPermission(): Promise<boolean> {
    if (!this.isNativeAvailable()) {
      return true; // Graceful fallback
    }
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      return finalStatus === 'granted';
    } catch (e) {
      console.warn('Failed to request notification permission:', e);
      return false;
    }
  },

  async scheduleDailyReminder(
    hour: number,
    minute: number,
    language: string = 'English'
  ): Promise<{ success: boolean; isNative: boolean }> {
    try {
      const period = hour >= 12 ? 'PM' : 'AM';
      let h12 = hour % 12;
      if (h12 === 0) h12 = 12;
      const mStr = minute < 10 ? `0${minute}` : `${minute}`;
      const timeFormatted = `${h12}:${mStr} ${period}`;

      // Persist config locally so the app and user profile always know the exact scheduled time
      await Storage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          enabled: true,
          hour,
          minute,
          timeFormatted,
          updatedAt: new Date().toISOString(),
        })
      );

      if (this.isNativeAvailable()) {
        const granted = await this.requestPermission();
        if (granted) {
          await this.initChannel();
          await Notifications.cancelAllScheduledNotificationsAsync();

          const titles: Record<string, string> = {
            Hindi: '🎯 Fluent English सीखने का समय!',
            Hinglish: '🚀 Time for your daily English practice!',
            Spanish: '🌟 ¡Hora de tu práctica diaria de inglés!',
            English: '🔥 Time for your daily English practice!',
          };

          const bodies: Record<string, string> = {
            Hindi: 'सिर्फ 10 मिनट में नया formula सीखें और अपना streak बनाए रखें।',
            Hinglish: 'Sirf 10 minutes practice karein aur apna streak maintain rakhein.',
            Spanish: 'Practica 10 minutos para mantener tu racha activa.',
            English: 'Spend just 10 minutes today to keep your learning streak alive.',
          };

          await Notifications.scheduleNotificationAsync({
            content: {
              title: titles[language] || titles.English,
              body: bodies[language] || bodies.English,
              sound: 'default',
              priority: Notifications.AndroidNotificationPriority.MAX,
              data: { type: 'daily_learning_reminder' },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DAILY,
              channelId: CHANNEL_ID,
              hour,
              minute,
            },
          });
          return { success: true, isNative: true };
        }
      }

      return { success: true, isNative: false };
    } catch (error) {
      console.warn('Error scheduling daily reminder:', error);
      return { success: false, isNative: false };
    }
  },

  async sendTestNotification(
    language: string = 'English'
  ): Promise<{ success: boolean; isNative: boolean }> {
    try {
      if (this.isNativeAvailable()) {
        const granted = await this.requestPermission();
        if (granted) {
          await this.initChannel();
          await Notifications.scheduleNotificationAsync({
            content: {
              title: '🔔 Test Reminder: Fluent English',
              body: 'Your learning reminder is set and working! We will remind you every day.',
              sound: 'default',
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: 1,
              channelId: CHANNEL_ID,
            },
          });
          return { success: true, isNative: true };
        }
      }

      return { success: true, isNative: false };
    } catch (e) {
      console.warn('Error sending test notification:', e);
      return { success: false, isNative: false };
    }
  },

  async cancelReminders(): Promise<void> {
    try {
      await Storage.setItem(
        STORAGE_KEY,
        JSON.stringify({ enabled: false, updatedAt: new Date().toISOString() })
      );
      if (this.isNativeAvailable()) {
        await Notifications.cancelAllScheduledNotificationsAsync();
      }
    } catch (e) {
      console.warn('Error cancelling reminders:', e);
    }
  },
};
