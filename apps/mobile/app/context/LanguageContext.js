import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations } from '../data/translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState('en');

  useEffect(() => {
    const loadLang = async () => {
      try {
        const savedLang = await AsyncStorage.getItem('ls_language');
        if (savedLang && translations[savedLang]) {
          setLang(savedLang);
        }
      } catch (e) {
        console.error('Failed to load language', e);
      }
    };
    loadLang();
  }, []);

  const changeLanguage = async (newLang) => {
    if (translations[newLang]) {
      setLang(newLang);
      try {
        await AsyncStorage.setItem('ls_language', newLang);
      } catch (e) {
        console.error('Failed to save language', e);
      }
    }
  };

  const t = (key) => {
    return translations[lang]?.[key] || translations['en']?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
