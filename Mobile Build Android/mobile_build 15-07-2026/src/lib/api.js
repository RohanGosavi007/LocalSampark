import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const isDev = process.env.NODE_ENV === 'development';
const fallbackUrl = isDev 
  ? 'http://192.168.1.7:5000/api/v1'
  : 'https://localsampark-api.onrender.com/api/v1';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || 
                (isDev ? Constants.expoConfig?.extra?.API_URL_DEV : Constants.expoConfig?.extra?.API_URL_PROD) || 
                fallbackUrl;

export const API_BASE = API_URL;

export async function getAuthHeaders() {
  const token = await AsyncStorage.getItem('authToken');
  return {
    'Authorization': token ? `Bearer ${token}` : '',
    'Content-Type': 'application/json',
  };
}

export async function apiGet(endpoint) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${endpoint}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || err.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function apiPost(endpoint, body) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || err.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function apiPut(endpoint, body) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || err.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function apiDelete(endpoint) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || err.message || `Request failed: ${res.status}`);
  }
  return res.json();
}
