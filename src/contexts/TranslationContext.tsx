import React, { createContext, useContext, useState, useCallback } from 'react';

interface TranslationContextType {
  currentLanguage: string;
  setLanguage: (language: string) => void;
  translateText: (text: string) => Promise<string>;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');

  const setLanguage = useCallback((language: string) => {
    setCurrentLanguage(language);
  }, []);

  const translateText = useCallback(async (text: string): Promise<string> => {
    if (currentLanguage === 'en' || !text) {
      return text;
    }

    try {
      // Using Google Translate API via a free public endpoint
      const response = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${currentLanguage}&dt=t&q=${encodeURIComponent(text)}`
      );
      const data = await response.json();
      return data[0][0][0] || text;
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  }, [currentLanguage]);

  return (
    <TranslationContext.Provider value={{ currentLanguage, setLanguage, translateText }}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};
