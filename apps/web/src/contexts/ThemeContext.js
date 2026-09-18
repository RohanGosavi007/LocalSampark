'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

/**
 * The single owner of theme state for the web app.
 *
 * Before this rewrite there were three mechanisms writing to two different
 * localStorage keys:
 *
 *   1. the pre-hydration script in app/layout.js   → key "theme"
 *   2. this context                                 → key "localsampark_theme"
 *   3. the theme slice of store/uiStore.js          → key "theme"
 *
 * Nothing ever wrote key 2. So this provider's effect always fell through to
 * its else-branch and set data-theme="dark" on <html> unconditionally, seconds
 * after hydration — which silently overrode whatever the user had just chosen
 * and is why Bright Mode appeared to do nothing. Reproduced in a browser: with
 * theme=light stored, the page painted light and then snapped back to
 * rgb(6,11,24) on 2 of 3 runs. It was a race, so on a slow device it lost every
 * time.
 *
 * The fix is ownership, not a patched condition. One key, one writer, and all
 * three DOM markers written together so Tailwind's `dark:` variants
 * (darkMode: 'class' → <html class="dark">), the CSS custom properties
 * (<html data-theme>), and the ~40 legacy `body.dark-mode` rules in globals.css
 * can never disagree about which theme is active.
 */

export const THEME_STORAGE_KEY = 'theme';

/** What the user picked. 'system' defers to the OS and tracks it live. */
const PREFERENCES = ['light', 'dark', 'system'];

const ThemeContext = createContext(null);

function systemPrefersDark() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Apply a resolved theme to the document.
 *
 * Exported because app/layout.js inlines the same logic in a pre-hydration
 * script — the two must stay in step, and keeping them in one file is how that
 * stays obvious. Writing all three markers in one function is the whole point.
 */
export function applyTheme(resolved) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const isDark = resolved === 'dark';

  root.classList.toggle('dark', isDark);
  root.setAttribute('data-theme', resolved);

  if (document.body) {
    document.body.classList.toggle('dark-mode', isDark);
    document.body.classList.toggle('light-mode', !isDark);
  }

  // Colours the browser chrome (address bar on Android, form controls) to
  // match. Without it the status bar stays light over a dark page.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', isDark ? '#0F1520' : '#F6F8FB');
}

function readStoredPreference() {
  if (typeof window === 'undefined') return 'system';
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    return PREFERENCES.includes(saved) ? saved : 'system';
  } catch {
    // Private mode, or storage blocked. Falling back to system is correct:
    // the choice just does not persist.
    return 'system';
  }
}

export function ThemeProvider({ children }) {
  // Server and first client render must agree, so both start from 'system'.
  // The pre-hydration script has already painted the right theme by now; this
  // state catches up in the effect below without ever repainting.
  const [preference, setPreference] = useState('system');
  const [resolved, setResolved] = useState('light');

  useEffect(() => {
    const stored = readStoredPreference();
    setPreference(stored);
    const next = stored === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : stored;
    setResolved(next);
    applyTheme(next);
  }, []);

  // Track the OS setting while the preference is 'system'. Without this,
  // choosing system would only sample the OS once per page load.
  useEffect(() => {
    if (preference !== 'system') return undefined;
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;

    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event) => {
      const next = event.matches ? 'dark' : 'light';
      setResolved(next);
      applyTheme(next);
    };

    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [preference]);

  /**
   * Set the preference. No page reload: the old Header toggle called
   * window.location.reload(), which threw away cart state, scroll position and
   * every in-flight request just to change a colour.
   */
  const setThemePreference = useCallback((next) => {
    if (!PREFERENCES.includes(next)) return;

    setPreference(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Not persisting is survivable; not applying is not.
    }

    const effective = next === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : next;
    setResolved(effective);
    applyTheme(effective);
  }, []);

  /** Flip light ↔ dark. From 'system' it flips away from whatever the OS says. */
  const toggleTheme = useCallback(() => {
    setThemePreference(resolved === 'dark' ? 'light' : 'dark');
  }, [resolved, setThemePreference]);

  const value = useMemo(
    () => ({
      /** 'light' | 'dark' | 'system' — what the user chose. */
      preference,
      /** 'light' | 'dark' — what is actually on screen. Use this for rendering. */
      resolvedTheme: resolved,
      isDark: resolved === 'dark',
      setTheme: setThemePreference,
      toggleTheme,
      /** Kept so existing callers reading `theme` keep working. */
      theme: resolved,
    }),
    [preference, resolved, setThemePreference, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Returns a working object even outside a provider, so a component rendered in
 * isolation (tests, Storybook, an error boundary above the provider) does not
 * crash on `const { isDark } = useTheme()`.
 */
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (ctx) return ctx;
  return {
    preference: 'system',
    resolvedTheme: 'light',
    isDark: false,
    theme: 'light',
    setTheme: () => {},
    toggleTheme: () => {},
  };
}

export default ThemeContext;
