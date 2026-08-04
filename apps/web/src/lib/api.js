'use client';

/**
 * Shared API configuration for LocalSampark Web Frontend.
 * All pages and components should import from here instead of hardcoding URLs.
 */

// Base API URL — uses environment variable, falls back to localhost:5000 in dev, or render in prod
const isDev = process.env.NODE_ENV !== 'production';
export const API_URL = process.env.NEXT_PUBLIC_API_URL || (isDev ? 'http://localhost:5000' : 'https://localsampark-api.onrender.com');
export const API_BASE = `${API_URL}/api/v1`;

/**
 * Get auth headers with bearer token from localStorage.
 * @returns {Object} Headers object with Authorization and Content-Type
 */
export function getAuthHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : '';
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Make an authenticated GET request.
 * @param {string} endpoint - API endpoint path (e.g., '/shops/nearby')
 * @returns {Promise<any>} Parsed JSON response
 */
export async function apiGet(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || err.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

/**
 * Make an authenticated POST request.
 * @param {string} endpoint - API endpoint path
 * @param {Object} body - Request body
 * @returns {Promise<any>} Parsed JSON response
 */
export async function apiPost(endpoint, body) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || err.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

/**
 * Make an authenticated PUT request.
 * @param {string} endpoint - API endpoint path
 * @param {Object} body - Request body
 * @returns {Promise<any>} Parsed JSON response
 */
export async function apiPut(endpoint, body) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || err.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

/**
 * Make an authenticated DELETE request.
 * @param {string} endpoint - API endpoint path
 * @returns {Promise<any>} Parsed JSON response
 */
export async function apiDelete(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || err.message || `Request failed: ${res.status}`);
  }
  return res.json();
}
