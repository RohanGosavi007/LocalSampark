const { Platform } = require('react-native');
const AsyncStorage = require('@react-native-async-storage/async-storage');
const SecureStore = require('expo-secure-store');
const { SecureTokenStorage } = require('../src/lib/secureStorage');

describe('Security Regression Suite — N2: Mobile Secure Storage Isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.__store.clear();
    SecureStore.__store.clear();
    Platform.OS = 'android';
  });

  test('[N2.1] native setToken writes strictly to SecureStore and never to AsyncStorage', async () => {
    Platform.OS = 'android';
    await SecureTokenStorage.setToken('authToken', 'sample-jwt-token');

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('authToken', 'sample-jwt-token');
    // Crucial security invariant: No plain AsyncStorage copy
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    expect(AsyncStorage.__store.has('sec_authToken')).toBe(false);
    expect(AsyncStorage.__store.has('token')).toBe(false);
  });

  test('[N2.2] native setToken for refreshToken writes strictly to SecureStore', async () => {
    Platform.OS = 'android';
    await SecureTokenStorage.setToken('refreshToken', 'sample-refresh-token');

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('refreshToken', 'sample-refresh-token');
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    expect(AsyncStorage.__store.has('sec_refreshToken')).toBe(false);
  });

  test('[N2.3] web setToken writes to AsyncStorage fallback', async () => {
    Platform.OS = 'web';
    await SecureTokenStorage.setToken('authToken', 'sample-web-jwt');

    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('sec_authToken', 'sample-web-jwt');
    expect(AsyncStorage.__store.get('sec_authToken')).toBe('sample-web-jwt');
  });

  test('[N2.4] native setToken falls back to AsyncStorage only if SecureStore fails', async () => {
    Platform.OS = 'android';
    SecureStore.setItemAsync.mockRejectedValueOnce(new Error('Keystore unavailable'));

    await SecureTokenStorage.setToken('authToken', 'fallback-jwt');

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('authToken', 'fallback-jwt');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('sec_authToken', 'fallback-jwt');
    expect(AsyncStorage.__store.get('sec_authToken')).toBe('fallback-jwt');
  });

  test('[N2.5] cleanupLegacyStorage wipes plain tokens from AsyncStorage on native', async () => {
    Platform.OS = 'android';
    AsyncStorage.__store.set('token', 'leak-plain-token');
    AsyncStorage.__store.set('authToken', 'leak-auth-token');
    AsyncStorage.__store.set('sec_authToken', 'leak-sec-token');
    AsyncStorage.__store.set('user_preference_theme', 'dark');

    AsyncStorage.getAllKeys = jest.fn(async () => Array.from(AsyncStorage.__store.keys()));

    await SecureTokenStorage.cleanupLegacyStorage();

    expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(
      expect.arrayContaining(['token', 'authToken', 'sec_authToken'])
    );
    expect(AsyncStorage.__store.has('token')).toBe(false);
    expect(AsyncStorage.__store.has('authToken')).toBe(false);
    expect(AsyncStorage.__store.has('sec_authToken')).toBe(false);
    // Non-token keys must be preserved
    expect(AsyncStorage.__store.get('user_preference_theme')).toBe('dark');
  });
});
