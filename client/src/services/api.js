const cache = new Map();
const CACHE_TTL_MS = 3000;
const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

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
      ...(localStorage.getItem('fleetos-token') ? { Authorization: `Bearer ${localStorage.getItem('fleetos-token')}` } : {}),
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
