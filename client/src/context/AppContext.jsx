import { useEffect, useMemo, useState, useCallback } from 'react';
import api, { clearSessionToken, saveSessionToken } from '../services/api';
import AppContext from './appContextValue';

export function AppProvider({ children, expectedRole }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Customer and company accounts keep separate sessions. Re-check the active
  // session whenever a visitor moves between the two protected areas.
  useEffect(() => {
    let active = true;
    api.get('/auth/me', { noCache: true })
      .then(({ user: currentUser }) => {
        if (!active) return;
        // Never let a session from the other portal take over this route on a
        // refresh. This also cleans up legacy single-token browser sessions.
        if (currentUser?.role !== expectedRole) {
          clearSessionToken(expectedRole);
          setUser(null);
          return;
        }
        setUser(currentUser);
      })
      .catch(() => {
        clearSessionToken(expectedRole);
        if (active) setUser(null);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [expectedRole]);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.token) saveSessionToken(response.user.role, response.token);
      setUser(response.user);
      return response.user;
    } catch (requestError) {
      setError(requestError.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (userData) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/auth/register', userData);
      if (response.token) saveSessionToken(response.user.role, response.token);
      setUser(response.user);
      return response.user;
    } catch (requestError) {
      setError(requestError.message);
      throw requestError;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (updates) => {
    setError('');
    const response = await api.put('/auth/profile', updates);
    setUser(response.user);
    return response.user;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout', {}); } finally {
      api.clearCache();
      clearSessionToken();
      setUser(null);
    }
  }, []);

  const value = useMemo(() => ({ user, loading, error, login, register, updateProfile, logout }), [user, loading, error, login, register, updateProfile, logout]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
