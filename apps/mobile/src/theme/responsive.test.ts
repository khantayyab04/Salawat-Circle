import { describe, expect, it } from "vitest";
import { fitNumericFontSize, sizeClassFor } from "@/theme/responsive";

describe("sizeClassFor", () => {
  it("treats narrow phones as compact", () => {
    expect(sizeClassFor(320)).toBe("compact");
    expect(sizeClassFor(375)).toBe("compact");
  });

  it("treats common phones as regular", () => {
    expect(sizeClassFor(390)).toBe("regular");
    expect(sizeClassFor(402)).toBe("regular");
    expect(sizeClassFor(428)).toBe("regular");
  });

  it("treats the largest phones and tablets as wide", () => {
    expect(sizeClassFor(430)).toBe("wide");
    expect(sizeClassFor(768)).toBe("wide");
  });
});

describe("fitNumericFontSize", () => {
  it("keeps the preferred size when the value already fits", () => {
    expect(fitNumericFontSize("1,200", { maxWidth: 240, fontSize: 48 })).toBe(
      48,
    );
  });

  it("shrinks long values instead of clipping them", () => {
    const fitted = fitNumericFontSize("10,000,000", {
      maxWidth: 240,
      fontSize: 48,
    });
    expect(fitted).toBeLessThan(48);
    expect(fitted).toBeGreaterThan(0);
  });

  it("never shrinks below the readable floor", () => {
    expect(
      fitNumericFontSize("10,000,000", {
        maxWidth: 40,
        fontSize: 48,
        minFontSize: 20,
      }),
    ).toBe(20);
  });

  it("scales down further as the available width shrinks", () => {
    const wide = fitNumericFontSize("126,450", { maxWidth: 300, fontSize: 48 });
    const narrow = fitNumericFontSize("126,450", {
      maxWidth: 160,
      fontSize: 48,
    });
    expect(narrow).toBeLessThan(wide);
  });

  it("ignores a non positive width and keeps the preferred size", () => {
    expect(fitNumericFontSize("1,200", { maxWidth: 0, fontSize: 48 })).toBe(48);
  });
});
