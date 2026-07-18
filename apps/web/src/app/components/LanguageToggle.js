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
    <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--surface)', padding: '0.25rem', borderRadius: '50px', border: '1px solid var(--border)', fontSize: '0.8rem', fontWeight: 600 }}>
      <button 
        onClick={() => changeLanguage('en')}
        style={{ padding: '0.4rem 0.75rem', borderRadius: '50px', background: lang === 'en' ? 'var(--primary)' : 'transparent', color: lang === 'en' ? 'white' : 'var(--text-muted)', border: 'none', cursor: 'pointer', transition: '0.2s' }}>
        EN
      </button>
      <button 
        onClick={() => changeLanguage('mr')}
        style={{ padding: '0.4rem 0.75rem', borderRadius: '50px', background: lang === 'mr' ? 'var(--primary)' : 'transparent', color: lang === 'mr' ? 'white' : 'var(--text-muted)', border: 'none', cursor: 'pointer', transition: '0.2s' }}>
        मरा
      </button>
      <button 
        onClick={() => changeLanguage('hi')}
        style={{ padding: '0.4rem 0.75rem', borderRadius: '50px', background: lang === 'hi' ? 'var(--primary)' : 'transparent', color: lang === 'hi' ? 'white' : 'var(--text-muted)', border: 'none', cursor: 'pointer', transition: '0.2s' }}>
        हिं
      </button>
    </div>
  );
}
