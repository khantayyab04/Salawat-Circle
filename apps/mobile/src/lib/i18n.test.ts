import { describe, expect, it } from "vitest";
import { de } from "@/localization/de";
import { en } from "@/localization/en";
import {
  formatAppDate,
  formatBigInt,
  formatAppNumber,
  resolveAppLocale,
} from "@/localization/locale";
import {
  LANGUAGE_PREFERENCE_KEY,
  createLanguagePreferenceStore,
} from "@/localization/preference-store";

describe("translation catalogs", () => {
  it("keeps the English catalog in exact key parity with German", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(de).sort());
  });
});

describe("resolveAppLocale", () => {
  it.each([
    ["de", "en-US", "de"],
    ["en", "de-DE", "en"],
    ["system", "en-US", "en"],
    ["system", "de-DE", "de"],
    ["system", "fr-FR", "de"],
  ] as const)("resolves %s with %s to %s", (preference, tag, expected) => {
    expect(resolveAppLocale(preference, tag)).toBe(expected);
  });

  it("uses the first supported language in the complete device locale list", () => {
    expect(resolveAppLocale("system", ["fr-FR", "en-GB", "de-DE"])).toBe("en");
  });
});

describe("locale formatting", () => {
  it("formats numbers for German and English independently", () => {
    expect(formatAppNumber(1234567, "de-DE")).toBe("1.234.567");
    expect(formatAppNumber(1234567, "en-US")).toBe("1,234,567");
  });

  it("formats BigInt totals without converting them to an imprecise number", () => {
    expect(formatAppNumber(12345678901234567890n, "de-DE")).toBe(
      "12.345.678.901.234.567.890",
    );
    expect(formatAppNumber(12345678901234567890n, "en-US")).toBe(
      "12,345,678,901,234,567,890",
    );
  });

  it("groups an arbitrary BigInt string without using Intl number coercion", () => {
    expect(formatBigInt("-12345678901234567890", "de-DE")).toBe(
      "-12.345.678.901.234.567.890",
    );
  });

  it("formats dates for German and English independently", () => {
    const date = new Date("2026-08-29T12:00:00.000Z");

    expect(formatAppDate(date, "de-DE", "UTC")).toBe("29. August 2026");
    expect(formatAppDate(date, "en-US", "UTC")).toBe("August 29, 2026");
  });
});

describe("language preference store", () => {
  it("persists a supported preference and notifies subscribers", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => values.set(key, value),
    };
    const store = createLanguagePreferenceStore(storage);
    let notifications = 0;
    const unsubscribe = store.subscribe(() => {
      notifications += 1;
    });

    store.set("en");

    expect(values.get(LANGUAGE_PREFERENCE_KEY)).toBe("en");
    expect(store.get()).toBe("en");
    expect(notifications).toBe(1);
    unsubscribe();
  });

  it("repairs an unsupported stored value to system", () => {
    const values = new Map([[LANGUAGE_PREFERENCE_KEY, "fr"]]);
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => values.set(key, value),
    };

    const store = createLanguagePreferenceStore(storage);

    expect(store.get()).toBe("system");
    expect(values.get(LANGUAGE_PREFERENCE_KEY)).toBe("system");
  });
});
