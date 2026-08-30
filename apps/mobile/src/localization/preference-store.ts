import type { LanguagePreference } from "./types";
export const LANGUAGE_PREFERENCE_KEY = "preferences.language.v1";
type PreferenceStorage = Pick<Storage, "getItem" | "removeItem" | "setItem">;
const supported = new Set<LanguagePreference>(["system", "de", "en"]);
export function createLanguagePreferenceStore(storage: PreferenceStorage) {
  const listeners = new Set<() => void>();
  return {
    get(): LanguagePreference {
      const value = storage.getItem(LANGUAGE_PREFERENCE_KEY);
      if (value && supported.has(value as LanguagePreference))
        return value as LanguagePreference;
      storage.setItem(LANGUAGE_PREFERENCE_KEY, "system");
      return "system";
    },
    set(value: LanguagePreference) {
      storage.setItem(LANGUAGE_PREFERENCE_KEY, value);
      listeners.forEach((listener) => listener());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
export type LanguagePreferenceStore = ReturnType<
  typeof createLanguagePreferenceStore
>;
