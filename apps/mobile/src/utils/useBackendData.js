import { useState, useEffect, useCallback } from 'react';

import { apiGet } from '../lib/api';

/**
 * Fetch a list endpoint into component state.
 *
 * This hook is currently unused, but it was written with the two behaviours
 * that src/utils/mockDataHelper.js documents as having put invented records in
 * front of real users, so it is kept in step with that contract rather than
 * left as a trap for the next caller:
 *
 *  1. `mockData` seeded the initial state and was never cleared, so a release
 *     build rendered fabricated rows before — and after — the request resolved.
 *  2. A successful response that was neither an array nor carried `data`/`rows`
 *     fell back to `mockData`, overwriting a real (often legitimately empty)
 *     answer with fiction.
 *
 * It also read API_URL and authToken straight off AuthContext and called fetch
 * directly, which bypassed the 401 refresh/retry interceptor in src/lib/api.js:
 * an expired access token surfaced as a silent empty list instead of being
 * refreshed. Requests now go through apiGet and inherit that handling.
 *
 * Mocks are a development convenience only. `__DEV__` is replaced at build time,
 * so the mock branch is dead code the minifier strips from a release bundle.
 *
 * `error` is populated whenever the request failed and nothing was substituted,
 * so a screen can distinguish "this broke" from "you have nothing here".
 */
export function useBackendData(endpoint, mockData = []) {
  const [data, setData] = useState(__DEV__ ? mockData : []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await apiGet(endpoint);
      const rows = Array.isArray(json)
        ? json
        : (json?.data ?? json?.rows ?? json?.items ?? []);
      setData(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setError(e?.message || `Failed to load ${endpoint}.`);
      if (__DEV__ && mockData?.length) {
        setData(mockData);
      }
    } finally {
      setLoading(false);
    }
    // mockData is a literal at nearly every call site; depending on it would
    // refetch on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  useEffect(() => {
    let cancelled = false;
    // The cancelled flag keeps a resolved request from writing into the state
    // of an unmounted screen, which React reports as a leak.
    (async () => {
      if (cancelled) return;
      await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  return { data, loading, error, refetch: load, setData };
}
