import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import zh from './locales/zh.json';

function getSavedLang(): string | null {
  try {
    return localStorage.getItem('panicstudio-language');
  } catch {
    return null;
  }
}

const savedLang = getSavedLang();

const resources = {
  en: { translation: en },
  zh: { translation: zh },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLang || 'en', // Default to English
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes
    },
    react: {
      useSuspense: false,
    },
  });

// Expose for debugging
if (typeof window !== 'undefined') {
  (window as any).i18n = i18n;
}
export default i18n;
