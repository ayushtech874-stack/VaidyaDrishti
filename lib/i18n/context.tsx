'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import en from './en.json';
import hi from './hi.json';

type Language = 'en' | 'hi';
type Dictionaries = typeof en;

interface LanguageContextType {
  locale: Language;
  setLocale: (lang: Language) => void;
  t: (path: string) => string;
}

const dictionaries: Record<Language, any> = { en, hi };

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Language>('en');

  useEffect(() => {
    // Read saved locale from cookie or localStorage
    const saved = localStorage.getItem('NEXT_LOCALE') as Language;
    if (saved && (saved === 'en' || saved === 'hi')) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (lang: Language) => {
    setLocaleState(lang);
    localStorage.setItem('NEXT_LOCALE', lang);
    document.cookie = `NEXT_LOCALE=${lang}; path=/; max-age=31536000`;
  };

  const t = (path: string): string => {
    const keys = path.split('.');
    let current = dictionaries[locale] || dictionaries.en;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        // Fallback to English dictionary if key is missing in Hindi
        let fallback = dictionaries.en;
        for (const fk of keys) {
          if (fallback && typeof fallback === 'object' && fk in fallback) {
            fallback = fallback[fk];
          } else {
            return path;
          }
        }
        return typeof fallback === 'string' ? fallback : path;
      }
    }

    return typeof current === 'string' ? current : path;
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Return fallback if used outside provider
    return {
      locale: 'en' as Language,
      setLocale: () => {},
      t: (path: string) => path,
    };
  }
  return context;
}
