import { expect, test } from "vitest";
import { getSunsetMinutes } from "./sunset";

test("calculates an early-September Berlin sunset in the local evening", () => {
  const minutes = getSunsetMinutes("2026-09-03", "Europe/Berlin", { latitude: 52.52, longitude: 13.405 });

  expect(minutes).toBeGreaterThanOrEqual(19 * 60 + 25);
  expect(minutes).toBeLessThanOrEqual(20 * 60 + 5);
});

test("does not invent a sunset without a location", () => {
  expect(getSunsetMinutes("2026-09-03", "Europe/Berlin")).toBeNull();
});

test("uses actual coordinates rather than treating every German location as Berlin", () => {
  const berlin = getSunsetMinutes("2026-09-03", "Europe/Berlin", { latitude: 52.52, longitude: 13.405 });
  const cologne = getSunsetMinutes("2026-09-03", "Europe/Berlin", { latitude: 50.938, longitude: 6.96 });
  expect(cologne! - berlin!).toBeGreaterThan(15);
});

test("returns no sunset during polar day instead of an invented evening time", () => {
  expect(getSunsetMinutes("2026-06-21", "Europe/Oslo", { latitude: 69.65, longitude: 18.96 })).toBeNull();
});
