import { describe, expect, it } from "vitest";
import {
  GROUP_PERIODS,
  isGroupPeriod,
  leaderboardPeriodFor,
} from "@/lib/groups/periods";

describe("group periods", () => {
  it("offers the three periods the detail screen shows", () => {
    expect(GROUP_PERIODS).toEqual(["week", "month", "all"]);
  });

  it("recognises exactly those periods", () => {
    for (const period of GROUP_PERIODS) {
      expect(isGroupPeriod(period)).toBe(true);
    }
    expect(isGroupPeriod("year")).toBe(false);
    expect(isGroupPeriod("")).toBe(false);
  });

  it("maps the screen period onto the leaderboard period", () => {
    expect(leaderboardPeriodFor("week")).toBe("week");
    expect(leaderboardPeriodFor("month")).toBe("month");
    // The board calls the unbounded period "all_time" while the rest of the
    // group API calls it "all".
    expect(leaderboardPeriodFor("all")).toBe("all_time");
  });
});
