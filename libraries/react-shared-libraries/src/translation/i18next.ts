import i18next from 'i18next';
import { initReactI18next } from 'react-i18next/initReactI18next';
import de from './locales/de/translation.json';

i18next.use(initReactI18next).init({
  lng: 'de',
  fallbackLng: 'de',
  resources: { de: { translation: de } },
});

export default i18next;
