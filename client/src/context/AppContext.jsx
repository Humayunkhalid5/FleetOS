import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import api from '../services/api';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/auth/me', { noCache: true })
      .then(({ user: currentUser }) => { if (active) setUser(currentUser); })
      .catch(() => {
        localStorage.removeItem('fleetos-token');
        if (active) setUser(null);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.token) localStorage.setItem('fleetos-token', response.token);
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
      if (response.token) localStorage.setItem('fleetos-token', response.token);
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
      localStorage.removeItem('fleetos-token');
      setUser(null);
    }
  }, []);

  const value = useMemo(() => ({ user, loading, error, login, register, updateProfile, logout }), [user, loading, error, login, register, updateProfile, logout]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  return useContext(AppContext);
}
