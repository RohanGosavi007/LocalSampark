import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/**
 * Token storage, extracted from AuthContext.
 *
 * It lived in src/context/AuthContext.js, which src/lib/api.js imported for it.
 * That made the low-level HTTP layer depend on a React context module, so
 * AuthContext could never import API_URL back from api.js without creating an
 * import cycle — and the workaround was for AuthContext to re-derive its own
 * base URL with different rules than api.js used (see the note on API_URL in
 * AuthContext). Owning this in a leaf module lets both sides import it and lets
 * AuthContext take the one canonical API_URL.
 *
 * SecureStore is the real store; AsyncStorage under a `sec_` prefix is a
 * fallback for the web target and for devices where the keystore is
 * unavailable.
 */
export const SecureTokenStorage = {
  async setToken(key, value) {
    try {
      if (Platform.OS !== 'web') {
        await SecureStore.setItemAsync(key, value);
        return;
      }
      await AsyncStorage.setItem(`sec_${key}`, value);
    } catch (e) {
      console.warn(`SecureStore error for ${key}:`, e.message);
      // Fallback for iOS/Android if SecureStore is completely broken (rare).
      await AsyncStorage.setItem(`sec_${key}`, value);
    }
  },

  async getToken(key) {
    try {
      if (Platform.OS !== 'web') {
        const secureVal = await SecureStore.getItemAsync(key).catch(() => null);
        if (secureVal) return secureVal;
      }
    } catch (e) {
      console.warn(`SecureStore getItem error for ${key}:`, e.message);
    }
    return AsyncStorage.getItem(`sec_${key}`);
  },

  async deleteToken(key) {
    try {
      if (Platform.OS !== 'web') {
        await SecureStore.deleteItemAsync(key).catch(() => null);
      }
    } catch (e) {
      console.warn(`SecureStore deleteItem error for ${key}:`, e.message);
    } finally {
      await AsyncStorage.removeItem(`sec_${key}`);
    }
  },
};

export default SecureTokenStorage;
