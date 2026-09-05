import type {
  CreateEntryInput,
  EntriesGateway,
  Entry,
  EntrySummary,
} from "@/lib/entries/entries-gateway";
import type { GroupsGateway } from "@/lib/groups/groups-gateway";
import { buildDailyProgress } from "@/lib/entries/progress";

const timezone = "Europe/Berlin";
const now = "2026-09-02T10:30:00.000Z";

const entries: Entry[] = [
  ["today-1", "500", "2026-09-02", "08:00:00.000Z"],
  ["today-2", "333", "2026-09-02", "09:15:00.000Z"],
  ["today-3", "500", "2026-09-02", "10:00:00.000Z"],
  ["monday-1", "1500", "2026-09-01", "08:30:00.000Z"],
  ["sunday-1", "1100", "2026-08-31", "21:00:00.000Z"],
  ["saturday-1", "800", "2026-08-30", "19:00:00.000Z"],
  ["friday-1", "1700", "2026-08-29", "07:45:00.000Z"],
  ["thursday-1", "1200", "2026-08-28", "20:15:00.000Z"],
].map(([id, amount, entryDate, time], index) => ({
  id,
  amount,
  entryDate,
  timezone,
  recordedAtClient: `2026-09-02T${time}`,
  createdAt: `2026-09-02T${time}`,
  updatedAt: `2026-09-02T${time}`,
  revision: index + 1,
}));

const summary: EntrySummary = {
  todayTotal: "1333",
  weekTotal: "2933",
  allTimeTotal: "13482",
  todayGoal: "1500",
  achievedDays: "4",
  eligibleGoalDays: "5",
};

export function createDemoEntriesGateway(): EntriesGateway {
  return {
    async getTimeZone() {
      return timezone;
    },
    async getSummary() {
      return summary;
    },
    async getProgressOverview() {
      const daily = buildDailyProgress(entries);
      return {
        periodStart: "2026-08-27",
        periodEnd: "2026-09-02",
        total: summary.weekTotal,
        activeDays: "5",
        goalDays: "7",
        achievedGoalDays: "3",
        averagePerActiveDay: "586",
        bestDay: { date: "2026-08-29", total: "1700" },
        daily: daily.map((entry) => ({
          date: entry.date,
          total: entry.total,
          goal: summary.todayGoal,
          goalReached: Number(entry.total) >= Number(summary.todayGoal),
          remaining: String(
            Math.max(Number(summary.todayGoal) - Number(entry.total), 0),
          ),
        })),
      };
    },
    async getProgressSeries(_timezone: string, range = "week" as const) {
      const byRange = {
        week: {
          labels: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
          totals: ["1500", "1333", "0", "0", "0", "800", "1100"],
          future: 3,
        },
        month: {
          labels: ["W1", "W2", "W3", "W4", "W5"],
          totals: ["4200", "5100", "3800", "2733", "0"],
          future: 1,
        },
        year: {
          labels: [
            "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
            "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
          ],
          totals: [
            "12000", "9800", "14200", "11100", "13400", "10200",
            "12800", "15733", "4733", "0", "0", "0",
          ],
          future: 3,
        },
        all: {
          labels: ["2024", "2025", "2026"],
          totals: ["18000", "42000", "63482"],
          future: 0,
        },
      } as const;

      const selected = byRange[range];
      const buckets = selected.labels.map((label, index) => ({
        start: `${label}-${index}`,
        label,
        total: selected.totals[index],
        goalReached:
          index >= selected.labels.length - selected.future
            ? null
            : Number(selected.totals[index]) >= Number(summary.todayGoal),
        future: index >= selected.labels.length - selected.future,
      }));

      const total = buckets
        .reduce((sum, bucket) => sum + BigInt(bucket.total), 0n)
        .toString();

      return {
        range,
        periodStart: "2026-08-31",
        periodEnd: "2026-09-06",
        today: "2026-09-02",
        total,
        activeDays: String(
          buckets.filter((bucket) => Number(bucket.total) > 0).length,
        ),
        goalDays: String(buckets.length - selected.future),
        achievedGoalDays: String(
          buckets.filter((bucket) => bucket.goalReached === true).length,
        ),
        currentStreak: 2,
        longestStreak: 9,
        buckets,
      };
    },
    async list() {
      return { items: entries, nextCursor: null, hasMore: false };
    },
    async create(input: CreateEntryInput) {
      return {
        id: input.id,
        amount: String(input.amount),
        entryDate: input.entryDate,
        timezone: input.timezone,
        recordedAtClient: input.recordedAtClient,
        createdAt: now,
        updatedAt: now,
        revision: 1,
      };
    },
    async update(input) {
      const existing = entries.find((entry) => entry.id === input.id);
      if (!existing) throw new Error("NOT_FOUND");
      return {
        ...existing,
        amount: String(input.amount),
        entryDate: input.entryDate,
        revision: existing.revision + 1,
      };
    },
    async delete() {},
    async setGoal() {},
  };
}

