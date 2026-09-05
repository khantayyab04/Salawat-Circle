export type ProgressDay = {
  date: string;
  total: string;
  goal: string | null;
  goalReached: boolean | null;
  remaining: string | null;
};

export type ProgressOverview = {
  periodStart: string;
  periodEnd: string;
  total: string;
  activeDays: string;
  goalDays: string;
  achievedGoalDays: string;
  averagePerActiveDay: string | null;
  bestDay: { date: string; total: string } | null;
  daily: ProgressDay[];
};

type RawDay = {
  date: string;
  total: string;
  goal: string | null;
  goal_reached: boolean | null;
  remaining: string | null;
};

type RawOverview = {
  period_start: string;
  period_end: string;
  total: string;
  active_days: string;
  goal_days: string;
  achieved_goal_days: string;
  average_per_active_day: string | null;
  best_day: { date: string; total: string } | null;
  daily: RawDay[];
};

export function parseProgressOverview(raw: unknown): ProgressOverview {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("INVALID_RESPONSE");
  }
  const value = raw as RawOverview;
  if (!Array.isArray(value.daily)) throw new Error("INVALID_RESPONSE");
  return {
    periodStart: value.period_start,
    periodEnd: value.period_end,
    total: value.total,
    activeDays: value.active_days,
    goalDays: value.goal_days,
    achievedGoalDays: value.achieved_goal_days,
    averagePerActiveDay: value.average_per_active_day,
    bestDay: value.best_day,
    daily: value.daily.map((day) => ({
      date: day.date,
      total: day.total,
      goal: day.goal,
      goalReached: day.goal_reached,
      remaining: day.remaining,
    })),
  };
}
