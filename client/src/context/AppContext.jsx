import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => {
    const cachedUser = localStorage.getItem('fleetos-user');
    if (cachedUser) {
      try {
        return JSON.parse(cachedUser);
      } catch {
        localStorage.removeItem('fleetos-user');
      }
    }
    return null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('fleetos-token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const persistAuth = (authToken, nextUser) => {
    if (authToken) {
      localStorage.setItem('fleetos-token', authToken);
      setToken(authToken);
    }
    if (nextUser) {
      localStorage.setItem('fleetos-user', JSON.stringify(nextUser));
      setUser(nextUser);
    }
  };

  const login = async (email, password) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/auth/login', { email, password });
      persistAuth(response.token, response.user);
      return response.user;
    } catch (err) {
      setError(err.message || 'Unable to sign in');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/auth/register', userData);
      persistAuth(response.token, response.user);
      return response.user;
    } catch (err) {
      setError(err.message || 'Unable to create account');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates) => {
    setError('');
    try {
      const response = await api.put('/auth/profile', updates);
      localStorage.setItem('fleetos-user', JSON.stringify(response.user));
      setUser(response.user);
      return response.user;
    } catch (err) {
      setError(err.message || 'Unable to update profile');
      return null;
    }
  };

  const logout = () => {
    localStorage.removeItem('fleetos-token');
    localStorage.removeItem('fleetos-user');
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    const cachedToken = localStorage.getItem('fleetos-token');

    const bootstrapSession = async () => {
      if (!cachedToken) {
        setLoading(false);
        return;
      }
      try {
        const response = await api.get('/auth/me');
        localStorage.setItem('fleetos-user', JSON.stringify(response.user));
        setUser(response.user);
      } catch (err) {
        // Token invalid/expired — clear
        localStorage.removeItem('fleetos-token');
        localStorage.removeItem('fleetos-user');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    bootstrapSession();
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, error, login, register, updateProfile, logout }),
    [user, token, loading, error]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppContext() {
  return useContext(AppContext);
}

