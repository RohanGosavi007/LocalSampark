'use client';

/**
 * Shared API configuration for LocalSampark Admin Panel.
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
export const API_BASE = `${API_URL}/api/v1`;

export function getAuthHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : '';
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Error carrying the HTTP status, so callers can distinguish "your session
 * expired" from "the server broke".
 */
export class AdminApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
    this.body = body;
  }
}

/**
 * fetch + JSON parse that actually fails on a failed request.
 *
 * Every admin tab was written as:
 *
 *     const res = await fetch(url, { headers: authHeaders() });
 *     const data = await res.json();
 *     setRows(data.data || data.items || (Array.isArray(data) ? data : []));
 *
 * `fetch` only rejects on a network error, so a 401, 403 or 500 fell straight
 * through. The error body ({ error: "..." }) has no .data/.items and is not an
 * array, so the chain collapsed to [] and the table rendered "No data found."
 * — an expired admin session and a genuinely empty table looked identical.
 *
 * This throws instead, with the server's own message where there is one.
 */
export async function fetchJson(url, options = {}) {
  let res;
  try {
    res = await fetch(url, options);
  } catch (networkError) {
    throw new AdminApiError(
      'Could not reach the API. Check that the backend is running.',
      0,
      null
    );
  }

  const text = await res.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    const serverMessage =
      (body && typeof body === 'object' && (body.error || body.message)) ||
      (typeof body === 'string' && body.slice(0, 200)) ||
      null;

    if (res.status === 401) {
      throw new AdminApiError(
        serverMessage || 'Your admin session has expired. Please sign in again.',
        401,
        body
      );
    }
    if (res.status === 403) {
      throw new AdminApiError(
        serverMessage || 'You do not have permission to view this.',
        403,
        body
      );
    }
    throw new AdminApiError(
      serverMessage || `Request failed (HTTP ${res.status}).`,
      res.status,
      body
    );
  }

  return body;
}

/**
 * Normalises the several list envelopes the backend returns
 * ({data}, {items}, {rows}, {users}, or a bare array).
 */
export function toList(payload, ...extraKeys) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  for (const key of [...extraKeys, 'data', 'items', 'rows', 'records', 'results']) {
    if (Array.isArray(payload[key])) return payload[key];
  }
  return [];
}
