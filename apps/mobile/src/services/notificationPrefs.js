/**
 * Notification settings (C13): what reaches the customer, and how.
 * GET/PUT /notifications/preferences on the server, shared with the web's
 * /notifications page. React-free so it can be tested.
 */
import { apiGet, apiPut } from '../lib/api';

export const PREFS = [
  { key: 'orderUpdates', label: 'Order updates', hint: 'Always kept in your inbox' },
  { key: 'promotions', label: 'Offers and promotions', hint: 'Deals from shops near you' },
  { key: 'push', label: 'Push notifications', hint: 'On this phone' },
  { key: 'email', label: 'Email', hint: 'Order confirmations' },
];

export async function loadPrefs(api = { apiGet }) {
  const res = await api.apiGet('/notifications/preferences');
  return (res && res.preferences) || null;
}

/** Saves one setting; resolves to the settings the server now holds. */
export async function savePref(key, value, api = { apiPut }) {
  if (!PREFS.some((p) => p.key === key)) throw new Error(`Unknown setting ${key}`);
  const res = await api.apiPut('/notifications/preferences', { [key]: Boolean(value) });
  return (res && res.preferences) || null;
}
