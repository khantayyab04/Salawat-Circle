import { describe, expect, test } from "vitest";
import {
  calculateGoalRate,
  describeMilestone,
  calculateStreaks,
  calculateWeekDelta,
} from "./progress-metrics";

describe("progress metrics", () => {
  test("reports current and longest active-day streak without penalizing breaks", () => {
    expect(
      calculateStreaks([
        { date: "2026-09-04", total: "10" },
        { date: "2026-09-03", total: "5" },
        { date: "2026-09-02", total: "0" },
        { date: "2026-09-01", total: "3" },
        { date: "2026-08-31", total: "4" },
        { date: "2026-08-30", total: "9" },
      ]),
    ).toEqual({ current: 2, longest: 3 });
  });

  test("derives the same streak from server-ordered ascending daily values", () => {
    expect(
      calculateStreaks([
        { date: "2026-08-30", total: "9" },
        { date: "2026-08-31", total: "4" },
        { date: "2026-09-01", total: "3" },
        { date: "2026-09-02", total: "0" },
        { date: "2026-09-03", total: "5" },
        { date: "2026-09-04", total: "10" },
      ]),
    ).toEqual({ current: 2, longest: 3 });
  });

  test("compares equal-length current and previous periods", () => {
    expect(calculateWeekDelta(["120", "100"], ["100", "100"])).toBe(10);
  });

  test("calculates a goal rate only for days with a configured goal", () => {
    expect(
      calculateGoalRate([
        { goal: "100", total: "100" },
        { goal: "100", total: "20" },
        { goal: null, total: "300" },
      ]),
    ).toEqual({ achieved: 1, eligible: 2 });
  });

  test("describes the next quiet all-time milestone without a pressure state", () => {
    expect(describeMilestone("13482")).toEqual({
      reached: "10000",
      next: "50000",
      progress: 26,
    });
  });

  test("caps the final milestone display at completion", () => {
    expect(describeMilestone("600000").progress).toBe(100);
  });
});
