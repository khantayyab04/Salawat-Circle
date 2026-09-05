import { describe, expect, test } from "vitest";
import { parseProgressOverview } from "./progress-overview";

describe("progress overview response", () => {
  test("maps daily server aggregates without exposing individual entries", () => {
    expect(
      parseProgressOverview({
        period_start: "2026-08-27",
        period_end: "2026-09-02",
        total: "2933",
        active_days: "2",
        goal_days: "7",
        achieved_goal_days: "1",
        average_per_active_day: "1466",
        best_day: { date: "2026-09-01", total: "1500" },
        daily: [
          {
            date: "2026-09-02",
            total: "1333",
            goal: "1500",
            goal_reached: false,
            remaining: "167",
          },
        ],
      }),
    ).toMatchObject({
      activeDays: "2",
      bestDay: { date: "2026-09-01", total: "1500" },
      daily: [{ goalReached: false, remaining: "167" }],
    });
  });
});
