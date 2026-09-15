import { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../lib/api';

/**
 * Server-side shop search.
 *
 * The directory filtered locally with
 * `shop.name.toLowerCase().includes(term)`, which matches the name only — so
 * "grocery" finds nothing unless that word is in the shop's name rather than
 * its category — and can only search the page of shops already fetched.
 *
 * This calls the hybrid searcher, which fuses the full-text index with content
 * vectors. It does not replace the local filter: the local result renders while
 * the request is in flight and remains if it fails, so typing never leaves an
 * empty list waiting on the network. Kept deliberately in step with the web
 * hook of the same name so both surfaces return the same results for the same
 * query.
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

    // Debounced so a search box does not fire a request per keystroke. Matters
    // more on mobile than on web: this is often a metered connection.
    timerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
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
        // Falls back to the caller's local filter. A failed search must not
        // empty the directory.
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
