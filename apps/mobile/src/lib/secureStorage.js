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
      }
      await AsyncStorage.setItem(`sec_${key}`, value);
      if (key === 'authToken') {
        // Compatibility bridge for legacy screens reading 'token'
        await AsyncStorage.setItem('token', value);
      }
    } catch (e) {
      console.warn(`SecureStore error for ${key}:`, e.message);
      await AsyncStorage.setItem(`sec_${key}`, value);
      if (key === 'authToken') {
        await AsyncStorage.setItem('token', value);
      }
    }
  },

  async getToken(key) {
    try {
      if (Platform.OS !== 'web') {
        const secureVal = await SecureStore.getItemAsync(key).catch(() => null);
        if (secureVal) return secureVal;
        if (key === 'token') {
          const fallbackVal = await SecureStore.getItemAsync('authToken').catch(() => null);
          if (fallbackVal) return fallbackVal;
        }
      }
    } catch (e) {
      console.warn(`SecureStore getItem error for ${key}:`, e.message);
    }
    const secVal = await AsyncStorage.getItem(`sec_${key}`);
    if (secVal) return secVal;
    if (key === 'authToken' || key === 'token') {
      return (await AsyncStorage.getItem('token')) || (await AsyncStorage.getItem('sec_authToken'));
    }
    return null;
  },

  async deleteToken(key) {
    try {
      if (Platform.OS !== 'web') {
        await SecureStore.deleteItemAsync(key).catch(() => null);
        if (key === 'authToken') {
          await SecureStore.deleteItemAsync('token').catch(() => null);
        }
      }
    } catch (e) {
      console.warn(`SecureStore deleteItem error for ${key}:`, e.message);
    } finally {
      await AsyncStorage.removeItem(`sec_${key}`);
      if (key === 'authToken' || key === 'token') {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('sec_authToken');
      }
    }
  },
};

export default SecureTokenStorage;
