import { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE } from '../lib/api';
import { sessionIntentTracker } from '../services/sessionIntentTracker';

/**
 * Home-screen module order, chosen by the contextual bandit.
 *
 * Returns the default order immediately and swaps to the bandit's ordering when
 * it arrives. That sequencing is the point: the home screen must render on the
 * first frame regardless of the network, so the layout is never awaited. A
 * reorder that lands 200ms later is fine; a blank screen for 200ms is not.
 *
 * Also reports engagement back, which is what the policy learns from. Without
 * the reward call the bandit would explore forever and never exploit — it
 * cannot distinguish a module nobody wants from one nobody has been shown.
 */

const DEFAULT_LAYOUT = [
  'NearbyShops',
  'EmergencyServices',
  'CarpoolCommute',
  'FreshMarketplace',
  'LocalJobs',
  'SocietyAlerts',
];

const TIMEOUT_MS = 1500;

export function useHomeLayout({ pincode = null, tenureDays = 0, regionId = null } = {}) {
  const [layout, setLayout] = useState(DEFAULT_LAYOUT);
  const [strategy, setStrategy] = useState('default');
  const contextRef = useRef({});
  const abortRef = useRef(null);

  const fetchLayout = useCallback(async () => {
    const now = new Date();
    const context = {
      local_hour: now.getHours(),
      day_of_week: now.getDay(),
      tenure_days: tenureDays,
      pincode: pincode || '',
      session_depth: sessionIntentTracker.window.length,
      // The bandit's affinity feature, computed from the same rolling window
      // the intent tracker maintains — so what the user has been looking at in
      // this session shapes the layout without a round trip to build it.
      affinity: JSON.stringify(sessionIntentTracker.getCategoryAffinity()),
    };
    contextRef.current = context;

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const params = new URLSearchParams(context);
      if (regionId) params.set('region_id', regionId);

      const res = await fetch(`${API_BASE}/ml/layout/home?${params.toString()}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(String(res.status));

      const data = await res.json();
      if (Array.isArray(data.layout) && data.layout.length > 0) {
        setLayout(data.layout);
        setStrategy(data.strategy || 'default');
      }
    } catch {
      // Keeps whatever is already rendered. A failed layout call must never
      // change what the user is looking at.
    } finally {
      clearTimeout(timer);
    }
  }, [pincode, tenureDays, regionId]);

  useEffect(() => {
    fetchLayout();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchLayout]);

  /**
   * Reports engagement with a module.
   *
   * Reward is in [0,1]: a tap into a module is a full reward, merely seeing it
   * is a small one. LinUCB's guarantees assume bounded rewards, so this scale
   * is a contract with the policy rather than a preference.
   *
   * Fire and forget — the caller is a press handler and must not wait.
   */
  const reportEngagement = useCallback((arm, reward = 1) => {
    if (!arm) return;
    fetch(`${API_BASE}/ml/layout/reward`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        arm,
        reward: Math.min(Math.max(Number(reward) || 0, 0), 1),
        ...contextRef.current,
        affinity: sessionIntentTracker.getCategoryAffinity(),
        region_id: regionId,
      }),
    }).catch(() => {
      // A lost reward costs the policy one observation. Surfacing it would cost
      // the user an error for something they did not do.
    });
  }, [regionId]);

  return { layout, strategy, reportEngagement, refresh: fetchLayout, DEFAULT_LAYOUT };
}

export default useHomeLayout;
