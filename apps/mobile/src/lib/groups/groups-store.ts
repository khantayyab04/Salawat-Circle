import type { GroupsErrorCode } from "./errors";
import type {
  GroupInvite,
  GroupLeaderboardCursor,
  GroupLeaderboardGroup,
  GroupLeaderboardRow,
  GroupListItem,
  LeaderboardPeriod,
  PreviewInviteResponse,
} from "./types";

export type GroupsLoadStatus = "idle" | "loading" | "ready" | "error";

export type GroupsCollectionState = {
  status: GroupsLoadStatus;
  items: GroupListItem[];
  errorCode: GroupsErrorCode | null;
};

export type GroupsLeaderboardPeriodState = {
  period: LeaderboardPeriod;
  loading: boolean;
  loadingMore: boolean;
  errorCode: GroupsErrorCode | null;
  items: GroupLeaderboardRow[];
  nextCursor: GroupLeaderboardCursor | null;
  hasMore: boolean;
  calculatedAt: string | null;
  group: GroupLeaderboardGroup | null;
  ownAlias: string | null;
  ownRank: number | null;
  periodStart: string | null;
  periodEnd: string | null;
};

export type GroupsLeaderboardByGroup = Record<
  string,
  {
    week: GroupsLeaderboardPeriodState;
    all_time: GroupsLeaderboardPeriodState;
  }
>;

export type GroupsInvitesState = {
  groupId: string | null;
  status: GroupsLoadStatus;
  items: GroupInvite[];
  errorCode: GroupsErrorCode | null;
};

export type GroupsInvitePreviewState = {
  status: GroupsLoadStatus;
  data: PreviewInviteResponse | null;
  errorCode: GroupsErrorCode | null;
};

export type GroupsMutationKind =
  | "create_group"
  | "set_anonymity"
  | "create_invite"
  | "revoke_invite"
  | "accept_invite"
  | null;

export type GroupsMutationState = {
  pending: boolean;
  kind: GroupsMutationKind;
  errorCode: GroupsErrorCode | null;
};

export type GroupsSnapshot = {
  accountId: string | null;
  online: boolean;
  groups: GroupsCollectionState;
  leaderboard: {
    selectedGroupId: string | null;
    selectedPeriod: LeaderboardPeriod;
    byGroup: GroupsLeaderboardByGroup;
  };
  invites: GroupsInvitesState;
  invitePreview: GroupsInvitePreviewState;
  mutation: GroupsMutationState;
};

export function createEmptyLeaderboardState(
  period: LeaderboardPeriod,
): GroupsLeaderboardPeriodState {
  return {
    period,
    loading: false,
    loadingMore: false,
    errorCode: null,
    items: [],
    nextCursor: null,
    hasMore: false,
    calculatedAt: null,
    group: null,
    ownAlias: null,
    ownRank: null,
    periodStart: null,
    periodEnd: null,
  };
}

export function createGroupsSnapshot(
  accountId: string | null = null,
  online = true,
): GroupsSnapshot {
  return {
    accountId,
    online,
    groups: {
      status: "idle",
      items: [],
      errorCode: null,
    },
    leaderboard: {
      selectedGroupId: null,
      selectedPeriod: "week",
      byGroup: {},
    },
    invites: {
      groupId: null,
      status: "idle",
      items: [],
      errorCode: null,
    },
    invitePreview: {
      status: "idle",
      data: null,
      errorCode: null,
    },
    mutation: {
      pending: false,
      kind: null,
      errorCode: null,
    },
  };
}

export function ensureLeaderboardState(
  snapshot: GroupsSnapshot,
  groupId: string,
  period: LeaderboardPeriod,
): GroupsLeaderboardPeriodState {
  if (!snapshot.leaderboard.byGroup[groupId]) {
    snapshot.leaderboard.byGroup[groupId] = {
      week: createEmptyLeaderboardState("week"),
      all_time: createEmptyLeaderboardState("all_time"),
    };
  }
  const state = snapshot.leaderboard.byGroup[groupId][period];
  if (state.period !== period) {
    snapshot.leaderboard.byGroup[groupId][period] = createEmptyLeaderboardState(period);
  }
  return snapshot.leaderboard.byGroup[groupId][period];
}

export class GroupsStore {
  private snapshot: GroupsSnapshot;
  private readonly listeners = new Set<() => void>();
  private version = 0;

  constructor(accountId: string | null = null, online = true) {
    this.snapshot = createGroupsSnapshot(accountId, online);
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getVersion() {
    return this.version;
  }

  getSnapshot() {
    return this.snapshot;
  }

  replace(snapshot: GroupsSnapshot) {
    this.snapshot = snapshot;
    this.notify();
  }

  update(mutator: (snapshot: GroupsSnapshot) => void) {
    mutator(this.snapshot);
    this.snapshot = { ...this.snapshot };
    this.notify();
  }

  private notify() {
    this.version += 1;
    this.listeners.forEach((listener) => listener());
  }
}
