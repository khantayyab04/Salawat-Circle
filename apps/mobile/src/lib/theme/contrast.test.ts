import { describe, expect, test } from "vitest";
import { contrastRatio } from "@/design-system/contrast";
import {
  darkColors,
  jumuahDarkColors,
  jumuahLightColors,
  lightColors,
} from "@/design-system/colors";

describe("brand palette accessibility", () => {
  test("keeps Medina green readable as a light-mode text or icon color", () => {
    expect(contrastRatio("#0B5C4B", "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
  });

  test("keeps meaningful gold readable on the light background", () => {
    expect(contrastRatio("#8A6412", "#FBF9F5")).toBeGreaterThanOrEqual(4.5);
  });

  test("keeps the dark-mode primary action readable with dark text", () => {
    expect(contrastRatio("#04231A", "#5FD3AC")).toBeGreaterThanOrEqual(4.5);
  });

  test.each([
    ["light surface", lightColors.surface],
    ["light action text", lightColors.textOnAccent],
    ["dark surface", darkColors.surface],
    ["dark action text", darkColors.textOnAccent],
  ])("avoids pure black and white for %s", (_name, color) => {
    expect(color.toUpperCase()).not.toBe("#FFFFFF");
    expect(color.toUpperCase()).not.toBe("#000000");
  });

  test.each([
    ["Jumuah light", jumuahLightColors],
    ["Jumuah dark", jumuahDarkColors],
  ] as const)("%s keeps copy and primary action accessible", (_name, colors) => {
    expect(contrastRatio(colors.textPrimary, colors.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors.textOnAccent, colors.primary)).toBeGreaterThanOrEqual(4.5);
    expect(colors.surface.toUpperCase()).not.toBe("#FFFFFF");
  });
});
