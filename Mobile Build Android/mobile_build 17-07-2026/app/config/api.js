import { apiGet, apiPost, apiPut, apiDelete, API_URL as API_BASE_URL, API_BASE } from '../../src/lib/api';

export const API_V1 = API_BASE;
export { API_BASE_URL, API_BASE };

// Wrapper to preserve the old { success, data, status } shape for legacy files
const wrap = async (promise) => {
  try {
    const json = await promise;
    return { success: true, data: json, status: 200 };
  } catch (err) {
    return { success: false, data: null, error: err.message };
  }
};

export const legacyApiGet = (endpoint) => wrap(apiGet(endpoint));
export const legacyApiPost = (endpoint, body) => wrap(apiPost(endpoint, body));
export const legacyApiPut = (endpoint, body) => wrap(apiPut(endpoint, body));
export const legacyApiDelete = (endpoint) => wrap(apiDelete(endpoint));

// Export a default object for files doing `api.get()`
export default {
  get: legacyApiGet,
  post: legacyApiPost,
  put: legacyApiPut,
  delete: legacyApiDelete
};

// Also export the named ones matching the old names
export { 
  legacyApiGet as apiGet, 
  legacyApiPost as apiPost, 
  legacyApiPut as apiPut, 
  legacyApiDelete as apiDelete 
};
