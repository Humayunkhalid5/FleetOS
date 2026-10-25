import { useEffect, useMemo, useState, useCallback } from 'react';
import api, { clearSessionToken, getActiveSessionToken, saveSessionToken } from '../services/api';
import { clearQueryCache } from '../hooks/useLiveQuery';
import AppContext from './appContextValue';

// Signed-in users are remembered per role for the life of the tab so moving
// between the public site and a portal never flashes a loading screen; the
// session is still re-verified with the server in the background.
const sessionCache = { customer: undefined, company: undefined };

export function AppProvider({ children, expectedRole }) {
  const cached = sessionCache[expectedRole];
  const [user, setUser] = useState(cached || null);
  const [loading, setLoading] = useState(cached === undefined && Boolean(getActiveSessionToken(expectedRole)) );
  const [error, setError] = useState('');

  const remember = useCallback((role, value) => { sessionCache[role] = value; }, []);

  useEffect(() => {
    let active = true;
    // With no token for this portal, `loading` starts false (see useState
    // above): still ask the server (cookie sessions), without blocking the UI.
    api.get('/auth/me', { noCache: true })
      .then(({ user: currentUser }) => {
        if (!active) return;
        // Never let a session from the other portal take over this route.
        if (currentUser?.role !== expectedRole) {
          if (getActiveSessionToken(expectedRole)) clearSessionToken(expectedRole);
          remember(expectedRole, null);
          setUser(null);
          return;
        }
        remember(expectedRole, currentUser);
        setUser(currentUser);
      })
      .catch(() => {
        if (!active) return;
        clearSessionToken(expectedRole);
        remember(expectedRole, null);
        setUser(null);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [expectedRole, remember]);

  const login = useCallback(async (email, password) => {
    setError('');
    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.token) saveSessionToken(response.user.role, response.token);
      remember(response.user.role, response.user);
      if (response.user.role === expectedRole) setUser(response.user);
      return response.user;
    } catch (requestError) {
      setError(requestError.message);
      return null;
    }
  }, [expectedRole, remember]);

  const register = useCallback(async (userData) => {
    setError('');
    try {
      const response = await api.post('/auth/register', userData);
      if (response.token) saveSessionToken(response.user.role, response.token);
      remember(response.user.role, response.user);
      if (response.user.role === expectedRole) setUser(response.user);
      return response.user;
    } catch (requestError) {
      setError(requestError.message);
      throw requestError;
    }
  }, [expectedRole, remember]);

  const refreshUser = useCallback(async () => {
    const { user: currentUser } = await api.get('/auth/me', { noCache: true });
    if (currentUser?.role === expectedRole) { remember(expectedRole, currentUser); setUser(currentUser); }
    return currentUser;
  }, [expectedRole, remember]);

  const updateProfile = useCallback(async (updates) => {
    setError('');
    const response = await api.put('/auth/profile', updates);
    remember(expectedRole, response.user);
    setUser(response.user);
    return response.user;
  }, [expectedRole, remember]);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout', {}); } catch { /* already signed out */ } finally {
      api.clearCache();
      clearQueryCache();
      clearSessionToken(expectedRole);
      remember(expectedRole, null);
      setUser(null);
    }
  }, [expectedRole, remember]);

  const value = useMemo(() => ({ user, loading, error, login, register, updateProfile, refreshUser, logout }), [user, loading, error, login, register, updateProfile, refreshUser, logout]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
