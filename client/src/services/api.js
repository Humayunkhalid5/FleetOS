// ---------------------------------------------------------------------------
// FleetOS Client Portal — API service (fetch wrapper with JWT auth support)
// ---------------------------------------------------------------------------

const getToken = () => localStorage.getItem('fleetos-token');

const buildUrl = (endpoint) => (endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`);

const cache = new Map();
const CACHE_TTL_MS = 3000;

const request = async (endpoint, options = {}) => {
  const token = getToken();

  // Cache lookup for GET requests unless options.noCache is set
  const method = options.method || 'GET';
  const url = buildUrl(endpoint);
  const cacheKey = `${method}:${url}:${token || 'anon'}`;

  if (method === 'GET' && !options.noCache) {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  } else if (method !== 'GET') {
    cache.clear();
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 401 by clearing stale token
  if (response.status === 401 && token) {
    localStorage.removeItem('fleetos-token');
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  if (method === 'GET' && !options.noCache) {
    cache.set(cacheKey, { timestamp: Date.now(), data });
  }

  return data;
};

const api = {
  get: (endpoint, options = {}) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) =>
    request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    }),
  put: (endpoint, body, options = {}) =>
    request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  patch: (endpoint, body, options = {}) =>
    request(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  del: (endpoint, options = {}) => request(endpoint, { ...options, method: 'DELETE' }),
};

export default api;

