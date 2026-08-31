import { describe, expect, it } from "vitest";
import {
  getPersonalDate,
  getWeekStart,
  isEntryDateAllowed,
} from "./calendar";

describe("personal entry calendar", () => {
  it("derives the personal day from the saved IANA timezone", () => {
    const instant = new Date("2026-08-31T00:30:00.000Z");

    expect(getPersonalDate(instant, "Europe/Berlin")).toBe("2026-08-31");
    expect(getPersonalDate(instant, "America/Los_Angeles")).toBe("2026-08-30");
  });

  it.each([
    ["2026-08-31", "2026-08-31"],
    ["2026-08-30", "2026-08-24"],
    ["2026-09-01", "2026-08-31"],
  ])("finds Monday as the ISO week start for %s", (date, expected) => {
    expect(getWeekStart(date)).toBe(expected);
  });

  it("allows today and exactly 365 preceding days but rejects future and older dates", () => {
    expect(isEntryDateAllowed("2026-08-31", "2026-08-31")).toBe(true);
    expect(isEntryDateAllowed("2025-08-31", "2026-08-31")).toBe(true);
    expect(isEntryDateAllowed("2025-08-30", "2026-08-31")).toBe(false);
    expect(isEntryDateAllowed("2026-09-01", "2026-08-31")).toBe(false);
    expect(isEntryDateAllowed("31.08.2026", "2026-08-31")).toBe(false);
  });
});
