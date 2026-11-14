const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en' }],
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
}));

describe('[P12] Mobile Regional Languages & Persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('[P12.8] en, hi and mr dictionaries have identical keys and non-empty translations', () => {
    const { translations } = require('../src/i18n');
    const enKeys = Object.keys(translations.en).sort();
    expect(enKeys.length).toBeGreaterThanOrEqual(50);
    expect(Object.keys(translations.hi).sort()).toEqual(enKeys);
    expect(Object.keys(translations.mr).sort()).toEqual(enKeys);

    for (const key of enKeys) {
      expect(typeof translations.en[key]).toBe('string');
      expect(translations.en[key].trim().length).toBeGreaterThan(0);
      expect(typeof translations.hi[key]).toBe('string');
      expect(translations.hi[key].trim().length).toBeGreaterThan(0);
      expect(typeof translations.mr[key]).toBe('string');
      expect(translations.mr[key].trim().length).toBeGreaterThan(0);
    }
  });

  test('[P12.9] normalizeLanguage maps locale tags and unsupported codes safely', () => {
    const { normalizeLanguage } = require('../src/i18n');
    expect(normalizeLanguage('hi-IN')).toBe('hi');
    expect(normalizeLanguage('mr-IN')).toBe('mr');
    expect(normalizeLanguage('en-US')).toBe('en');
    expect(normalizeLanguage('fr')).toBe('en');
    expect(normalizeLanguage(null)).toBe('en');
  });

  test('[P12.10] LanguageProvider loads saved locale and persists updates via AsyncStorage', async () => {
    jest.resetModules();

    let stateValues = [];
    let stateCursor = 0;
    const pendingEffects = [];
    let currentContextValue = null;

    jest.doMock('react', () => ({
      createContext: (defaultValue) => ({
        _currentValue: defaultValue,
        Provider: ({ value, children }) => {
          currentContextValue = value;
          return children || null;
        },
      }),
      useContext: () => currentContextValue,
      useState: (initial) => {
        const idx = stateCursor++;
        if (!(idx in stateValues)) {
          stateValues[idx] = typeof initial === 'function' ? initial() : initial;
        }
        const setter = (next) => {
          stateValues[idx] = typeof next === 'function' ? next(stateValues[idx]) : next;
        };
        return [stateValues[idx], setter];
      },
      useEffect: (fn) => {
        pendingEffects.push(fn);
      },
      useCallback: (fn) => fn,
      createElement: (type, props, ...children) => {
        if (typeof type === 'function') {
          return type({ ...(props || {}), children });
        }
        return { type, props, children };
      },
    }));

    const AsyncStorage = require('@react-native-async-storage/async-storage');
    AsyncStorage.getItem.mockResolvedValueOnce('hi');

    const { translations } = require('../src/i18n');
    const { LanguageProvider, LANGUAGE_STORAGE_KEY } = require('../src/context/LanguageContext');

    const renderProvider = () => {
      stateCursor = 0;
      LanguageProvider({ children: null });
    };

    renderProvider();
    expect(pendingEffects.length).toBeGreaterThan(0);
    const cleanup = pendingEffects.shift()();
    await new Promise((resolve) => setImmediate(resolve));

    renderProvider();
    expect(AsyncStorage.getItem).toHaveBeenCalledWith(LANGUAGE_STORAGE_KEY);
    expect(currentContextValue.language).toBe('hi');
    expect(currentContextValue.t('regional_languages')).toBe(translations.hi.regional_languages);

    await currentContextValue.setLanguage('mr');
    renderProvider();

    expect(currentContextValue.language).toBe('mr');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(LANGUAGE_STORAGE_KEY, 'mr');
    expect(currentContextValue.t('regional_languages')).toBe(translations.mr.regional_languages);

    if (typeof cleanup === 'function') cleanup();
    jest.dontMock('react');
  });

  test('[P12.11] LanguagesScreen, MoreScreen, SettingsScreen and TabLayout are wired to useLanguage', () => {
    const langScreen = read('app/modules/languages/index.js');
    expect(langScreen).toMatch(/useLanguage/);
    expect(langScreen).toMatch(/setLanguage\s*\(/);

    const moreScreen = read('app/(tabs)/more.js');
    expect(moreScreen).toMatch(/useLanguage/);
    expect(moreScreen).toMatch(/t\('regional_languages'\)/);

    const settingsScreen = read('app/modules/settings/index.js');
    expect(settingsScreen).toMatch(/useLanguage/);
    expect(settingsScreen).toMatch(/t\('share_analytics'\)/);

    const tabLayout = read('app/(tabs)/_layout.js');
    expect(tabLayout).toMatch(/useLanguage/);
    expect(tabLayout).toMatch(/t\(`tab_\$\{tab\.name\}`/);
  });
});
