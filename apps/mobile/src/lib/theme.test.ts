import { describe, expect, it } from "vitest";
import { darkColors, lightColors, type ColorTokens } from "@/theme/colors";

function luminance(hex: string) {
  const channels = hex
    .slice(1)
    .match(/../g)!
    .map((value) => Number.parseInt(value, 16) / 255)
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    );

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(first: string, second: string) {
  const [bright, dark] = [luminance(first), luminance(second)].sort(
    (a, b) => b - a,
  );
  return (bright + 0.05) / (dark + 0.05);
}

describe.each([
  ["light", lightColors],
  ["dark", darkColors],
] as const)("%s theme", (_name, colors: ColorTokens) => {
  it("keeps normal text above WCAG AA contrast", () => {
    expect(
      contrast(colors.textPrimary, colors.background),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(colors.textSecondary, colors.background),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps focus and strong controls distinguishable", () => {
    expect(
      contrast(colors.focusRing, colors.background),
    ).toBeGreaterThanOrEqual(3);
    expect(
      contrast(colors.borderStrong, colors.background),
    ).toBeGreaterThanOrEqual(3);
  });

  it("keeps primary button copy readable", () => {
    expect(contrast(colors.textInverse, colors.accent)).toBeGreaterThanOrEqual(
      4.5,
    );
  });
});
