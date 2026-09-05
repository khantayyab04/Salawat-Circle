import { describe, expect, test } from "vitest";
import { parseGroupInsights } from "./group-insights";

describe("group insight response", () => {
  test("maps collective goal guidance without individual contribution data", () => {
    expect(
      parseGroupInsights({
        group_id: "group-1",
        week_total: "24500",
        active_members: "6",
        weekly_average: "4083",
        goal_amount: "31000",
        remaining: "6500",
        days_remaining: 4,
        per_person_remaining: "1084",
        per_person_per_day: "271",
      }),
    ).toEqual({
      groupId: "group-1",
      weekTotal: "24500",
      activeMembers: "6",
      weeklyAverage: "4083",
      goalAmount: "31000",
      remaining: "6500",
      daysRemaining: 4,
      perPersonRemaining: "1084",
      perPersonPerDay: "271",
    });
  });
});
