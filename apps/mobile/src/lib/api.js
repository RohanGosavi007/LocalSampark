import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { SecureTokenStorage } from './secureStorage';

const isDev = __DEV__;

// ── Production URL Lock ─────────────────────────────────────────────────
// In release builds (__DEV__ === false), ALWAYS use the live production
// API. This prevents any development/staging URL from leaking into the
// final APK. In dev, use emulator-safe localhost or explicit env override.
const PRODUCTION_API = 'https://localsampark-api.onrender.com/api/v1';

const fallbackUrl = isDev 
  ? 'http://10.0.2.2:5000/api/v1' 
  : PRODUCTION_API;

export const API_URL = isDev
  ? (process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.API_URL_DEV || fallbackUrl)
  : (process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.API_URL_PROD || PRODUCTION_API);

export const API_BASE = API_URL;

/**
 * Structured API Error Class
 */
export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Retrieve authorization headers with stored JWT token.
 * Includes Cache-Control: no-cache to force the Android network stack
 * to always fetch fresh data from the backend.
 */
export async function getAuthHeaders() {
  const token = await SecureTokenStorage.getToken('authToken');
  // Territory-scoped routing: inject territory ID from Zustand store
  let territoryId = null;
  try {
    const { useTerritoryStore } = require('../store/useTerritoryStore');
    territoryId = useTerritoryStore.getState().territoryId;
  } catch (e) { /* store not available */ }

  const headers = {
    'Authorization': token ? `Bearer ${token}` : '',
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'ngrok-skip-browser-warning': 'true' // Bypass ngrok security screen for live API testing
  };

  if (territoryId) {
    headers['X-Territory-ID'] = territoryId;
  }

  return headers;
}

/**
 * Silent token refresh.
 *
 * The backend has always issued a refresh token (30d) alongside the access
 * token and exposes POST /auth/refresh-token, but the mobile client discarded
 * it — `refreshToken` appeared nowhere in the app. A 401 therefore deleted the
 * session outright, which made the access token's full lifetime the real
 * session length and blocked shortening it (a 1h access token would have
 * logged everyone out hourly).
 *
 * Single-flight: a burst of parallel requests hitting 401 together must trigger
 * one refresh, not one per request, otherwise they race and all but one of the
 * resulting tokens is discarded.
 */
let refreshInFlight = null;

async function refreshAccessToken() {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const refreshToken = await SecureTokenStorage.getToken('refreshToken');
      if (!refreshToken) return null;

      // Deliberately a bare fetch, not request(): routing a refresh through the
      // interceptor would recurse on its own 401.
      const res = await fetch(`${API_BASE}/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return null;

      const data = await res.json();
      const nextAccess = data?.accessToken;
      if (!nextAccess) return null;

      await SecureTokenStorage.setToken('authToken', nextAccess);
      // Rotated refresh tokens must be persisted or the next refresh fails.
      if (data.refreshToken) {
        await SecureTokenStorage.setToken('refreshToken', data.refreshToken);
      }
      return nextAccess;
    } catch (e) {
      console.warn('[API Auth] token refresh failed:', e?.message);
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function clearSession() {
  await SecureTokenStorage.deleteToken('authToken');
  await SecureTokenStorage.deleteToken('refreshToken');
  await AsyncStorage.multiRemove(['user', 'activeRole', 'assignedRoles']);
}

/**
 * Enhanced fetch wrapper with error handling, timeout, and auto-logout interceptors
 */
async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const authHeaders = await getAuthHeaders();
  
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), options.timeout || 15000);

  const config = {
    ...options,
    headers: {
      ...authHeaders,
      ...options.headers,
    },
    signal: controller.signal,
  };

  if (isDev) {
    console.log(`[API Request] ${config.method || 'GET'} -> ${url}`, options.body ? options.body : '');
  }

  try {
    const response = await fetch(url, config);
    clearTimeout(id);

    // Parse JSON safely
    let responseData = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = { text: await response.text() };
    }

    if (isDev) {
      console.log(`[API Response] ${response.status} <- ${url}`, responseData);
    }

    // Interceptor: Handle HTTP Error Statuses
    if (!response.ok) {
      // Auto-logout on token expiration / unauthorized access
      if (response.status === 401) {
        // Try a silent refresh once before destroying the session. _retried
        // guards against looping when the retried request 401s again.
        if (!options._retried) {
          const nextToken = await refreshAccessToken();
          if (nextToken) {
            console.log('[API Auth] token refreshed, retrying request');
            return request(endpoint, { ...options, _retried: true });
          }
        }
        console.warn('[API Auth] 401 and refresh unavailable, clearing credentials...');
        await clearSession();
        // Note: Global app state notification or navigation redirect can be triggered here
      }
      
      const errorMessage = responseData?.error || responseData?.message || `HTTP error ${response.status}`;
      throw new ApiError(errorMessage, response.status, responseData);
    }

    return responseData;
  } catch (error) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new ApiError('Request timed out. Please check your internet connection.', 408);
    }
    if (error?.name !== 'ApiError') {
      if (isDev) console.error(`[API Network Error] -> ${url}`, error);
      throw new ApiError('Network connectivity error. Please check if the server is running.', 503);
    }
    throw error;
  }
}

// REST Method Wrappers (preserving existing names to maintain backward compatibility)
export async function apiGet(endpoint, options = {}) {
  return request(endpoint, { method: 'GET', ...options });
}

export async function apiPost(endpoint, body, options = {}) {
  return request(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
    ...options
  });
}

export async function apiPut(endpoint, body, options = {}) {
  return request(endpoint, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
    ...options
  });
}

export async function apiDelete(endpoint, options = {}) {
  return request(endpoint, { method: 'DELETE', ...options });
}
