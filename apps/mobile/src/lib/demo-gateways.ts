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
    async getInsights(groupId: string) {
      return {
        groupId,
        weekTotal: "24500",
        activeMembers: "6",
        weeklyAverage: "4083",
        goalAmount: "31000",
        remaining: "6500",
        daysRemaining: 4,
        perPersonRemaining: "1084",
        perPersonPerDay: "271",
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
