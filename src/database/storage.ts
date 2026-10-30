import AsyncStorage from '@react-native-async-storage/async-storage';

// In-memory fallback if AsyncStorage fails or runs in Node test environment
const memoryFallback = new Map<string, string>();

export const Storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (AsyncStorage && AsyncStorage.getItem) {
        return await AsyncStorage.getItem(key);
      }
    } catch {
      // fallback
    }
    return memoryFallback.get(key) || null;
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (AsyncStorage && AsyncStorage.setItem) {
        await AsyncStorage.setItem(key, value);
        return;
      }
    } catch {
      // fallback
    }
    memoryFallback.set(key, value);
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (AsyncStorage && AsyncStorage.removeItem) {
        await AsyncStorage.removeItem(key);
        return;
      }
    } catch {
      // fallback
    }
    memoryFallback.delete(key);
  },

  async clear(): Promise<void> {
    try {
      if (AsyncStorage && AsyncStorage.clear) {
        await AsyncStorage.clear();
        return;
      }
    } catch {
      // fallback
    }
    memoryFallback.clear();
  }
};
