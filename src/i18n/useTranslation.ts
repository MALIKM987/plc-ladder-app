import { translations, type Language, type TranslationKey } from './translations'

export function useTranslation(language: Language) {
  const t = (key: TranslationKey) =>
    translations[language][key] ?? translations.pl[key] ?? key

  return { t, language }
}
