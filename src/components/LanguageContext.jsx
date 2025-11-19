import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('es');

  useEffect(() => {
    const savedLang = localStorage.getItem('proman-language');
    if (savedLang && (savedLang === 'es' || savedLang === 'en')) {
      setLanguage(savedLang);
    }
  }, []);

  const toggleLanguage = () => {
    const newLang = language === 'es' ? 'en' : 'es';
    setLanguage(newLang);
    localStorage.setItem('proman-language', newLang);
  };

  const t = (translations) => {
    return translations[language] || translations.es;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};