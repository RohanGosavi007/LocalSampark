'use client';

import { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../lib/api';

/**
 * Server-side shop search.
 *
 * The directory filtered shops locally with
 * `shop.name.toLowerCase().includes(term)`, which has two limits users hit
 * immediately: it matches the name only — so "grocery" finds nothing unless the
 * word is in the shop's name, never its category or description — and it can
 * only ever search the page of shops already fetched, so anything outside the
 * current radius or category filter is invisible.
 *
 * This calls the hybrid searcher, which fuses the full-text index with content
 * vectors. It deliberately does NOT replace the local filter: the local result
 * is what renders while the request is in flight and what remains if the
 * request fails, so typing never produces an empty screen waiting on a network
 * round trip.
 *
 * Returns { results, loading, active }. `active` is false when the query is too
 * short or the server had nothing, which is the caller's signal to keep using
 * its own filtered list.
 */
export function useShopSearch(queryText, { limit = 30, enabled = true } = {}) {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const trimmed = String(queryText || '').trim();

    if (timerRef.current) clearTimeout(timerRef.current);
    if (abortRef.current) abortRef.current.abort();

    if (!enabled || trimmed.length < 2) {
      setResults(null);
      setLoading(false);
      return undefined;
    }

    setLoading(true);

    // Debounced, so a search box does not fire a request per keystroke. 250ms
    // is below the threshold where typing feels laggy and above the interval
    // between keystrokes for most typists.
    timerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      // The same 150ms budget the ranking endpoints hold themselves to. Search
      // that arrives after the user has typed more is worse than no search.
      const timeout = setTimeout(() => controller.abort(), 1500);

      try {
        const res = await fetch(`${API_BASE}/ml/search/semantic`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: trimmed, limit }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Search failed: ${res.status}`);
        const data = await res.json();
        setResults(Array.isArray(data.shops) ? data.shops : []);
      } catch {
        // Falls back to whatever the caller's local filter produced. A failed
        // search must not empty the directory.
        setResults(null);
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    }, 250);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [queryText, limit, enabled]);

  return {
    results,
    loading,
    active: Array.isArray(results) && results.length > 0,
  };
}

export default useShopSearch;
