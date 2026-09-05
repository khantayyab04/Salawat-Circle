import { describe, expect, it, vi } from "vitest";
import { FONT_FAMILIES, resolveFontGate } from "@/theme/fonts";
import { fontFamily, typography } from "@/theme/tokens";

describe("font registration", () => {
  it("registers every family the token aliases point at", () => {
    for (const family of Object.values(fontFamily)) {
      expect(FONT_FAMILIES).toContain(family);
    }
  });

  it("registers every family the type scale actually uses", () => {
    const used = Object.values(typography)
      .map((style) => (style as { fontFamily?: string }).fontFamily)
      .filter((name): name is string => Boolean(name));

    expect(used.length).toBeGreaterThan(0);
    for (const family of used) {
      expect(FONT_FAMILIES).toContain(family);
    }
  });

  it("does not register families nothing uses", () => {
    const used = new Set(
      Object.values(typography)
        .map((style) => (style as { fontFamily?: string }).fontFamily)
        .filter((name): name is string => Boolean(name)),
    );
    for (const family of FONT_FAMILIES) {
      expect(used).toContain(family);
    }
  });
});

describe("resolveFontGate", () => {
  it("holds the splash while fonts are still loading", () => {
    expect(resolveFontGate({ loaded: false, error: null })).toEqual({
      ready: false,
      usedFallback: false,
    });
  });

  it("releases the splash once fonts are loaded", () => {
    expect(resolveFontGate({ loaded: true, error: null })).toEqual({
      ready: true,
      usedFallback: false,
    });
  });

  it("still renders the app when a font fails so the user is never stuck", () => {
    const onError = vi.fn();
    expect(
      resolveFontGate({ loaded: false, error: new Error("boom") }, onError),
    ).toEqual({ ready: true, usedFallback: true });
    expect(onError).toHaveBeenCalledOnce();
  });

  it("does not report an error when everything loaded", () => {
    const onError = vi.fn();
    resolveFontGate({ loaded: true, error: null }, onError);
    expect(onError).not.toHaveBeenCalled();
  });
});
