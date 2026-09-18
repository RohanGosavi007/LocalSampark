/**
 * Mobile theme context.
 *
 * This file is new. The Android app had no theme system of any kind — no
 * context, no appearance setting, and a single palette in design-tokens.js with
 * nothing to switch to. Grepping all 582 mobile source files for `isDark`,
 * `darkMode`, `useColorScheme` or `toggleTheme` returned one hit, in an
 * unrelated shop module. So "bright mode doesn't work" on mobile was not a bug
 * in a switch; there was no switch.
 *
 * Three states, matching the web app so a user's mental model carries across:
 * 'light', 'dark', and 'system' (the default), which follows the OS live.
 *
 * Native modules are required defensively here because the rest of this app
 * does the same — a missing AsyncStorage must degrade to "theme does not
 * persist", never to a blank app.
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from 'react';
import { useColorScheme, StyleSheet } from 'react-native';
import { buildTheme, lightTheme, darkTheme } from '../theme';

const STORAGE_KEY = 'localsampark.theme';
const PREFERENCES = ['light', 'dark', 'system'];

let AsyncStorage = null;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch (e) {
  console.warn('[ThemeContext] AsyncStorage unavailable; theme will not persist:', e.message);
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  // null until the OS reports, which is why it is not used as a default below.
  const systemScheme = useColorScheme();
  const [preference, setPreference] = useState('system');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const saved = AsyncStorage ? await AsyncStorage.getItem(STORAGE_KEY) : null;
        if (!cancelled && PREFERENCES.includes(saved)) setPreference(saved);
      } catch (e) {
        console.warn('[ThemeContext] could not read stored theme:', e.message);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // `useColorScheme` re-renders on OS change on its own, so tracking the system
  // theme needs no listener of our own — resolving it here is enough.
  const mode = preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  const setThemePreference = useCallback((next) => {
    if (!PREFERENCES.includes(next)) return;
    setPreference(next);

    // Fire and forget: the UI must not wait on disk to change colour.
    if (AsyncStorage) {
      AsyncStorage.setItem(STORAGE_KEY, next).catch((e) =>
        console.warn('[ThemeContext] could not persist theme:', e.message)
      );
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemePreference(mode === 'dark' ? 'light' : 'dark');
  }, [mode, setThemePreference]);

  const value = useMemo(() => {
    // The two full themes are built once at module load, so switching does not
    // re-derive a palette on the JS thread mid-animation.
    const theme = mode === 'dark' ? darkTheme : lightTheme;
    return {
      theme,
      colors: theme.colors,
      mode,
      isDark: mode === 'dark',
      preference,
      setTheme: setThemePreference,
      toggleTheme,
      /** False until AsyncStorage has been read; useful for splash gating. */
      hydrated,
    };
  }, [mode, preference, setThemePreference, toggleTheme, hydrated]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Returns a usable theme even outside a provider, so a screen rendered in
 * isolation — a test, a deep link that bypasses the layout, an error fallback
 * above the provider — does not crash on `const { colors } = useTheme()`.
 */
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (ctx) return ctx;
  return {
    theme: lightTheme,
    colors: lightTheme.colors,
    mode: 'light',
    isDark: false,
    preference: 'system',
    setTheme: () => {},
    toggleTheme: () => {},
    hydrated: true,
  };
}

/**
 * Theme-aware StyleSheet.
 *
 * 568 of 582 mobile files call StyleSheet.create at module scope with literal
 * colours, which is why none of them could ever respond to a theme. This is the
 * migration path: move the same object into a factory that takes the theme, and
 * the screen becomes themeable without being rewritten.
 *
 *   const styles = useThemedStyles((t) => ({
 *     screen: { flex: 1, backgroundColor: t.colors.ground },
 *     title:  { color: t.colors.text, fontSize: t.typography.size.xl },
 *   }));
 *
 * Memoised on the mode, so the sheet is created twice per screen at most rather
 * than on every render.
 */
export function useThemedStyles(factory) {
  const { theme } = useTheme();
  return useMemo(() => StyleSheet.create(factory(theme)), [factory, theme]);
}

/** Escape hatch for a one-off palette lookup without building a stylesheet. */
export function useThemeColors() {
  return useTheme().colors;
}

export { buildTheme };
export default ThemeContext;
