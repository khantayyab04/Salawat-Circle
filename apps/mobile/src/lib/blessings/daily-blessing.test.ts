import { expect, test } from "vitest";
import { getDailyBlessing } from "./daily-blessing";

test("keeps the narration stable all day and changes it on the next local day", () => {
  const morning = getDailyBlessing(new Date("2026-09-07T08:00:00Z"), "Europe/Berlin");
  const evening = getDailyBlessing(new Date("2026-09-07T21:59:00Z"), "Europe/Berlin");
  const next = getDailyBlessing(new Date("2026-09-07T22:00:00Z"), "Europe/Berlin");
  expect(evening.narration.id).toBe(morning.narration.id);
  expect(next.narration.id).not.toBe(morning.narration.id);
});

test("shows the same Friday narration from Thursday sunset until Friday sunset", () => {
  const location = { latitude: 52.52, longitude: 13.405 };
  const before = getDailyBlessing(new Date("2026-09-03T15:00:00Z"), "Europe/Berlin", location);
  const start = getDailyBlessing(new Date("2026-09-03T18:00:00Z"), "Europe/Berlin", location);
  const friday = getDailyBlessing(new Date("2026-09-04T10:00:00Z"), "Europe/Berlin", location);
  const end = getDailyBlessing(new Date("2026-09-04T18:00:00Z"), "Europe/Berlin", location);
  expect(before.isFriday).toBe(false);
  expect(start.isFriday).toBe(true);
  expect(friday.narration.id).toBe(start.narration.id);
  expect(end.isFriday).toBe(false);
});

test("uses calendar Friday without location, including a different timezone from the device", () => {
  expect(getDailyBlessing(new Date("2026-09-03T22:30:00Z"), "Europe/Berlin").isFriday).toBe(true);
  expect(getDailyBlessing(new Date("2026-09-03T22:30:00Z"), "America/New_York").isFriday).toBe(false);
});

test("rotates the Friday selection across consecutive weeks", () => {
  const first = getDailyBlessing(new Date("2026-09-04T10:00:00Z"), "Europe/Berlin");
  const next = getDailyBlessing(new Date("2026-09-11T10:00:00Z"), "Europe/Berlin");
  expect(first.narration.friday).toBe(true);
  expect(next.narration.friday).toBe(true);
  expect(first.narration.id).not.toBe(next.narration.id);
});
