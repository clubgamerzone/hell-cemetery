import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_LANGUAGE, LANGUAGES, translations } from '../i18n/translations';

const STORAGE_KEY = 'hellCemeteryLanguage';
const LanguageContext = createContext(null);

function getStoredLanguage() {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  const storedLanguage = window.localStorage.getItem(STORAGE_KEY);
  return LANGUAGES.some((language) => language.code === storedLanguage)
    ? storedLanguage
    : DEFAULT_LANGUAGE;
}

function formatValue(value, values = {}) {
  return String(value).replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(getStoredLanguage);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const contextValue = useMemo(() => {
    function t(key, values) {
      const value = translations[language]?.[key] ?? translations[DEFAULT_LANGUAGE]?.[key] ?? key;
      return formatValue(value, values);
    }

    return {
      language,
      languages: LANGUAGES,
      setLanguage,
      t,
    };
  }, [language]);

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used inside a LanguageProvider');
  }
  return context;
}
