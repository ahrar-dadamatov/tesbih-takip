import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTranslations, TranslationKeys } from '../lib/i18n';

type LanguageContextType = {
  lang: string;
  t: TranslationKeys;
  setLanguage: (lang: string) => Promise<void>;
};

const LanguageContext = createContext<LanguageContextType>({
  lang: 'tr',
  t: getTranslations('tr'),
  setLanguage: async () => {},
});

const LANG_KEY = '@tesbih_language';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState('tr');

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then((stored) => {
      if (stored) setLang(stored);
    });
  }, []);

  const setLanguage = async (newLang: string) => {
    setLang(newLang);
    await AsyncStorage.setItem(LANG_KEY, newLang);
  };

  return (
    <LanguageContext.Provider
      value={{
        lang,
        t: getTranslations(lang),
        setLanguage,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);