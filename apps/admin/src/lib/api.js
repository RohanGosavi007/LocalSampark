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
