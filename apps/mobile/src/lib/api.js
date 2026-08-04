import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { SecureTokenStorage } from '../context/AuthContext';

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
  ? (process.env.EXPO_PUBLIC_API_URL || 
     Constants.expoConfig?.extra?.API_URL_DEV || 
     fallbackUrl)
  : PRODUCTION_API;  // Release: ALWAYS production, no overrides

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
  };

  if (territoryId) {
    headers['X-Territory-ID'] = territoryId;
  }

  return headers;
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
        console.warn('[API Auth] 401 Unauthorized received, clearing credentials...');
        await SecureTokenStorage.deleteToken('authToken');
        await AsyncStorage.multiRemove(['user', 'activeRole', 'assignedRoles']);
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
    if (!(error instanceof ApiError)) {
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
