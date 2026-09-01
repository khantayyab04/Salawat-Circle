import { GroupsError, toGroupsError } from "./errors";
import type { GroupsGateway } from "./groups-gateway";
import {
  createEmptyLeaderboardState,
  createGroupsSnapshot,
  ensureLeaderboardState,
  type GroupsMutationKind,
  type GroupsStore,
} from "./groups-store";
import type {
  AppLocale,
  CreateInviteOptions,
  GroupInvite,
  GroupLeaderboardRow,
  GroupListItem,
  InviteKind,
  LeaderboardPeriod,
} from "./types";

type ControllerOptions = {
  isOnline: () => Promise<boolean>;
  createId?: () => string;
  leaderboardPageSize?: number;
};

export type LoadLeaderboardOptions = {
  mode?: "reset" | "next";
};

export type RefreshGroupsOptions = {
  force?: boolean;
};

const DEFAULT_LEADERBOARD_PAGE_SIZE = 30;

export class GroupsController {
  private readonly isOnline: () => Promise<boolean>;
  private readonly createId: () => string;
  private readonly leaderboardPageSize: number;
  private readonly inflight = new Map<string, Promise<unknown>>();
  private readonly leaderboardRequestIds = new Map<string, number>();
  private session = 0;
  private groupsRequestId = 0;
  private invitesRequestId = 0;
  private previewRequestId = 0;
  private mutationQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly store: GroupsStore,
    private readonly gateway: GroupsGateway,
    options: ControllerOptions,
  ) {
    this.isOnline = options.isOnline;
    this.createId = options.createId ?? createFallbackGroupId;
    this.leaderboardPageSize = Math.max(
      1,
      options.leaderboardPageSize ?? DEFAULT_LEADERBOARD_PAGE_SIZE,
    );
  }

  private requireAccountId() {
    const accountId = this.store.getSnapshot().accountId;
    if (!accountId) throw new GroupsError("AUTH_REQUIRED");
    return accountId;
  }

  private setOnlineState(online: boolean) {
    if (this.store.getSnapshot().online === online) return;
    this.store.update((state) => {
      state.online = online;
    });
  }

  setOnline(online: boolean) {
    this.setOnlineState(online);
  }

  private async requireOnline() {
    const online = await this.isOnline();
    this.setOnlineState(online);
    if (!online) throw new GroupsError("OFFLINE");
  }

  private isSessionCurrent(session: number) {
    return this.session === session;
  }

  private replaceSnapshot(accountId: string | null) {
    this.store.replace(createGroupsSnapshot(accountId, this.store.getSnapshot().online));
  }

  async initialize(accountId: string) {
    this.session += 1;
    this.inflight.clear();
    this.leaderboardRequestIds.clear();
    this.groupsRequestId = 0;
    this.invitesRequestId = 0;
    this.previewRequestId = 0;
    this.mutationQueue = Promise.resolve();
    this.replaceSnapshot(accountId);
    await this.refreshGroups();
  }

  reset() {
    this.session += 1;
    this.inflight.clear();
    this.leaderboardRequestIds.clear();
    this.groupsRequestId = 0;
    this.invitesRequestId = 0;
    this.previewRequestId = 0;
    this.mutationQueue = Promise.resolve();
    this.replaceSnapshot(null);
  }

  private withDedup<T>(key: string, action: () => Promise<T>) {
    const existing = this.inflight.get(key) as Promise<T> | undefined;
    if (existing) return existing;
    const promise = action().finally(() => {
      if (this.inflight.get(key) === promise) {
        this.inflight.delete(key);
      }
    });
    this.inflight.set(key, promise);
    return promise;
  }

  async refreshGroups(options: RefreshGroupsOptions = {}) {
    this.requireAccountId();
    const session = this.session;
    const run = async () => {
      const requestId = this.groupsRequestId + 1;
      this.groupsRequestId = requestId;
      this.store.update((state) => {
        if (state.groups.items.length === 0) {
          state.groups.status = "loading";
        }
        state.groups.errorCode = null;
      });
      try {
        await this.requireOnline();
        const response = await this.gateway.listMyGroups();
        if (!this.isSessionCurrent(session) || this.groupsRequestId !== requestId) {
          return;
        }
        this.store.update((state) => {
          state.groups.items = response.items;
          state.groups.status = "ready";
          state.groups.errorCode = null;
        });
      } catch (error) {
        const groupsError = toGroupsError(error);
        if (!this.isSessionCurrent(session) || this.groupsRequestId !== requestId) {
          return;
        }
        this.store.update((state) => {
          state.groups.errorCode = groupsError.code;
          if (state.groups.items.length === 0) {
            state.groups.status = "error";
          }
        });
        throw groupsError;
      }
    };
    if (options.force) {
      return run();
    }
    const key = `groups:${session}`;
    return this.withDedup(key, run);
  }

  async createGroup(
    name: string,
    timezone: string,
    leaderboardAnonymous: boolean,
    rulesAccepted: boolean,
  ) {
    this.requireAccountId();
    return this.runMutation("create_group", async (session) => {
      await this.requireOnline();
      const response = await this.gateway.createGroup(
        this.createId(),
        name,
        timezone,
        leaderboardAnonymous,
        rulesAccepted,
      );
      if (!this.isSessionCurrent(session)) return response;

      try {
        await this.refreshGroups({ force: true });
      } catch {
        if (!this.isSessionCurrent(session)) return response;
        this.upsertGroup({
          id: response.group.id,
          name: response.group.name,
          timezone: response.group.timezone,
          role: "owner",
          memberCount: "1",
          ownWeekTotal: "0",
          ownRank: 1,
          leaderboardAnonymous: response.group.leaderboardAnonymous,
          revision: response.group.revision,
          updatedAt: response.group.updatedAt,
          calculatedAt: response.group.updatedAt,
        });
      }
      return response;
    });
  }

  async loadLeaderboard(
    groupId: string,
    period: LeaderboardPeriod,
    options: LoadLeaderboardOptions = {},
  ) {
    this.requireAccountId();
    const mode = options.mode ?? "reset";
    const session = this.session;
    const existingState = this.store.getSnapshot().leaderboard.byGroup[groupId]?.[period];
    const cursor = mode === "next" ? existingState?.nextCursor ?? null : null;
    const cursorKey = cursor
      ? `${cursor.rank}:${cursor.sortName}:${cursor.rowId}`
      : "start";
    const dedupKey = `leaderboard:${session}:${groupId}:${period}:${mode}:${cursorKey}`;
    const existing = this.inflight.get(dedupKey) as Promise<void> | undefined;
    if (
      mode === "next" &&
      (!existingState ||
        existingState.loading ||
        existingState.loadingMore ||
        !existingState.hasMore)
    ) {
      return;
    }
    if (existing) {
      const selected = this.store.getSnapshot().leaderboard;
      if (
        selected.selectedGroupId !== groupId ||
        selected.selectedPeriod !== period
      ) {
        this.store.update((state) => {
          state.leaderboard.selectedGroupId = groupId;
          state.leaderboard.selectedPeriod = period;
        });
      }
      return existing;
    }

    const scope = `${groupId}:${period}`;
    const requestId = (this.leaderboardRequestIds.get(scope) ?? 0) + 1;
    this.leaderboardRequestIds.set(scope, requestId);

    this.store.update((state) => {
      state.leaderboard.selectedGroupId = groupId;
      state.leaderboard.selectedPeriod = period;
      const target = ensureLeaderboardState(state, groupId, period);
      target.errorCode = null;
      if (mode === "reset") {
        target.loading = true;
        target.loadingMore = false;
      } else {
        target.loadingMore = true;
      }
    });

    return this.withDedup(dedupKey, async () => {
      try {
        await this.requireOnline();
        if (!this.isActiveLeaderboardRequest(session, scope, requestId, groupId, period)) {
          return;
        }
        if (mode === "reset") {
          this.store.update((state) => {
            const target = ensureLeaderboardState(state, groupId, period);
            Object.assign(target, createEmptyLeaderboardState(period), { loading: true });
          });
        }
        const response = await this.gateway.getLeaderboard(
          groupId,
          period,
          cursor,
          this.leaderboardPageSize,
        );
        if (!this.isActiveLeaderboardRequest(session, scope, requestId, groupId, period)) {
          return;
        }
        this.store.update((state) => {
          const target = ensureLeaderboardState(state, groupId, period);
          const items =
            mode === "reset"
              ? response.items
              : dedupeLeaderboardRows(target.items, response.items);
          target.items = items;
          target.nextCursor = response.nextCursor;
          target.hasMore = response.hasMore;
          target.loading = false;
          target.loadingMore = false;
          target.errorCode = null;
          target.calculatedAt = response.calculatedAt;
          target.group = response.group;
          target.ownAlias = response.ownAlias;
          target.ownRank = response.ownRank;
          target.periodStart = response.periodStart;
          target.periodEnd = response.periodEnd;
        });
      } catch (error) {
        const groupsError = toGroupsError(error);
        if (!this.isActiveLeaderboardRequest(session, scope, requestId, groupId, period)) {
          return;
        }
        this.store.update((state) => {
          const target = ensureLeaderboardState(state, groupId, period);
          target.loading = false;
          target.loadingMore = false;
          target.errorCode = groupsError.code;
        });
        throw groupsError;
      }
    });
  }

  async setAnonymity(
    groupId: string,
    anonymous: boolean,
    expectedRevision?: number,
  ) {
    this.requireAccountId();
    const resolvedRevision =
      expectedRevision ?? this.resolveExpectedRevision(groupId);

    return this.runMutation("set_anonymity", async (session) => {
      await this.requireOnline();
      const response = await this.gateway.setLeaderboardAnonymity(
        groupId,
        anonymous,
        resolvedRevision,
      );
      if (!this.isSessionCurrent(session)) return response;

      this.store.update((state) => {
        const groupIndex = state.groups.items.findIndex(({ id }) => id === groupId);
        if (groupIndex >= 0) {
          const group = state.groups.items[groupIndex];
          state.groups.items[groupIndex] = {
            ...group,
            leaderboardAnonymous: response.group.leaderboardAnonymous,
            revision: response.group.revision,
            updatedAt: response.group.updatedAt,
          };
        }
        if (state.leaderboard.byGroup[groupId]) {
          state.leaderboard.byGroup[groupId].week = createEmptyLeaderboardState("week");
          state.leaderboard.byGroup[groupId].all_time = createEmptyLeaderboardState(
            "all_time",
          );
        }
      });

      await this.refreshGroups({ force: true }).catch(() => undefined);

      const selected = this.store.getSnapshot().leaderboard;
      if (selected.selectedGroupId === groupId) {
        await this.loadLeaderboard(groupId, selected.selectedPeriod, { mode: "reset" }).catch(
          () => undefined,
        );
      }
      return response;
    });
  }

  async loadInvites(groupId: string) {
    this.requireAccountId();
    const session = this.session;
    const key = `invites:${session}:${groupId}`;
    return this.withDedup(key, async () => {
      const requestId = this.invitesRequestId + 1;
      this.invitesRequestId = requestId;
      this.store.update((state) => {
        const sameGroup = state.invites.groupId === groupId;
        state.invites.groupId = groupId;
        if (!sameGroup) {
          state.invites.items = [];
        }
        if (!sameGroup || state.invites.items.length === 0) {
          state.invites.status = "loading";
        }
        state.invites.errorCode = null;
      });
      try {
        await this.requireOnline();
        const response = await this.gateway.listInvites(groupId);
        if (!this.isActiveInvitesRequest(session, requestId, groupId)) {
          return;
        }
        this.store.update((state) => {
          state.invites.groupId = groupId;
          state.invites.items = response.items;
          state.invites.status = "ready";
          state.invites.errorCode = null;
        });
      } catch (error) {
        const groupsError = toGroupsError(error);
        if (!this.isActiveInvitesRequest(session, requestId, groupId)) {
          return;
        }
        this.store.update((state) => {
          state.invites.errorCode = groupsError.code;
          if (state.invites.items.length === 0) {
            state.invites.status = "error";
          }
        });
        throw groupsError;
      }
    });
  }

  async createInvite(groupId: string, options?: CreateInviteOptions) {
    this.requireAccountId();
    return this.runMutation("create_invite", async (session) => {
      await this.requireOnline();
      const response = await this.gateway.createInvite(groupId, options);
      if (!this.isSessionCurrent(session)) return response;

      this.store.update((state) => {
        if (state.invites.groupId !== groupId) return;
        const createdInvite: GroupInvite = {
          id: response.invite.id,
          groupId: response.invite.groupId,
          expiresAt: response.invite.expiresAt,
          maxUses: response.invite.maxUses,
          useCount: response.invite.useCount,
          revokedAt: response.invite.revokedAt,
          createdAt: response.invite.createdAt,
          status: "active",
        };
        const existingWithoutCreated = state.invites.items.filter(
          ({ id }) => id !== createdInvite.id,
        );
        state.invites.items = [createdInvite, ...existingWithoutCreated];
        state.invites.status = "ready";
        state.invites.errorCode = null;
      });

      return response;
    });
  }

  async revokeInvite(groupId: string, inviteId: string) {
    this.requireAccountId();
    return this.runMutation("revoke_invite", async (session) => {
      await this.requireOnline();
      const response = await this.gateway.revokeInvite(groupId, inviteId);
      if (!this.isSessionCurrent(session)) return response;
      this.store.update((state) => {
        if (state.invites.groupId !== groupId) return;
        state.invites.items = state.invites.items.map((invite) =>
          invite.id === inviteId ? response.invite : invite,
        );
        state.invites.status = "ready";
        state.invites.errorCode = null;
      });
      return response;
    });
  }

  async previewInvite(kind: InviteKind, secret: string) {
    this.requireAccountId();
    const session = this.session;
    const key = `preview:${session}:${kind}:${secret}`;
    return this.withDedup(key, async () => {
      const requestId = this.previewRequestId + 1;
      this.previewRequestId = requestId;
      this.store.update((state) => {
        state.invitePreview.status = "loading";
        state.invitePreview.errorCode = null;
        state.invitePreview.data = null;
      });

      try {
        await this.requireOnline();
        const response = await this.gateway.previewInvite(kind, secret);
        if (!this.isActivePreviewRequest(session, requestId)) {
          return;
        }
        this.store.update((state) => {
          state.invitePreview.status = "ready";
          state.invitePreview.errorCode = null;
          state.invitePreview.data = response;
        });
      } catch (error) {
        const groupsError = toGroupsError(error);
        if (!this.isActivePreviewRequest(session, requestId)) {
          return;
        }
        this.store.update((state) => {
          state.invitePreview.status = "error";
          state.invitePreview.errorCode = groupsError.code;
          state.invitePreview.data = null;
        });
        throw groupsError;
      }
    });
  }

  async acceptInvite(kind: InviteKind, secret: string, locale: AppLocale) {
    this.requireAccountId();
    return this.runMutation("accept_invite", async (session) => {
      await this.requireOnline();
      const response = await this.gateway.acceptInvite(kind, secret, locale);
      if (!this.isSessionCurrent(session)) return response;

      this.store.update((state) => {
        state.invitePreview.status = "ready";
        state.invitePreview.errorCode = null;
        state.invitePreview.data = {
          group: response.group,
          alreadyActive: response.alreadyActive,
        };
      });

      try {
        await this.refreshGroups({ force: true });
      } catch {
        if (!this.isSessionCurrent(session)) return response;
        this.upsertGroup({
          id: response.group.id,
          name: response.group.name,
          timezone: response.group.timezone,
          role: "member",
          memberCount: response.group.memberCount,
          ownWeekTotal: "0",
          ownRank: 0,
          leaderboardAnonymous: response.group.leaderboardAnonymous,
          revision: 0,
          updatedAt: response.membership.joinedAt,
          calculatedAt: response.membership.joinedAt,
        });
      }

      return response;
    });
  }

  private isActiveLeaderboardRequest(
    session: number,
    scope: string,
    requestId: number,
    groupId: string,
    period: LeaderboardPeriod,
  ) {
    if (!this.isSessionCurrent(session)) return false;
    if (this.leaderboardRequestIds.get(scope) !== requestId) return false;
    const selected = this.store.getSnapshot().leaderboard;
    return selected.selectedGroupId === groupId && selected.selectedPeriod === period;
  }

  private isActiveInvitesRequest(
    session: number,
    requestId: number,
    groupId: string,
  ) {
    if (!this.isSessionCurrent(session)) return false;
    if (this.invitesRequestId !== requestId) return false;
    return this.store.getSnapshot().invites.groupId === groupId;
  }

  private isActivePreviewRequest(session: number, requestId: number) {
    return this.isSessionCurrent(session) && this.previewRequestId === requestId;
  }

  private resolveExpectedRevision(groupId: string) {
    const snapshot = this.store.getSnapshot();
    const fromList = snapshot.groups.items.find(({ id }) => id === groupId)?.revision;
    if (typeof fromList === "number") return fromList;
    const selectedGroup = snapshot.leaderboard.byGroup[groupId];
    const selectedPeriod = snapshot.leaderboard.selectedPeriod;
    const fromLeaderboard = selectedGroup?.[selectedPeriod]?.group?.revision;
    if (typeof fromLeaderboard === "number") return fromLeaderboard;
    throw new GroupsError("NOT_FOUND");
  }

  private upsertGroup(group: GroupListItem) {
    this.store.update((state) => {
      const index = state.groups.items.findIndex(({ id }) => id === group.id);
      if (index === -1) {
        state.groups.items = [group, ...state.groups.items];
      } else {
        state.groups.items[index] = group;
      }
      state.groups.status = "ready";
      state.groups.errorCode = null;
    });
  }

  private runMutation<T>(
    kind: GroupsMutationKind,
    action: (session: number) => Promise<T>,
  ) {
    const session = this.session;
    const execute = async () => {
      if (!this.isSessionCurrent(session)) {
        throw new GroupsError("AUTH_REQUIRED");
      }

      this.store.update((state) => {
        state.mutation.pending = true;
        state.mutation.kind = kind;
        state.mutation.errorCode = null;
      });

      try {
        return await action(session);
      } catch (error) {
        const groupsError = toGroupsError(error);
        if (this.isSessionCurrent(session)) {
          this.store.update((state) => {
            state.mutation.errorCode = groupsError.code;
          });
        }
        throw groupsError;
      } finally {
        if (this.isSessionCurrent(session)) {
          this.store.update((state) => {
            state.mutation.pending = false;
            state.mutation.kind = null;
          });
        }
      }
    };

    const queuedMutation = this.mutationQueue.then(execute, execute);
    this.mutationQueue = queuedMutation.then(
      () => undefined,
      () => undefined,
    );
    return queuedMutation;
  }
}

function dedupeLeaderboardRows(
  previous: GroupLeaderboardRow[],
  incoming: GroupLeaderboardRow[],
) {
  const seen = new Set(previous.map(({ rowId }) => rowId));
  return [...previous, ...incoming.filter(({ rowId }) => !seen.has(rowId))];
}

function createFallbackGroupId() {
  return `group-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
