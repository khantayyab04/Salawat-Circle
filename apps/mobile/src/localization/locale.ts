import type { AppLocale, LanguagePreference } from "./types";

type DeviceLanguageTags = string | readonly string[];

function asTags(tags: DeviceLanguageTags) {
  return typeof tags === "string" ? [tags] : tags;
}

export function resolveAppLocale(
  preference: LanguagePreference,
  deviceLanguageTags: DeviceLanguageTags,
): AppLocale {
  if (preference !== "system") return preference;
  for (const tag of asTags(deviceLanguageTags)) {
    const language = tag.toLowerCase().split("-")[0];
    if (language === "de" || language === "en") return language;
  }
  return "de";
}

export function resolveLocaleTag(
  locale: AppLocale,
  deviceLanguageTags: DeviceLanguageTags,
) {
  return (
    asTags(deviceLanguageTags).find(
      (tag) => tag.toLowerCase().split("-")[0] === locale,
    ) ?? (locale === "de" ? "de-DE" : "en-US")
  );
}

export function formatAppNumber(value: number | bigint, localeTag: string) {
  return new Intl.NumberFormat(localeTag, { maximumFractionDigits: 0 }).format(
    value,
  );
}

export function formatAppDate(
  value: Date,
  localeTag: string,
  timeZone?: string,
) {
  return new Intl.DateTimeFormat(localeTag, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone,
  }).format(value);
}

export function formatAppTime(
  value: Date,
  localeTag: string,
  timeZone?: string,
) {
  return new Intl.DateTimeFormat(localeTag, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(value);
}
