/**
 * Client model for `get_progress_series`.
 *
 * Totals stay strings end to end because a lifetime sum can exceed what a
 * JavaScript number represents exactly.
 */

export const PROGRESS_RANGES = ["week", "month", "year", "all"] as const;

export type ProgressRange = (typeof PROGRESS_RANGES)[number];

export function isProgressRange(value: string): value is ProgressRange {
  return (PROGRESS_RANGES as readonly string[]).includes(value);
}

export type ProgressBucket = {
  start: string;
  label: string;
  total: string;
  /** Null when no goal applied, or when the bucket lies ahead of today. */
  goalReached: boolean | null;
  /** True for buckets after today, which are empty rather than missed. */
  future: boolean;
};

export type ProgressSeries = {
  range: ProgressRange;
  periodStart: string;
  periodEnd: string;
  today: string;
  total: string;
  activeDays: string;
  goalDays: string;
  achievedGoalDays: string;
  currentStreak: number;
  longestStreak: number;
  buckets: ProgressBucket[];
};

type RawBucket = {
  start: string;
  label: string;
  total: string;
  goal_reached: boolean | null;
  future: boolean;
};

export function parseProgressSeries(raw: unknown): ProgressSeries {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("INVALID_RESPONSE");
  }
  const value = raw as Record<string, unknown>;

  if (typeof value.range !== "string" || !isProgressRange(value.range)) {
    throw new Error("INVALID_RESPONSE");
  }
  if (!Array.isArray(value.buckets)) {
    throw new Error("INVALID_RESPONSE");
  }

  return {
    range: value.range,
    periodStart: String(value.period_start),
    periodEnd: String(value.period_end),
    today: String(value.today),
    total: String(value.total),
    activeDays: String(value.active_days),
    goalDays: String(value.goal_days),
    achievedGoalDays: String(value.achieved_goal_days),
    currentStreak: Number(value.current_streak ?? 0),
    longestStreak: Number(value.longest_streak ?? 0),
    buckets: (value.buckets as RawBucket[]).map((bucket) => ({
      start: String(bucket.start),
      label: String(bucket.label),
      total: String(bucket.total),
      goalReached: bucket.goal_reached ?? null,
      future: Boolean(bucket.future),
    })),
  };
}
