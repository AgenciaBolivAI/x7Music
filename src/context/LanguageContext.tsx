'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { en } from '@/locales/en';
import { es } from '@/locales/es';

export type Language = 'en' | 'es';

type Translations = typeof es;

const translations: Record<Language, Translations> = {
  en: en as unknown as Translations,
  es,
};

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return path;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === 'string' ? current : path;
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Default to 'es' on the server; sync from localStorage after mount to avoid hydration mismatch.
  const [language, setLanguageState] = useState<Language>('es');

  useEffect(() => {
    const stored = localStorage.getItem('x7_lang') as Language | null;
    if (stored === 'en' || stored === 'es') setLanguageState(stored);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') localStorage.setItem('x7_lang', lang);
  };

  const t = (key: string): string =>
    getNestedValue(translations[language] as unknown as Record<string, unknown>, key);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
