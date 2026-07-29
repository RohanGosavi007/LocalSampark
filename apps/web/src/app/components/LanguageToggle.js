'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../data/translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState('en'); // Default is English

  // Load saved preference from localStorage on mount
  useEffect(() => {
    const savedLang = localStorage.getItem('ls_language');
    if (savedLang && translations[savedLang]) {
      setLang(savedLang);
    }
  }, []);

  const changeLanguage = (newLang) => {
    if (translations[newLang]) {
      setLang(newLang);
      localStorage.setItem('ls_language', newLang);
    }
  };

  const t = (key) => {
    return translations[lang][key] || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

export default function LanguageToggle() {
  const { lang, changeLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-1 bg-background-alt p-1 rounded-full border border-border shadow-inner">
      <button 
        onClick={() => changeLanguage('en')}
        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${lang === 'en' ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:text-text hover:bg-border/30'}`}
      >
        EN
      </button>
      <button 
        onClick={() => changeLanguage('hi')}
        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${lang === 'hi' ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:text-text hover:bg-border/30'}`}
      >
        हिं
      </button>
      <button 
        onClick={() => changeLanguage('mr')}
        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${lang === 'mr' ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:text-text hover:bg-border/30'}`}
      >
        मरा
      </button>
    </div>
  );
}
