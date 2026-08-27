const cache = new Map();
const CACHE_TTL_MS = 3000;
const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

// Client and company portal pages share the same React host, so a single
// localStorage token would make the latest login replace the other portal's
// identity. Keep the two role sessions isolated and select one by route.
const activeRole = () => (typeof window !== 'undefined' && window.location.pathname.startsWith('/company') ? 'company' : 'customer');
const tokenKey = (role = activeRole()) => `fleetos-${role}-token`;
export const getActiveSessionToken = () => localStorage.getItem(tokenKey()) || '';
export const saveSessionToken = (role, token) => {
  if (token) localStorage.setItem(tokenKey(role), token);
  // Remove the legacy shared token so it can never override a role session.
  localStorage.removeItem('fleetos-token');
};
export const clearSessionToken = (role = activeRole()) => {
  localStorage.removeItem(tokenKey(role));
  localStorage.removeItem('fleetos-token');
};

const buildUrl = (endpoint) => {
  const path = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
  if (!API_BASE_URL) return path;
  return API_BASE_URL.endsWith('/api') ? `${API_BASE_URL}${path.replace(/^\/api/, '')}` : `${API_BASE_URL}${path}`;
};

async function request(endpoint, options = {}) {
  const method = options.method || 'GET';
  const url = buildUrl(endpoint);
  const cacheKey = `${method}:${url}`;
  if (method === 'GET' && !options.noCache) {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) return cached.data;
  } else {
    cache.clear();
  }

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(getActiveSessionToken() ? { Authorization: `Bearer ${getActiveSessionToken()}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.message || 'Request failed');
    error.status = response.status;
    error.requestId = data?.requestId;
    throw error;
  }
  if (method === 'GET' && !options.noCache) cache.set(cacheKey, { timestamp: Date.now(), data });
  return data;
}

const api = {
  get: (endpoint, options = {}) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  patch: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
  del: (endpoint, options = {}) => request(endpoint, { ...options, method: 'DELETE' }),
  clearCache: () => cache.clear(),
};

export default api;
