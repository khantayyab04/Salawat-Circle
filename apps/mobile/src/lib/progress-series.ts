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
  /** Sum of elapsed historical goals in this bucket, null when no goal applies. */
  goalTotal: string | null;
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
  buckets: ProgressBucket[];
};

function readRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("INVALID_RESPONSE");
  return value as Record<string, unknown>;
}
function readTotal(value: unknown): string {
  if (typeof value !== "string" || !/^\d+$/.test(value)) throw new Error("INVALID_RESPONSE");
  return value;
}
function readDate(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("INVALID_RESPONSE");
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error("INVALID_RESPONSE");
  return value;
}

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
    periodStart: readDate(value.period_start),
    periodEnd: readDate(value.period_end),
    today: readDate(value.today),
    total: readTotal(value.total),
    activeDays: readTotal(value.active_days),
    goalDays: readTotal(value.goal_days),
    achievedGoalDays: readTotal(value.achieved_goal_days),
    buckets: value.buckets.map((rawBucket) => {
      const bucket = readRecord(rawBucket);
      if (typeof bucket.label !== "string" || typeof bucket.future !== "boolean" ||
          (bucket.goal_reached !== null && typeof bucket.goal_reached !== "boolean")) throw new Error("INVALID_RESPONSE");
      const goalTotal = bucket.goal_total === null ? null : readTotal(bucket.goal_total);
      if (goalTotal !== null && BigInt(goalTotal) === 0n) throw new Error("INVALID_RESPONSE");
      return {
        start: readDate(bucket.start), label: bucket.label, total: readTotal(bucket.total),
        goalTotal,
        goalReached: bucket.goal_reached, future: bucket.future,
      };
    }),
  };
}

export function formatProgressBucketLabel(start: string, range: ProgressRange, locale: string) {
  const options: Intl.DateTimeFormatOptions = range === "week" ? { weekday: "short" }
    : range === "month" ? { day: "numeric", month: "short" }
    : range === "year" ? { month: "short" } : { year: "numeric" };
  return new Date(`${start}T12:00:00Z`).toLocaleDateString(locale, { ...options, timeZone: "UTC" });
}
