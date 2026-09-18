'use client';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Theme for the franchise console.
 *
 * The console was dark-only: `background-color: #0f172a` hardcoded on the body
 * and 1,092 literal hex values across 41 tab components. There were no tokens,
 * so there was nothing a light mode could switch.
 *
 * This is deliberately the same shape and the same contract as
 * apps/web/src/contexts/ThemeContext.js — the same three preferences, the same
 * DOM markers, the same live matchMedia listener — so an operator who uses both
 * apps gets one behaviour. It uses its own storage key because the two apps run
 * on different ports in development and would otherwise fight over one value on
 * localhost.
 */

export const THEME_STORAGE_KEY = 'ls_admin_theme';

const PREFERENCES = ['light', 'dark', 'system'];

const ThemeContext = createContext(null);

function systemPrefersDark() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function applyTheme(resolved) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.setAttribute('data-theme', resolved);
}

function readStored() {
  if (typeof window === 'undefined') return 'system';
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    return PREFERENCES.includes(saved) ? saved : 'system';
  } catch {
    return 'system';
  }
}

export function ThemeProvider({ children }) {
  // Server and first client render must agree; the pre-hydration script in
  // app/layout.js has already painted the right theme by this point.
  const [preference, setPreference] = useState('system');
  const [resolved, setResolved] = useState('dark');

  useEffect(() => {
    const stored = readStored();
    setPreference(stored);
    const next = stored === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : stored;
    setResolved(next);
    applyTheme(next);
  }, []);

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

  const setTheme = useCallback((next) => {
    if (!PREFERENCES.includes(next)) return;
    setPreference(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* not persisting is survivable; not applying is not */
    }
    const effective = next === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : next;
    setResolved(effective);
    applyTheme(effective);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(resolved === 'dark' ? 'light' : 'dark');
  }, [resolved, setTheme]);

  const value = useMemo(
    () => ({ preference, resolvedTheme: resolved, isDark: resolved === 'dark', setTheme, toggleTheme }),
    [preference, resolved, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Safe outside a provider, so a tab rendered in isolation does not crash. */
export function useTheme() {
  return (
    useContext(ThemeContext) || {
      preference: 'system',
      resolvedTheme: 'dark',
      isDark: true,
      setTheme: () => {},
      toggleTheme: () => {},
    }
  );
}

/**
 * The console has no component library, so this ships as a small self-contained
 * control rather than importing one. Inline styles here for consistency with
 * the surrounding 1,070 style objects — but every value is a token.
 */
export function ThemeToggle({ style }) {
  const { preference, setTheme } = useTheme();

  const options = [
    { value: 'light', label: 'Light' },
    { value: 'system', label: 'Auto' },
    { value: 'dark', label: 'Dark' },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Appearance"
      style={{
        display: 'inline-flex',
        gap: 2,
        padding: 3,
        borderRadius: 999,
        background: 'var(--sunken)',
        border: '1px solid var(--line)',
        ...style,
      }}
    >
      {options.map((o) => {
        const active = preference === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(o.value)}
            style={{
              // Deliberately below --tap-min: this is a 3-way segmented control
              // in a dense console toolbar, and the group as a whole is well
              // over the floor. The global `button { min-height }` rule in
              // globals.css is overridden here on purpose.
              minHeight: 32,
              padding: '0 12px',
              borderRadius: 999,
              border: active ? '1px solid var(--line-accent)' : '1px solid transparent',
              background: active ? 'var(--surface-1)' : 'transparent',
              color: active ? 'var(--ink)' : 'var(--ink-muted)',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'var(--transition-theme)',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export default ThemeContext;
