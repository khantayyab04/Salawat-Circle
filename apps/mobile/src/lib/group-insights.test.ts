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
      period: "week",
      periodTotal: "24500",
      weekTotal: "24500",
      activeMembers: "6",
      totalMembers: null,
      weeklyAverage: "4083",
      goalAmount: "31000",
      remaining: "6500",
      daysRemaining: 4,
      groupPerDay: null,
      perPersonRemaining: "1084",
      perPersonPerDay: "271",
    });
  });
});

describe("period aware insights", () => {
  const raw = {
    group_id: "g1",
    period: "month",
    period_start: "2026-09-01",
    period_end: "2026-09-30",
    period_total: "24600",
    week_total: "24600",
    active_members: "8",
    total_members: "12",
    weekly_average: "3075",
    goal_amount: "30000",
    remaining: "5400",
    days_remaining: 25,
    group_per_day: "216",
    per_person_remaining: "675",
    per_person_per_day: "27",
  };

  test("reports the period it was calculated for", () => {
    expect(parseGroupInsights(raw).period).toBe("month");
  });

  test("exposes the period total and the total member count", () => {
    const insights = parseGroupInsights(raw);
    expect(insights.periodTotal).toBe("24600");
    expect(insights.totalMembers).toBe("12");
  });

  test("exposes what the whole group needs per day", () => {
    expect(parseGroupInsights(raw).groupPerDay).toBe("216");
  });

  test("falls back to the week when an older payload has no period", () => {
    const { period, period_total, total_members, group_per_day, ...legacy } =
      raw;
    const insights = parseGroupInsights(legacy);
    expect(insights.period).toBe("week");
    expect(insights.periodTotal).toBe("24600");
    expect(insights.groupPerDay).toBeNull();
    expect(insights.totalMembers).toBeNull();
  });
});
