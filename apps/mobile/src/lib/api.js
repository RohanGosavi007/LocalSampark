import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { SecureTokenStorage } from '../context/AuthContext';

const isDev = process.env.NODE_ENV === 'development';

// Helper to determine base URL
// Note: Android Emulator uses 10.0.2.2 to access the host machine's localhost (5000)
// Physical devices use the local network IP (e.g. 192.168.1.7).
const fallbackUrl = isDev 
  ? 'http://10.0.2.2:5000/api/v1' 
  : 'https://localsampark-api.onrender.com/api/v1';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || 
                (isDev ? Constants.expoConfig?.extra?.API_URL_DEV : Constants.expoConfig?.extra?.API_URL_PROD) || 
                fallbackUrl;

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
 * Retrieve authorization headers with stored JWT token
 */
export async function getAuthHeaders() {
  const token = await SecureTokenStorage.getToken('authToken');
  return {
    'Authorization': token ? `Bearer ${token}` : '',
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
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
