import type { GroupCampaignSelection } from "./groups/types";

export type GroupInsights = {
  groupId: string;
  campaign?: GroupCampaignSelection & { endDate: string };
  goalSource?: "explicit" | "campaign" | null;
  /** The period these figures were calculated for. */
  period: "week" | "month" | "all";
  /** Total for the selected period. */
  periodTotal: string;
  /** Kept for callers that only ever knew the week. */
  weekTotal: string;
  activeMembers: string;
  /** Total members including inactive ones, when the server reports it. */
  totalMembers: string | null;
  weeklyAverage: string | null;
  goalAmount: string | null;
  remaining: string | null;
  daysRemaining: number;
  /** What the whole group still needs per day to reach its goal. */
  groupPerDay: string | null;
  perPersonRemaining: string | null;
  perPersonPerDay: string | null;
};

function readString(
  value: Record<string, unknown>,
  key: string,
  nullable = false,
) {
  const field = value[key];
  if (nullable && field === null) return null;
  if (typeof field !== "string") throw new Error("INVALID_RESPONSE");
  return field;
}

export function parseGroupInsights(raw: unknown): GroupInsights {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("INVALID_RESPONSE");
  }
  const data = raw as Record<string, unknown>;
  const daysRemaining = data.days_remaining;
  if (typeof daysRemaining !== "number" || !Number.isInteger(daysRemaining)) {
    throw new Error("INVALID_RESPONSE");
  }
  const weekTotal = readString(data, "week_total")!;
  const period = data.period;

  return {
    ...(data.campaign_mode === "gregorian" || data.campaign_mode === "islamic" || data.campaign_mode === "custom" ? {
      campaign: { mode: data.campaign_mode, startDate: readString(data, "campaign_start")!, endDate: readString(data, "campaign_end")! },
    } : {}),
    ...(data.goal_source === "campaign" || data.goal_source === "explicit" || data.goal_source === null ? { goalSource: data.goal_source } : {}),
    groupId: readString(data, "group_id")!,
    // A payload from before periods existed always described the week.
    period:
      period === "month" || period === "all" || period === "week"
        ? period
        : "week",
    periodTotal:
      data.period_total === undefined
        ? weekTotal
        : readString(data, "period_total")!,
    weekTotal,
    activeMembers: readString(data, "active_members")!,
    totalMembers:
      data.total_members === undefined
        ? null
        : readString(data, "total_members", true),
    weeklyAverage: readString(data, "weekly_average", true),
    goalAmount: readString(data, "goal_amount", true),
    remaining: readString(data, "remaining", true),
    daysRemaining,
    groupPerDay:
      data.group_per_day === undefined
        ? null
        : readString(data, "group_per_day", true),
    perPersonRemaining: readString(data, "per_person_remaining", true),
    perPersonPerDay: readString(data, "per_person_per_day", true),
  };
}
