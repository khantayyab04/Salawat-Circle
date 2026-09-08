import type { LeaderboardPeriod } from "./types";

/**
 * The periods the group detail screen offers.
 *
 * The leaderboard RPC names its unbounded period `all_time` while goals and
 * insights call the same thing `all`, so the mapping lives here rather than
 * being repeated at every call site.
 */
export const GROUP_PERIODS = ["week", "month", "all"] as const;

export type GroupPeriod = (typeof GROUP_PERIODS)[number];

export function isGroupPeriod(value: string): value is GroupPeriod {
  return (GROUP_PERIODS as readonly string[]).includes(value);
}

export function leaderboardPeriodFor(period: GroupPeriod): LeaderboardPeriod {
  return period === "all" ? "all_time" : period;
}
