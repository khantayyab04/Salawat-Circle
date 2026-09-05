import { describe, expect, test } from "vitest";
import { isJumuahWindow } from "./window";

describe("Jumuah window", () => {
  test("begins on Thursday after the locally calculated sunset", () => {
    expect(
      isJumuahWindow(
        new Date("2026-09-03T18:31:00"),
        { day: 4, sunsetMinutes: 18 * 60 + 30 },
      ),
    ).toBe(true);
  });

  test("does not begin before Thursday sunset", () => {
    expect(
      isJumuahWindow(
        new Date("2026-09-03T18:29:00"),
        { day: 4, sunsetMinutes: 18 * 60 + 30 },
      ),
    ).toBe(false);
  });

  test("remains active throughout local Friday", () => {
    expect(
      isJumuahWindow(
        new Date("2026-09-04T23:59:00"),
        { day: 5, sunsetMinutes: 18 * 60 + 30 },
      ),
    ).toBe(true);
  });
});
