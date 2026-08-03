import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api';
import { DEV_CONFIG } from '../config/devMode';

/**
 * Smart API wrapper that attempts real API calls first,
 * then falls back to provided mock data when the API fails.
 * Tracks whether mock data is being used for DemoBadge display.
 * 
 * Usage:
 *   const { data, isDemo } = await fetchWithFallback('/shops', MOCK_SHOPS);
 */
export async function fetchWithFallback(endpoint, mockData = null, options = {}) {
  // If forced mock mode, skip API entirely
  if (DEV_CONFIG.FORCE_MOCK_DATA && mockData) {
    if (DEV_CONFIG.LOG_API_CALLS) {
      console.log(`[MockHelper] FORCED MOCK for ${endpoint}`);
    }
    return { data: mockData, isDemo: true, error: null };
  }

  try {
    const data = await apiGet(endpoint, options);
    
    // Check if API returned empty/null — use mock as fallback
    const isEmpty = !data || (Array.isArray(data) && data.length === 0) || 
                    (data.rows && data.rows.length === 0);
    
    if (isEmpty && mockData) {
      if (DEV_CONFIG.LOG_API_CALLS) {
        console.log(`[MockHelper] API returned empty for ${endpoint}, using mock fallback`);
      }
      return { data: mockData, isDemo: true, error: null };
    }

    return { data, isDemo: false, error: null };
  } catch (error) {
    if (DEV_CONFIG.LOG_API_CALLS) {
      console.warn(`[MockHelper] API failed for ${endpoint}: ${error.message}, using mock fallback`);
    }
    
    if (mockData) {
      return { data: mockData, isDemo: true, error: error.message };
    }
    
    return { data: null, isDemo: false, error: error.message };
  }
}

/**
 * Smart POST wrapper with mock fallback
 * For forms/actions that submit data to the backend.
 */
export async function postWithFallback(endpoint, body, mockResponse = null) {
  if (DEV_CONFIG.FORCE_MOCK_DATA && mockResponse) {
    return { data: mockResponse, isDemo: true, error: null };
  }

  try {
    const data = await apiPost(endpoint, body);
    return { data, isDemo: false, error: null };
  } catch (error) {
    if (DEV_CONFIG.LOG_API_CALLS) {
      console.warn(`[MockHelper] POST failed for ${endpoint}: ${error.message}`);
    }
    if (mockResponse) {
      return { data: mockResponse, isDemo: true, error: error.message };
    }
    return { data: null, isDemo: false, error: error.message };
  }
}

/**
 * Hook-friendly wrapper: returns a fetcher function and demo state
 * Usage in useEffect:
 *   const [data, setData] = useState([]);
 *   const [isDemo, setIsDemo] = useState(false);
 *   useEffect(() => {
 *     loadWithFallback('/endpoint', MOCK_DATA, setData, setIsDemo);
 *   }, []);
 */
export async function loadWithFallback(endpoint, mockData, setData, setIsDemo, options = {}) {
  const { data, isDemo } = await fetchWithFallback(endpoint, mockData, options);
  if (data) {
    // Handle common API response patterns
    const resolved = Array.isArray(data) ? data : (data.rows || data.data || data.results || data);
    setData(Array.isArray(resolved) ? resolved : [resolved]);
  }
  if (setIsDemo) setIsDemo(isDemo);
}
