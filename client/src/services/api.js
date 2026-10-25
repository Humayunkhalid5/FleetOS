const cache = new Map();
const CACHE_TTL_MS = 3000;
const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

// Client and company portal pages share the same React host, so a single
// localStorage token would make the latest login replace the other portal's
// identity. Keep the two role sessions isolated and select one by route.
const activeRole = () => (typeof window !== 'undefined' && window.location.pathname.startsWith('/company') && window.location.pathname !== '/company/register' ? 'company' : 'customer');
const tokenKey = (role = activeRole()) => `fleetos-${role}-token`;
const safeStorage = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch { /* storage unavailable */ } },
  remove(key) { try { localStorage.removeItem(key); } catch { /* storage unavailable */ } },
};

export const getActiveSessionToken = (role) => safeStorage.get(tokenKey(role)) || '';
export const saveSessionToken = (role, token) => {
  if (token) safeStorage.set(tokenKey(role), token);
  // Remove the legacy shared token so it can never override a role session.
  safeStorage.remove('fleetos-token');
};
export const clearSessionToken = (role = activeRole()) => {
  safeStorage.remove(tokenKey(role));
  safeStorage.remove('fleetos-token');
};

/** Base URL for Socket.IO — same origin by default (Vite proxies /socket.io). */
export const realtimeUrl = () => API_BASE_URL.replace(/\/api$/, '') || window.location.origin;

export const buildUrl = (endpoint) => {
  const path = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
  if (!API_BASE_URL) return path;
  return API_BASE_URL.endsWith('/api') ? `${API_BASE_URL}${path.replace(/^\/api/, '')}` : `${API_BASE_URL}${path}`;
};

// Listeners notified after every successful write, so mounted screens can
// revalidate and nobody ever needs to reload a page to see their change.
const mutationListeners = new Set();
export const onMutation = (listener) => {
  mutationListeners.add(listener);
  return () => mutationListeners.delete(listener);
};

async function request(endpoint, options = {}) {
  const method = options.method || 'GET';
  const url = buildUrl(endpoint);
  const cacheKey = `${method}:${url}:${activeRole()}`;
  if (method === 'GET' && !options.noCache) {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) return cached.data;
  } else if (method !== 'GET') {
    cache.clear();
  }

  let response;
  try {
    response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(getActiveSessionToken() ? { Authorization: `Bearer ${getActiveSessionToken()}` } : {}),
        ...(options.headers || {}),
      },
    });
  } catch {
    const error = new Error('Cannot reach the FleetOS server. Check your connection and try again.');
    error.status = 0;
    throw error;
  }
  const data = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.message || `Request failed (${response.status})`);
    error.status = response.status;
    error.requestId = data?.requestId;
    throw error;
  }
  if (method === 'GET' && !options.noCache) cache.set(cacheKey, { timestamp: Date.now(), data });
  if (method !== 'GET' && !endpoint.startsWith('/auth/')) {
    mutationListeners.forEach((listener) => { try { listener({ method, endpoint }); } catch { /* ignore */ } });
  }
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
