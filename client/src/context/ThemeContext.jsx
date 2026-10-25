import { useCallback, useEffect, useMemo, useState } from 'react';
import ThemeContext from './themeContextValue';

const STORAGE_KEY = 'fleetos-theme';

function readStored() {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

function systemTheme() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.classList.toggle('dark', theme === 'dark');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#060B15' : '#F4F7FA');
}

export function ThemeProvider({ children }) {
  // index.html applies the stored/system theme before first paint; this state
  // simply mirrors it so there is never a light flash on a dark reload.
  const [theme, setThemeState] = useState(() => readStored() || systemTheme());
  const [explicit, setExplicit] = useState(() => Boolean(readStored()));

  useEffect(() => { applyTheme(theme); }, [theme]);

  // Follow the operating-system setting until the person picks a theme.
  useEffect(() => {
    if (explicit || !window.matchMedia) return undefined;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event) => setThemeState(event.matches ? 'dark' : 'light');
    query.addEventListener?.('change', onChange);
    return () => query.removeEventListener?.('change', onChange);
  }, [explicit]);

  const setTheme = useCallback((next) => {
    const root = document.documentElement;
    root.classList.add('theme-transition');
    window.setTimeout(() => root.classList.remove('theme-transition'), 400);
    setThemeState(next);
    setExplicit(true);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* private mode */ }
  }, []);

  const toggleTheme = useCallback(() => setTheme(theme === 'dark' ? 'light' : 'dark'), [setTheme, theme]);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
