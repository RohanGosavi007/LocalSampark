'use client';
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { apiGet, apiPut } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

/**
 * The notification inbox and its settings (C13).
 *
 * The web had only the header's dropdown: the ten newest, no way to open what
 * a notification was about beyond its raw link, and no settings at all. Here
 * every notification is listed, opening one marks it read and goes to what it
 * is about (an order opens the order), and the customer chooses what reaches
 * them and how (GET/PUT /notifications/preferences).
 */

const PREFS = [
  { key: 'orderUpdates', label: 'Order updates', hint: 'Order placed, accepted, on the way, delivered. Always kept in this inbox.' },
  { key: 'promotions', label: 'Offers and promotions', hint: 'Deals from shops near you.' },
  { key: 'push', label: 'Push notifications', hint: 'On your phone, when the LocalSampark app is installed.' },
  { key: 'email', label: 'Email', hint: 'Order confirmations to the address on your account.' },
];

const when = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '');

/** Only links inside this site are followed. */
const safeLink = (url) => (typeof url === 'string' && url.startsWith('/') && !url.startsWith('//') ? url : null);

export default function NotificationsPage() {
  const router = useRouter();
  const { token, loading } = useAuth();
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [prefs, setPrefs] = useState(null);
  const [saving, setSaving] = useState(null);

  const load = useCallback(() => {
    apiGet('/notifications')
      .then((r) => { setItems((r && r.data) || []); setError(null); })
      .catch((e) => setError(e.message || 'Your notifications could not be loaded.'));
    apiGet('/notifications/preferences')
      .then((r) => setPrefs((r && r.preferences) || null))
      .catch(() => setPrefs(null));
  }, []);

  useEffect(() => { if (token) load(); }, [token, load]);

  const open = async (n) => {
    if (!n.isRead) {
      setItems((list) => list.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      apiPut(`/notifications/${n.id}/read`, {}).catch(() => {});
    }
    const link = safeLink(n.actionUrl);
    if (link) router.push(link);
  };

  const readAll = () => {
    setItems((list) => (list || []).map((x) => ({ ...x, isRead: true })));
    apiPut('/notifications/read-all', {}).catch(() => {});
  };

  const toggle = async (key) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setSaving(key);
    try {
      const r = await apiPut('/notifications/preferences', { [key]: next[key] });
      if (r && r.preferences) setPrefs(r.preferences);
    } catch {
      setPrefs(prefs);
    } finally {
      setSaving(null);
    }
  };

  const unread = (items || []).filter((n) => !n.isRead).length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-2xl mx-auto px-4 space-y-8">
          <div className="flex items-baseline justify-between gap-4">
            <h1 className="text-3xl font-heading font-black text-text">Notifications</h1>
            {unread > 0 && (
              <button type="button" onClick={readAll} className="text-sm font-bold text-primary min-h-[44px]">
                Mark all as read ({unread})
              </button>
            )}
          </div>

          {!loading && !token && (
            <p className="text-text-muted">
              <Link href="/login" className="text-primary font-bold">Sign in</Link> to see your notifications.
            </p>
          )}
          {error && <p role="alert" className="text-red-500 font-bold">{error}</p>}
          {token && items === null && !error && <p className="text-text-muted">Loading…</p>}
          {items && items.length === 0 && <p className="text-text-muted">You have no notifications yet.</p>}

          {items && items.length > 0 && (
            <ul className="space-y-2" aria-label="Notifications">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => open(n)}
                    data-testid="notification"
                    data-read={n.isRead ? 'true' : 'false'}
                    className={`w-full text-left glass-card rounded-2xl border p-4 transition-colors ${n.isRead ? 'border-border opacity-75' : 'border-primary/50'}`}
                  >
                    <div className="flex justify-between gap-3">
                      <p className={`text-text ${n.isRead ? 'font-semibold' : 'font-black'}`}>
                        {!n.isRead && <span className="inline-block w-2 h-2 rounded-full bg-primary mr-2 align-middle" aria-label="Unread" />}
                        {n.title}
                      </p>
                      <span className="text-xs text-text-muted shrink-0">{when(n.createdAt)}</span>
                    </div>
                    {n.message && <p className="text-sm text-text-muted mt-1">{n.message}</p>}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {token && prefs && (
            <section aria-labelledby="notification-settings" className="glass-card rounded-2xl border border-border p-5 space-y-4">
              <h2 id="notification-settings" className="text-xl font-bold text-text">What reaches you</h2>
              {PREFS.map((p) => (
                <label key={p.key} className="flex items-start justify-between gap-4 cursor-pointer">
                  <span>
                    <span className="block font-bold text-text">{p.label}</span>
                    <span className="block text-sm text-text-muted">{p.hint}</span>
                  </span>
                  <input
                    type="checkbox"
                    role="switch"
                    aria-label={p.label}
                    checked={Boolean(prefs[p.key])}
                    disabled={saving === p.key}
                    onChange={() => toggle(p.key)}
                    className="w-6 h-6 mt-1 accent-primary shrink-0"
                  />
                </label>
              ))}
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
