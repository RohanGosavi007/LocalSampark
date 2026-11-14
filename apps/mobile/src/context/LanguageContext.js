import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n, { normalizeLanguage } from '../i18n';

export const LANGUAGE_STORAGE_KEY = '@localsampark_language';

const LanguageContext = createContext({
  language: 'en',
  setLanguage: async () => {},
  t: (key) => key,
});

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(normalizeLanguage(i18n.locale));

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)
      .then((saved) => {
        if (active && saved) {
          const next = normalizeLanguage(saved);
          i18n.locale = next;
          setLanguageState(next);
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    i18n.locale = language;
  }, [language]);

  const setLanguage = useCallback(async (nextLang) => {
    const normalized = normalizeLanguage(nextLang);
    i18n.locale = normalized;
    setLanguageState(normalized);
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
    } catch {}
    return normalized;
  }, []);

  const t = useCallback((key, options = {}) => {
    return i18n.t(key, { locale: language, defaultValue: key, ...options });
  }, [language]);

  return React.createElement(
    LanguageContext.Provider,
    { value: { language, setLanguage, t } },
    children
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
