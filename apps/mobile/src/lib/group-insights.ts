export type GroupInsights = {
  groupId: string;
  weekTotal: string;
  activeMembers: string;
  weeklyAverage: string | null;
  goalAmount: string | null;
  remaining: string | null;
  daysRemaining: number;
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
  return {
    groupId: readString(data, "group_id")!,
    weekTotal: readString(data, "week_total")!,
    activeMembers: readString(data, "active_members")!,
    weeklyAverage: readString(data, "weekly_average", true),
    goalAmount: readString(data, "goal_amount", true),
    remaining: readString(data, "remaining", true),
    daysRemaining,
    perPersonRemaining: readString(data, "per_person_remaining", true),
    perPersonPerDay: readString(data, "per_person_per_day", true),
  };
}
