import "expo-sqlite/localStorage/install";
import { useLocales } from "expo-localization";
import { I18n } from "i18n-js";
import {
  createContext,
  type PropsWithChildren,
  use,
  useCallback,
  useMemo,
  useSyncExternalStore,
} from "react";
import { de, type TranslationKey } from "./de";
import { en } from "./en";
import { resolveAppLocale, resolveLocaleTag } from "./locale";
import { createLanguagePreferenceStore } from "./preference-store";
import type { AppLocale, LanguagePreference } from "./types";
const store = createLanguagePreferenceStore(globalThis.localStorage);
type Value = {
  locale: AppLocale;
  localeTag: string;
  preference: LanguagePreference;
  setPreference: (value: LanguagePreference) => void;
  t: (
    key: TranslationKey,
    options?: Record<string, string | number>,
  ) => string;
};
const Context = createContext<Value | null>(null);
export function I18nProvider({ children }: PropsWithChildren) {
  const deviceTags = useLocales().map(({ languageTag }) => languageTag);
  const preference = useSyncExternalStore(
    store.subscribe,
    store.get,
    store.get,
  );
  const locale = resolveAppLocale(preference, deviceTags);
  const localeTag = resolveLocaleTag(locale, deviceTags);
  const i18n = useMemo(() => {
    const value = new I18n({ de, en });
    value.defaultLocale = "de";
    value.enableFallback = true;
    value.locale = locale;
    return value;
  }, [locale]);
  const t = useCallback(
    (key: TranslationKey, options?: Record<string, string | number>) =>
      i18n.t(key, { defaultValue: de[key], ...(options ?? {}) }),
    [i18n],
  );
  const value = useMemo(
    () => ({ locale, localeTag, preference, setPreference: store.set, t }),
    [locale, localeTag, preference, t],
  );
  return <Context value={value}>{children}</Context>;
}
export function useTranslation() {
  const value = use(Context);
  if (!value)
    throw new Error("useTranslation must be used inside I18nProvider");
  return value;
}
