import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/**
 * Token storage, extracted from AuthContext.
 *
 * SecureStore is the primary store on native platforms (iOS / Android).
 * AsyncStorage is strictly a fallback for web, or if the hardware keystore
 * is completely unavailable.
 *
 * Security (N2): Native setToken NEVER writes access or refresh tokens to unencrypted
 * AsyncStorage. On native initialization, any legacy plain-text keys ('token', 'sec_*')
 * are purged from AsyncStorage once.
 */
let legacyCleanedUp = false;

export const SecureTokenStorage = {
  async cleanupLegacyStorage() {
    if (legacyCleanedUp || Platform.OS === 'web') return;
    try {
      const keys = await AsyncStorage.getAllKeys();
      const legacyKeys = keys.filter(k => k === 'token' || k === 'authToken' || k.startsWith('sec_'));
      if (legacyKeys.length > 0) {
        await AsyncStorage.multiRemove(legacyKeys);
      }
      legacyCleanedUp = true;
    } catch (e) {
      // Non-fatal cleanup
    }
  },

  async setToken(key, value) {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(`sec_${key}`, value);
      return;
    }

    try {
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      console.warn(`SecureStore setItemAsync failed for ${key}:`, e.message);
      // Fallback only if hardware keystore genuinely fails
      await AsyncStorage.setItem(`sec_${key}`, value);
    }
  },

  async getToken(key) {
    if (Platform.OS !== 'web') {
      try {
        const secureVal = await SecureStore.getItemAsync(key).catch(() => null);
        if (secureVal) return secureVal;
        if (key === 'token') {
          const fallbackVal = await SecureStore.getItemAsync('authToken').catch(() => null);
          if (fallbackVal) return fallbackVal;
        }
      } catch (e) {
        console.warn(`SecureStore getItem error for ${key}:`, e.message);
      }
    }

    // Web fallback or legacy fallback before cleanup
    const secVal = await AsyncStorage.getItem(`sec_${key}`);
    if (secVal) return secVal;
    if (key === 'authToken' || key === 'token') {
      return (await AsyncStorage.getItem('token')) || (await AsyncStorage.getItem('sec_authToken'));
    }
    return null;
  },

  async deleteToken(key) {
    if (Platform.OS !== 'web') {
      try {
        await SecureStore.deleteItemAsync(key).catch(() => null);
        if (key === 'authToken') {
          await SecureStore.deleteItemAsync('token').catch(() => null);
        }
      } catch (e) {
        console.warn(`SecureStore deleteItem error for ${key}:`, e.message);
      }
    }

    // Always remove from AsyncStorage fallback/legacy
    try {
      await AsyncStorage.removeItem(`sec_${key}`);
      if (key === 'authToken' || key === 'token') {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('sec_authToken');
      }
    } catch (e) {}
  },
};

// Trigger legacy cleanup on module load
SecureTokenStorage.cleanupLegacyStorage().catch(() => {});

export default SecureTokenStorage;
