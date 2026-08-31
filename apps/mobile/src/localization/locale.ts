import type { AppLocale, LanguagePreference } from "./types";

type DeviceLanguageTags = string | readonly string[];
const numberFormatterCache = new Map<string, Intl.NumberFormat>();
const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();
const timeFormatterCache = new Map<string, Intl.DateTimeFormat>();

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
  const cached = numberFormatterCache.get(localeTag);
  if (cached) {
    return cached.format(value);
  }
  const formatter = new Intl.NumberFormat(localeTag, {
    maximumFractionDigits: 0,
  });
  numberFormatterCache.set(localeTag, formatter);
  return formatter.format(value);
}

export function formatAppDate(
  value: Date,
  localeTag: string,
  timeZone?: string,
) {
  const key = `${localeTag}::${timeZone ?? "system"}`;
  const cached = dateFormatterCache.get(key);
  if (cached) {
    return cached.format(value);
  }
  const formatter = new Intl.DateTimeFormat(localeTag, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone,
  });
  dateFormatterCache.set(key, formatter);
  return formatter.format(value);
}

export function formatAppTime(
  value: Date,
  localeTag: string,
  timeZone?: string,
) {
  const key = `${localeTag}::${timeZone ?? "system"}`;
  const cached = timeFormatterCache.get(key);
  if (cached) {
    return cached.format(value);
  }
  const formatter = new Intl.DateTimeFormat(localeTag, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  });
  timeFormatterCache.set(key, formatter);
  return formatter.format(value);
}
