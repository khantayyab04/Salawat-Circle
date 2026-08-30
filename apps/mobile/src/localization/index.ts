export { type TranslationKey } from "./de";
export {
  formatAppDate,
  formatAppNumber,
  formatAppTime,
  resolveAppLocale,
  resolveLocaleTag,
} from "./locale";
export { I18nProvider, useTranslation } from "./provider";
export {
  LANGUAGE_PREFERENCE_KEY,
  createLanguagePreferenceStore,
  type LanguagePreferenceStore,
} from "./preference-store";
export type { AppLocale, LanguagePreference } from "./types";
