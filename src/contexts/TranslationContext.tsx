import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { EN_TRANSLATIONS, TranslationKey } from "@/locales/en";
import { supabase } from "@/integrations/supabase/client";

interface TranslationContextType {
  currentLang: string;
  setLanguage: (code: string) => void;
  t: (key: TranslationKey) => string;
  isLoading: boolean;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

const CACHE_PREFIX = "translations.";
const LANG_STORAGE_KEY = "ui.lang";

export const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLang, setCurrentLang] = useState<string>("en");
  const [translations, setTranslations] = useState<Record<string, string>>(EN_TRANSLATIONS);
  const [isLoading, setIsLoading] = useState(false);

  // Load saved language on mount
  useEffect(() => {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.code && parsed.code !== "en") {
          setLanguage(parsed.code);
        }
      } catch (e) {
        console.error("Failed to parse saved language:", e);
      }
    }
  }, []);

  const loadTranslations = useCallback(async (langCode: string) => {
    if (langCode === "en") {
      setTranslations(EN_TRANSLATIONS);
      return;
    }

    setIsLoading(true);

    try {
      // Check cache first
      const cacheKey = `${CACHE_PREFIX}${langCode}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        try {
          const parsedCache = JSON.parse(cached);
          const cacheAge = Date.now() - parsedCache.timestamp;
          const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

          if (cacheAge < MAX_CACHE_AGE && parsedCache.translations) {
            console.log(`Using cached translations for ${langCode}`);
            setTranslations(parsedCache.translations);
            setIsLoading(false);
            return;
          }
        } catch (e) {
          console.warn("Failed to parse cached translations:", e);
        }
      }

      // Fetch new translations
      console.log(`Fetching translations for ${langCode}`);
      const textsToTranslate = Object.values(EN_TRANSLATIONS);
      
      const { data, error } = await supabase.functions.invoke('translate-text', {
        body: { texts: textsToTranslate, targetLang: langCode }
      });

      if (error) {
        console.error("Translation error:", error);
        setTranslations(EN_TRANSLATIONS); // Fallback to English
        return;
      }

      if (data?.translations) {
        // Map back to keys
        const translatedMap: Record<string, string> = {};
        const keys = Object.keys(EN_TRANSLATIONS);
        
        keys.forEach((key, index) => {
          translatedMap[key] = data.translations[index] || EN_TRANSLATIONS[key as TranslationKey];
        });

        setTranslations(translatedMap);

        // Cache the translations
        localStorage.setItem(
          cacheKey,
          JSON.stringify({
            translations: translatedMap,
            timestamp: Date.now()
          })
        );

        console.log(`Successfully loaded and cached translations for ${langCode}`);
      }
    } catch (error) {
      console.error("Failed to load translations:", error);
      setTranslations(EN_TRANSLATIONS); // Fallback to English
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setLanguage = useCallback((code: string) => {
    setCurrentLang(code);
    loadTranslations(code);
  }, [loadTranslations]);

  const t = useCallback((key: TranslationKey): string => {
    return translations[key] || EN_TRANSLATIONS[key] || key;
  }, [translations]);

  return (
    <TranslationContext.Provider value={{ currentLang, setLanguage, t, isLoading }}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error("useTranslation must be used within TranslationProvider");
  }
  return context;
};
