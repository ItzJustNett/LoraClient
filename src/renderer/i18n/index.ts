import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { tr, TranslationKeys } from './tr';
import { en } from './en';

type Language = 'tr' | 'en';

const translations: Record<Language, TranslationKeys> = { tr, en };

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationKeys;
}

const I18nContext = createContext<I18nContextType | null>(null);

interface I18nProviderProps {
  children: ReactNode;
  initialLanguage?: Language;
  onLanguageChange?: (lang: Language) => void;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ 
  children, 
  initialLanguage = 'tr',
  onLanguageChange 
}) => {
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  useEffect(() => {
    setLanguageState(initialLanguage);
  }, [initialLanguage]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    onLanguageChange?.(lang);
  }, [onLanguageChange]);

  const value: I18nContextType = {
    language,
    setLanguage,
    t: translations[language],
  };

  return React.createElement(I18nContext.Provider, { value }, children);
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

export const formatTime = (template: string, count: number): string => {
  return template.replace('{count}', count.toString());
};

export type { Language, TranslationKeys };
