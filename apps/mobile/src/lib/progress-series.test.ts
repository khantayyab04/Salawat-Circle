import { describe, expect, it } from "vitest";
import {
  PROGRESS_RANGES,
  formatProgressBucketLabel,
  isProgressRange,
  parseProgressSeries,
} from "@/lib/progress-series";

const raw = {
  range: "week",
  period_start: "2026-08-31",
  period_end: "2026-09-06",
  today: "2026-09-05",
  total: "5450",
  active_days: "5",
  goal_days: "7",
  achieved_goal_days: "4",
  current_streak: 6,
  longest_streak: 12,
  buckets: [
    {
      start: "2026-08-31",
      label: "MON",
      total: "1300",
      goal_total: "1000",
      goal_reached: true,
      future: false,
    },
    {
      start: "2026-09-06",
      label: "SUN",
      total: "0",
      goal_total: null,
      goal_reached: null,
      future: true,
    },
  ],
};

describe("isProgressRange", () => {
  it("accepts the four ranges the screen offers", () => {
    for (const range of PROGRESS_RANGES) {
      expect(isProgressRange(range)).toBe(true);
    }
  });

  it("rejects anything else", () => {
    expect(isProgressRange("decade")).toBe(false);
    expect(isProgressRange("")).toBe(false);
  });
});

describe("parseProgressSeries", () => {
  it("maps the payload onto the shape the screen consumes", () => {
    const series = parseProgressSeries(raw);
    expect(series.range).toBe("week");
    expect(series.total).toBe("5450");
    expect(series.achievedGoalDays).toBe("4");
    expect(series.buckets).toHaveLength(2);
  });

  it("does not retain excluded streak metrics from older servers", () => {
    const series = parseProgressSeries(raw);
    expect(series).not.toHaveProperty("currentStreak");
    expect(series).not.toHaveProperty("longestStreak");
  });

  it("keeps totals as strings so very large sums stay exact", () => {
    const series = parseProgressSeries({
      ...raw,
      total: "9007199254740993000",
    });
    expect(series.total).toBe("9007199254740993000");
  });

  it("carries the future flag so the screen can tell empty from missed", () => {
    const series = parseProgressSeries(raw);
    expect(series.buckets[0].future).toBe(false);
    expect(series.buckets[1].future).toBe(true);
    expect(series.buckets[1].goalReached).toBeNull();
  });

  it("rejects a payload without buckets", () => {
    expect(() => parseProgressSeries({ ...raw, buckets: null })).toThrow(
      "INVALID_RESPONSE",
    );
  });

  it("rejects a payload that is not an object", () => {
    expect(() => parseProgressSeries(null)).toThrow("INVALID_RESPONSE");
    expect(() => parseProgressSeries([])).toThrow("INVALID_RESPONSE");
  });

  it("rejects an unknown range so a bad payload cannot reach the screen", () => {
    expect(() => parseProgressSeries({ ...raw, range: "decade" })).toThrow(
      "INVALID_RESPONSE",
    );
  });
});

describe("localized progress labels", () => {
  it("formats weekday buckets in the selected language", () => {
    expect(formatProgressBucketLabel("2026-08-31", "week", "de-DE")).toMatch(/^Mo/);
    expect(formatProgressBucketLabel("2026-08-31", "week", "en-GB")).toMatch(/^Mon/);
  });
});

it.each([
  { total: "not-a-number" }, { achieved_goal_days: undefined }, { period_start: "bad-date" },
  { buckets: [{ ...raw.buckets[0], total: "1.5" }] }, { buckets: [null] },
  { buckets: [{ ...raw.buckets[0], future: "false" }] },
])("rejects malformed chart data before rendering", (change) => {
  expect(() => parseProgressSeries({ ...raw, ...change })).toThrow("INVALID_RESPONSE");
});

it("preserves exact historical goal totals including goal-free buckets", () => {
  const series = parseProgressSeries({ ...raw, buckets: [
    { ...raw.buckets[0], goal_total: "9007199254740993000" }, raw.buckets[1],
  ] });
  expect(series.buckets[0].goalTotal).toBe("9007199254740993000");
  expect(series.buckets[1].goalTotal).toBeNull();
});

it.each(["0", "-1", "1.5", undefined])("rejects invalid goal total %s before chart division", (goal_total) => {
  expect(() => parseProgressSeries({ ...raw, buckets: [{ ...raw.buckets[0], goal_total }] })).toThrow("INVALID_RESPONSE");
});
