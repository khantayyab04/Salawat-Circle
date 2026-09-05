import { expect, test } from "vitest";
import { getSunsetMinutes } from "./sunset";

test("calculates an early-September Berlin sunset in the local evening", () => {
  const minutes = getSunsetMinutes("2026-09-03", "Europe/Berlin");

  expect(minutes).toBeGreaterThanOrEqual(19 * 60 + 25);
  expect(minutes).toBeLessThanOrEqual(20 * 60 + 5);
});

test("uses the conservative local 18:00 fallback for unknown time zones", () => {
  expect(getSunsetMinutes("2026-09-03", "Antarctica/Troll")).toBe(18 * 60);
});
