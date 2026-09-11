import { apiGet, apiPost } from '../lib/api';
import { DEV_CONFIG } from '../config/devMode';

/**
 * API wrapper that falls back to caller-supplied mock data.
 *
 * Twelve screens go through this helper — order history, checkout, marketplace,
 * pharmacy, promotions, subscriptions, shop dashboard, service booking and the
 * rest — and it had two behaviours that put invented records in front of real
 * users in a release build:
 *
 *  1. It substituted mock data whenever the request threw. Every outage, every
 *     expired token, every 500 turned into a screen of plausible-looking
 *     records with no indication anything had gone wrong.
 *
 *  2. Worse, it substituted mock data when the API succeeded and returned an
 *     empty list. An empty list is a fact — a new customer with no orders, a
 *     shop with no products yet — and it was overwritten with fiction. That
 *     path could not even be blamed on a network problem; it fired on a
 *     perfectly healthy response.
 *
 * Mock substitution is now confined to development builds, and the empty-result
 * substitution is gone entirely in both. `__DEV__` is replaced at build time, so
 * the mock branches are dead code the minifier removes from a release bundle.
 *
 * Callers get `error` populated whenever the request failed and no mock was
 * substituted, so a screen can say what went wrong instead of rendering an
 * empty state that looks like "you have nothing here".
 */

/** Mocks are a development convenience, never a production fallback. */
const mocksAllowed = () => __DEV__;

export async function fetchWithFallback(endpoint, mockData = null, options = {}) {
  if (mocksAllowed() && DEV_CONFIG.FORCE_MOCK_DATA && mockData) {
    if (DEV_CONFIG.LOG_API_CALLS) {
      console.log(`[MockHelper] FORCED MOCK for ${endpoint}`);
    }
    return { data: mockData, isDemo: true, error: null };
  }

  try {
    const data = await apiGet(endpoint, options);

    // An empty result is returned as-is. This used to swap in mock data, so a
    // user with genuinely no orders saw someone else's.
    return { data, isDemo: false, error: null };
  } catch (error) {
    if (DEV_CONFIG.LOG_API_CALLS) {
      console.warn(`[MockHelper] API failed for ${endpoint}: ${error.message}`);
    }

    if (mocksAllowed() && mockData) {
      return { data: mockData, isDemo: true, error: error.message };
    }

    return { data: null, isDemo: false, error: error.message };
  }
}

/**
 * POST wrapper. The mock response here is more dangerous than a read mock: it
 * reports a write as having succeeded when the server never received it, so a
 * shop registration or a booking silently evaporates while the user is shown a
 * confirmation. Development only.
 */
export async function postWithFallback(endpoint, body, mockResponse = null) {
  if (mocksAllowed() && DEV_CONFIG.FORCE_MOCK_DATA && mockResponse) {
    return { data: mockResponse, isDemo: true, error: null };
  }

  try {
    const data = await apiPost(endpoint, body);
    return { data, isDemo: false, error: null };
  } catch (error) {
    if (DEV_CONFIG.LOG_API_CALLS) {
      console.warn(`[MockHelper] POST failed for ${endpoint}: ${error.message}`);
    }
    if (mocksAllowed() && mockResponse) {
      return { data: mockResponse, isDemo: true, error: error.message };
    }
    return { data: null, isDemo: false, error: error.message };
  }
}

/**
 * Hook-friendly wrapper.
 *
 *   const [data, setData] = useState([]);
 *   const [isDemo, setIsDemo] = useState(false);
 *   const [error, setError] = useState(null);
 *   useEffect(() => {
 *     loadWithFallback('/endpoint', MOCK_DATA, setData, setIsDemo, { setError });
 *   }, []);
 *
 * Returns the same shape fetchWithFallback does, so a caller that wants to
 * handle the error itself can await it instead of passing setError.
 */
export async function loadWithFallback(endpoint, mockData, setData, setIsDemo, options = {}) {
  const { setError, ...fetchOptions } = options;
  const result = await fetchWithFallback(endpoint, mockData, fetchOptions);
  const { data, isDemo, error } = result;

  if (data) {
    // Handle the common API response shapes.
    const resolved = Array.isArray(data) ? data : (data.rows || data.data || data.results || data);
    setData(Array.isArray(resolved) ? resolved : [resolved]);
  } else {
    // Previously the caller's state was left untouched on failure, so a screen
    // kept whatever was on it and gave no sign the refresh had failed.
    setData([]);
  }

  if (setIsDemo) setIsDemo(isDemo);
  if (setError) setError(error);

  return result;
}
