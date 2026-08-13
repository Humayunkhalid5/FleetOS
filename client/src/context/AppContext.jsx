import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const AppContext = createContext(null);

const DEMO_ACCOUNTS = [
  { email: 'alex@fleetos.com', password: 'demo1234', role: 'customer', name: 'Alex Thompson', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDob1EAfuIbOEB4mJ8aEtGMOAqZ2pFY3XlqCk2JkHoW67b-ZOBUc5zFlRYqQ2BZ3DG67ncjfW2OLoo5hg7xuxYuAqd8Dnt5ilPQQXVTUmumtWf50x262r2EhICAmE-N5bwuBjLhajhwN27J-KOxykfXlTI8WYp4DU3gYg4J6dBnKMvJL7SnjiVZ4DXESV3KRM6gWcKX9-Ly_MH0qvOPlsnmmbJxlvGssOUoAAS512hpEREvE9kMnIHJ0g' },
  { email: 'swiftfleet@fleetos.com', password: 'fleet1234', role: 'company', name: 'SwiftFleet Admin', companyName: 'SwiftFleet Solutions', companyId: 'swiftfleet', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAjMDOQd3UrvrebrUcxX624kDq0FEAmqmVNdcG58u-9v18fx30yrnUAG8G4Ov5a7aitulaNFUI8OpyyA7dbK0LpatGOA9H1iDNhj154uoZ0ZRQ98hatThYWFI1V61HpwQrivZRYx3UUK2rXbDnWxgYmvcG82itzN6G3SaXdfnGqNHcAgZ__eJ-kYo7O9nabbf6BZODCYe6pnAKz1PNSBu_39u3u10eAP7e184NtsWVttuZU3DxVFpebjA' },
  { email: 'autopro@fleetos.com', password: 'fleet1234', role: 'company', name: 'AutoPro Manager', companyName: 'AutoPro Fleet Service', companyId: 'autopro-lahore', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAh4GZbR-yLXyOdjNvqZqkKENkOuReoToaxfgNzjlzDyAQVKq9mRbG-0XcDbbgVrGFZoEIHcvovHP8TXsuZnpW9N558jvsdE9af8ILmwtEbrwt7UZt55jcd-jMkyLpsaY4c6gY-HZO-SaG_zZToGgXtO8bwDuGarb4fkx7aE4PWxizhXfToTBCFyYkGU3TWHiUamqDLRb_3uUGZBhS992iB2UxeeprwctF-4fDqRd1cc5ccX_ZPQ2W57g' },
  { email: 'fastfix@fleetos.com', password: 'fleet1234', role: 'company', name: 'FastFix Admin', companyName: 'FastFix Heavy Repairs', companyId: 'fastfix-fleet', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD5AyVNVgU3fMKYE-w9lt2vv-p6eVQZIfg6Dptpx8JCaL4-6nGgTDHa_mj5-AzmY-uLMkGNTIrWAAerynADtJ0GHObDXf-Uvz2QwEZmKhyEfAT_nSugmPIYwE2PzjauysFb8q2M7FkZBzAsEoni28SOUIcacSdkVYpoGZSXujS0CoJH6dA1CzgzKSoZifnern2RmB6DcTx8hafQaxycXpqYrW7wzIfoLmmMKFf5mF_Dfl-KBvh47o2jsg' },
  { email: 'nexus@fleetos.com', password: 'fleet1234', role: 'company', name: 'Nexus Hub Lead', companyName: 'Nexus Logistics Hub', companyId: 'nexus-logistics', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDnCiWvnkOKQReJfbwVPnaN6tu7s5397gTYSVBPMyiX6toCf8p5wo3eRuZ2QIc2TqcZrm-1vI7JyRT7oqpSWXpAdRECBDCnRGuLQM6zGzCDYi5wegUEzJG2p7E7E7jfdx9hSCUUoveU458OaY-di3G4frMSjmTJwjSznLPYXVl_zY_nMTuD0q3drMrje1gMak8VTFXTBe687naWHZTIHqBAHuyZqtzAN7B6ZysOa9vPYFnRqmNuHtlY1A' },
  { email: 'apex@fleetos.com', password: 'fleet1234', role: 'company', name: 'Apex Care Manager', companyName: 'Apex Freight Care', companyId: 'apex-freight', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBdSq9kds-9hvrnwo749V1I2EinNun7_8MX5BIE5-IMKUNAe4eYNSZlRYfJsQoPN6Bhr_Si7Oj9uq3XH8CcF0q8t2BSjIFBI_5A248PGaEjKqs1N1rbNOcqGh-pFfZ5qZmC7dv0k7AJ0lOUJGzjeGN4P8Z_QnnObTriizg6iqp9D11hzs6aSOcdIpfpF8Q04gH3UJwNaz_BNK0OIH9K1hLW_V9CsATPDG8NQAVE-f5Eg0eDZhdoGe4WAg' }
];

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => {
    const cachedUser = localStorage.getItem('fleetos-user');
    if (cachedUser) {
      try { return JSON.parse(cachedUser); } catch { localStorage.removeItem('fleetos-user'); }
    }
    return null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('fleetos-token') || 'demo-token');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const persistAuth = (authToken, nextUser) => {
    localStorage.setItem('fleetos-token', authToken || 'demo-token');
    localStorage.setItem('fleetos-user', JSON.stringify(nextUser));
    setToken(authToken || 'demo-token');
    setUser(nextUser);
  };

  const login = async (email, password) => {
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', { email, password });
      const userObj = response.user;
      if (userObj.role === 'company' && !userObj.companyId) {
        userObj.companyId = userObj._id || userObj.companyName?.toLowerCase().replace(/\s+/g, '-') || 'company-' + Date.now();
      }
      persistAuth(response.token, userObj);
      setLoading(false);
      return userObj;
    } catch (err) {
      // Check pre-configured demo accounts as fallback
      const match = DEMO_ACCOUNTS.find(a => a.email.toLowerCase() === email.toLowerCase());
      if (match) {
        persistAuth('demo-token-123', match);
        setLoading(false);
        return match;
      }

      // Check custom registered users from localStorage
      const customUsers = JSON.parse(localStorage.getItem('fleetos-registered-users') || '[]');
      const registered = customUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (registered) {
        persistAuth('demo-token-custom', registered);
        setLoading(false);
        return registered;
      }

      const isCompany = email.toLowerCase().includes('company') || email.toLowerCase().includes('fleet') || email.toLowerCase().includes('dealer');
      const fallbackUser = {
        email,
        name: email.split('@')[0],
        companyName: email.split('@')[0] + ' Solutions',
        companyId: email.split('@')[0],
        role: isCompany ? 'company' : 'customer'
      };
      persistAuth('demo-token-fallback', fallbackUser);
      setLoading(false);
      return fallbackUser;
    }
  };

  const register = async (userData) => {
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/register', userData);
      const userObj = response.user;
      if (userObj.role === 'company' && !userObj.companyId) {
        userObj.companyId = userObj._id || userObj.companyName?.toLowerCase().replace(/\s+/g, '-') || 'company-' + Date.now();
      }
      persistAuth(response.token, userObj);
      setLoading(false);
      return userObj;
    } catch (err) {
      const newUser = {
        ...userData,
        id: `USR-${Date.now()}`,
        companyId: userData.companyName ? userData.companyName.toLowerCase().replace(/\s+/g, '-') : 'company-' + Date.now(),
        avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAh4GZbR-yLXyOdjNvqZqkKENkOuReoToaxfgNzjlzDyAQVKq9mRbG-0XcDbbgVrGFZoEIHcvovHP8TXsuZnpW9N558jvsdE9af8ILmwtEbrwt7UZt55jcd-jMkyLpsaY4c6gY-HZO-SaG_zZToGgXtO8bwDuGarb4fkx7aE4PWxizhXfToTBCFyYkGU3TWHiUamqDLRb_3uUGZBhS992iB2UxeeprwctF-4fDqRd1cc5ccX_ZPQ2W57g'
      };
      const customUsers = JSON.parse(localStorage.getItem('fleetos-registered-users') || '[]');
      customUsers.push(newUser);
      localStorage.setItem('fleetos-registered-users', JSON.stringify(customUsers));

      persistAuth('demo-token-reg', newUser);
      setLoading(false);
      return newUser;
    }
  };

  const updateProfile = async (updates) => {
    setError('');
    const updatedUser = { ...user, ...updates };
    localStorage.setItem('fleetos-user', JSON.stringify(updatedUser));
    setUser(updatedUser);

    try {
      await api.put('/auth/profile', updates);
    } catch {
      /* local updated */
    }
    return updatedUser;
  };

  const logout = () => {
    localStorage.removeItem('fleetos-token');
    localStorage.removeItem('fleetos-user');
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    const cachedToken = localStorage.getItem('fleetos-token');
    if (!cachedToken) {
      setLoading(false);
    }
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, error, login, register, updateProfile, logout }),
    [user, token, loading, error]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  return useContext(AppContext);
}