const demoGroups = [
  {
    id: "freitagskreis",
    name: "Freitagskreis",
    timezone,
    role: "member" as const,
    memberCount: "8",
    ownWeekTotal: "2933",
    ownRank: 2,
    leaderboardAnonymous: false,
    revision: 3,
    updatedAt: now,
    calculatedAt: now,
  },
  {
    id: "familienkreis",
    name: "Familienkreis",
    timezone,
    role: "owner" as const,
    memberCount: "5",
    ownWeekTotal: "2933",
    ownRank: 1,
    leaderboardAnonymous: true,
    revision: 7,
    updatedAt: now,
    calculatedAt: now,
  },
];

export function createDemoGroupsGateway(): GroupsGateway {
  const unsupported = async () => {
    throw new Error("DEMO_ACTION_UNAVAILABLE");
  };
  return {
    async listMyGroups() {
      return { items: demoGroups };
    },
    async getLeaderboard(groupId, period) {
      const group = demoGroups.find((candidate) => candidate.id === groupId);
      if (!group) throw new Error("NOT_FOUND");
      return {
        group: {
          id: group.id,
          name: group.name,
          timezone: group.timezone,
          leaderboardAnonymous: group.leaderboardAnonymous,
          memberCount: group.memberCount,
          role: group.role,
          isOwner: group.role === "owner",
          revision: group.revision,
        },
        period,
        periodStart: "2026-08-31",
        periodEnd: "2026-09-06",
        ownRank: group.ownRank,
        ownAlias: group.leaderboardAnonymous ? "Mitglied 3" : null,
        items: [
          { rowId: "rank-1", displayName: "Amina", total: "3800", rank: 1, isSelf: false },
          { rowId: "rank-2", displayName: "Du", total: "2933", rank: 2, isSelf: true },
          { rowId: "rank-3", displayName: "Yusuf", total: "2600", rank: 3, isSelf: false },
        ],
        nextCursor: null,
        hasMore: false,
        calculatedAt: now,
      };
    },
    async getInsights(
      groupId: string,
      period: "week" | "month" | "all" = "week",
    ) {
      const byPeriod = {
        week: { total: "24500", goal: "31000", days: 4 },
        month: { total: "84000", goal: "120000", days: 12 },
        all: { total: "340000", goal: "500000", days: 1 },
      } as const;
      const selected = byPeriod[period];
      const remaining = String(
        Math.max(0, Number(selected.goal) - Number(selected.total)),
      );
      const activeMembers = 6;
      return {
        groupId,
        period,
        periodTotal: selected.total,
        weekTotal: byPeriod.week.total,
        activeMembers: String(activeMembers),
        totalMembers: "9",
        weeklyAverage: String(
          Math.floor(Number(selected.total) / activeMembers),
        ),
        goalAmount: selected.goal,
        remaining,
        daysRemaining: selected.days,
        groupPerDay: String(Math.ceil(Number(remaining) / selected.days)),
        perPersonRemaining: String(
          Math.ceil(Number(remaining) / activeMembers),
        ),
        perPersonPerDay: String(
          Math.ceil(Number(remaining) / (activeMembers * selected.days)),
        ),
      };
    },
    createGroup: unsupported,
    setLeaderboardAnonymity: unsupported,
    async setGroupGoal(groupId, period, amount, expectedRevision) {
      return {
        groupId,
        period,
        effectiveFrom: "2026-09-01",
        amount: String(amount),
        revision: expectedRevision + 1,
      };
    },
    createInvite: unsupported,
    listInvites: unsupported,
    revokeInvite: unsupported,
    previewInvite: unsupported,
    acceptInvite: unsupported,
    listGroupMembers: unsupported,
    updateGroupName: unsupported,
    removeGroupMember: unsupported,
    leaveGroup: unsupported,
    transferGroupOwnership: unsupported,
    deleteGroup: unsupported,
  };
}

/**
 * Profile used by the local preview so the account screen can be reviewed
 * without a backend session.
 */
export function createDemoSettingsGateway() {
  return {
    async loadProfile() {
      return {
        displayName: "Amina",
        timeZone: timezone,
        locale: "de" as const,
      };
    },
  };
}
