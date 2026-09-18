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
        className={`inline-flex items-center justify-center px-3 min-h-[var(--tap-min)] min-w-[var(--tap-min)] rounded-full text-sm font-bold transition-colors ${lang === 'en' ? 'bg-[color:var(--accent)] text-[color:var(--on-accent)] shadow-[var(--elev-1)]' : 'text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] hover:bg-[color:var(--accent-quiet)]'}`}
      >
        EN
      </button>
      <button 
        onClick={() => changeLanguage('hi')}
        className={`inline-flex items-center justify-center px-3 min-h-[var(--tap-min)] min-w-[var(--tap-min)] rounded-full text-sm font-bold transition-colors ${lang === 'hi' ? 'bg-[color:var(--accent)] text-[color:var(--on-accent)] shadow-[var(--elev-1)]' : 'text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] hover:bg-[color:var(--accent-quiet)]'}`}
      >
        हिं
      </button>
      <button 
        onClick={() => changeLanguage('mr')}
        className={`inline-flex items-center justify-center px-3 min-h-[var(--tap-min)] min-w-[var(--tap-min)] rounded-full text-sm font-bold transition-colors ${lang === 'mr' ? 'bg-[color:var(--accent)] text-[color:var(--on-accent)] shadow-[var(--elev-1)]' : 'text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] hover:bg-[color:var(--accent-quiet)]'}`}
      >
        मरा
      </button>
    </div>
  );
}
