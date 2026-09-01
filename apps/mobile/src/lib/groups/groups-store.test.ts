import { describe, expect, it, vi } from "vitest";
import { GroupsError } from "./errors";
import type { GroupsGateway } from "./groups-gateway";
import { GroupsController } from "./groups-controller";
import { GroupsStore } from "./groups-store";
import type {
  AcceptInviteResponse,
  CreateInviteResponse,
  DeleteGroupResponse,
  GroupMember,
  GroupInvite,
  GroupLeaderboardResponse,
  GroupListItem,
  InviteKind,
  LeaderboardPeriod,
  PreviewInviteResponse,
  RemoveGroupMemberResponse,
  TransferGroupOwnershipResponse,
} from "./types";

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (error: unknown) => void = () => undefined;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });
  return { promise, resolve, reject };
}

const baseGroup: GroupListItem = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
  name: "Alpha Circle",
  timezone: "Europe/Berlin",
  role: "owner",
  memberCount: "2",
  ownWeekTotal: "9",
  ownRank: 1,
  leaderboardAnonymous: false,
  revision: 3,
  updatedAt: "2026-08-31T20:00:00.000Z",
  calculatedAt: "2026-08-31T20:00:01.000Z",
};

const secondaryGroup: GroupListItem = {
  ...baseGroup,
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2",
  name: "Beta Circle",
};

const createdGroupListItem: GroupListItem = {
  ...baseGroup,
  id: "ffffffff-ffff-4fff-8fff-fffffffffff6",
  name: "Gamma Circle",
  revision: 1,
  updatedAt: "2026-08-31T22:00:00.000Z",
  calculatedAt: "2026-08-31T22:00:00.000Z",
  ownRank: 0,
  ownWeekTotal: "0",
  memberCount: "1",
};

const inviteOne: GroupInvite = {
  id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc3",
  groupId: baseGroup.id,
  expiresAt: "2026-09-07T10:00:00.000Z",
  maxUses: "25",
  useCount: "1",
  revokedAt: null,
  createdAt: "2026-08-31T10:00:00.000Z",
  status: "active",
};

const inviteTwo: GroupInvite = {
  ...inviteOne,
  id: "dddddddd-dddd-4ddd-8ddd-ddddddddddd4",
  useCount: "0",
};

const inviteWithSecret: CreateInviteResponse = {
  invite: {
    id: inviteTwo.id,
    groupId: inviteTwo.groupId,
    token: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    code: "ABCD2345EF",
    expiresAt: inviteTwo.expiresAt,
    maxUses: inviteTwo.maxUses,
    useCount: inviteTwo.useCount,
    revokedAt: null,
    createdAt: inviteTwo.createdAt,
  },
};

const previewResponse: PreviewInviteResponse = {
  group: {
    id: baseGroup.id,
    name: baseGroup.name,
    timezone: baseGroup.timezone,
    leaderboardAnonymous: true,
    memberCount: "4",
  },
  alreadyActive: false,
};

const acceptResponse: AcceptInviteResponse = {
  group: {
    id: baseGroup.id,
    name: baseGroup.name,
    timezone: baseGroup.timezone,
    leaderboardAnonymous: true,
    memberCount: "5",
  },
  membership: {
    id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee5",
    groupId: baseGroup.id,
    joinedAt: "2026-08-31T20:10:00.000Z",
    createdAt: "2026-08-31T20:10:00.000Z",
    sharingConsentVersion: "mvp08-group-sharing-v1",
  },
  alreadyActive: false,
};

const groupMembers: GroupMember[] = [
  {
    membershipId: "membership-owner",
    displayName: "Alpha Owner",
    role: "owner",
    joinedAt: "2026-08-31T19:00:00.000Z",
    isSelf: true,
  },
  {
    membershipId: "membership-member",
    displayName: "Beta Member",
    role: "member",
    joinedAt: "2026-08-31T20:00:00.000Z",
    isSelf: false,
  },
];

function leaderboardPage(
  period: LeaderboardPeriod,
  items: GroupLeaderboardResponse["items"],
  options: {
    hasMore: boolean;
    nextCursor: GroupLeaderboardResponse["nextCursor"];
    ownAlias?: string | null;
    anonymous?: boolean;
    revision?: number;
    calculatedAt?: string;
  },
): GroupLeaderboardResponse {
  return {
    group: {
      id: baseGroup.id,
      name: baseGroup.name,
      timezone: baseGroup.timezone,
      leaderboardAnonymous: options.anonymous ?? baseGroup.leaderboardAnonymous,
      memberCount: "10",
      role: "owner",
      isOwner: true,
      revision: options.revision ?? baseGroup.revision,
    },
    period,
    periodStart: period === "week" ? "2026-08-25" : null,
    periodEnd: period === "week" ? "2026-08-31" : null,
    ownRank: 1,
    ownAlias: options.ownAlias ?? "Ruhiger Garten",
    items,
    nextCursor: options.nextCursor,
    hasMore: options.hasMore,
    calculatedAt: options.calculatedAt ?? "2026-08-31T20:00:01.000Z",
  };
}

function createGateway(overrides: Partial<GroupsGateway> = {}): GroupsGateway {
  return {
    listMyGroups: vi.fn().mockResolvedValue({ items: [baseGroup] }),
    createGroup: vi.fn().mockResolvedValue({
      group: {
        id: baseGroup.id,
        name: baseGroup.name,
        timezone: baseGroup.timezone,
        status: "active",
        leaderboardAnonymous: baseGroup.leaderboardAnonymous,
        createdAt: "2026-08-31T19:00:00.000Z",
        updatedAt: "2026-08-31T19:00:00.000Z",
        revision: baseGroup.revision,
      },
      membership: {
        id: "membership-1",
        groupId: baseGroup.id,
        joinedAt: "2026-08-31T19:00:00.000Z",
        createdAt: "2026-08-31T19:00:00.000Z",
      },
    }),
    getLeaderboard: vi.fn().mockResolvedValue(
      leaderboardPage(
        "week",
        [
          {
            rowId: "row-1",
            displayName: "Ruhiger Garten",
            total: "99",
            rank: 1,
            isSelf: true,
          },
        ],
        { hasMore: false, nextCursor: null },
      ),
    ),
    setLeaderboardAnonymity: vi.fn().mockResolvedValue({
      group: {
        id: baseGroup.id,
        name: baseGroup.name,
        timezone: baseGroup.timezone,
        status: "active",
        leaderboardAnonymous: true,
        createdAt: "2026-08-31T19:00:00.000Z",
        updatedAt: "2026-08-31T21:00:00.000Z",
        revision: 4,
      },
    }),
    createInvite: vi.fn().mockResolvedValue(inviteWithSecret),
    listInvites: vi.fn().mockResolvedValue({ items: [inviteOne] }),
    revokeInvite: vi.fn().mockResolvedValue({
      invite: { ...inviteOne, status: "revoked", revokedAt: "2026-08-31T21:00:00.000Z" },
    }),
    previewInvite: vi.fn().mockResolvedValue(previewResponse),
    acceptInvite: vi.fn().mockResolvedValue(acceptResponse),
    listGroupMembers: vi.fn().mockResolvedValue({
      group: {
        id: baseGroup.id,
        name: baseGroup.name,
        timezone: baseGroup.timezone,
        leaderboardAnonymous: baseGroup.leaderboardAnonymous,
        revision: baseGroup.revision,
      },
      items: groupMembers,
      nextCursor: null,
      hasMore: false,
    }),
    updateGroupName: vi.fn().mockResolvedValue({
      group: {
        id: baseGroup.id,
        name: "Renamed Circle",
        timezone: baseGroup.timezone,
        status: "active",
        leaderboardAnonymous: baseGroup.leaderboardAnonymous,
        createdAt: baseGroup.updatedAt,
        updatedAt: "2026-08-31T21:00:00.000Z",
        revision: 4,
      },
    }),
    removeGroupMember: vi.fn().mockResolvedValue({
      group: {
        id: baseGroup.id,
        name: baseGroup.name,
        timezone: baseGroup.timezone,
        status: "active",
        leaderboardAnonymous: baseGroup.leaderboardAnonymous,
        createdAt: baseGroup.updatedAt,
        updatedAt: "2026-08-31T21:00:00.000Z",
        revision: 4,
      },
      membershipId: "membership-member",
    } satisfies RemoveGroupMemberResponse),
    leaveGroup: vi.fn().mockResolvedValue({
      groupId: baseGroup.id,
      membershipId: "membership-owner",
    }),
    transferGroupOwnership: vi.fn().mockResolvedValue({
      group: {
        id: baseGroup.id,
        name: baseGroup.name,
        timezone: baseGroup.timezone,
        status: "active",
        leaderboardAnonymous: baseGroup.leaderboardAnonymous,
        createdAt: baseGroup.updatedAt,
        updatedAt: "2026-08-31T21:00:00.000Z",
        revision: 4,
      },
    } satisfies TransferGroupOwnershipResponse),
    deleteGroup: vi.fn().mockResolvedValue({
      groupId: baseGroup.id,
    } satisfies DeleteGroupResponse),
    ...overrides,
  };
}

function setup({
  gateway = createGateway(),
  isOnline = async () => true,
  createId = () => "generated-group-id",
}: {
  gateway?: GroupsGateway;
  isOnline?: () => Promise<boolean>;
  createId?: () => string;
} = {}) {
  const store = new GroupsStore();
  const controller = new GroupsController(store, gateway, {
    isOnline,
    createId,
    leaderboardPageSize: 2,
  });
  return { store, controller, gateway };
}

describe("GroupsController / GroupsStore", () => {
  it("publishes a new root snapshot after every update", () => {
    const store = new GroupsStore("account-1");
    const before = store.getSnapshot();

    store.update((state) => {
      state.groups.status = "ready";
      state.groups.items = [baseGroup];
    });

    const after = store.getSnapshot();
    expect(after).not.toBe(before);
    expect(after.groups.status).toBe("ready");
    expect(after.groups.items).toEqual([baseGroup]);
  });

  it("initializes account state and loads groups", async () => {
    const { controller, store } = setup();

    await controller.initialize("account-1");

    expect(store.getSnapshot().accountId).toBe("account-1");
    expect(store.getSnapshot().groups.status).toBe("ready");
    expect(store.getSnapshot().groups.items).toEqual([baseGroup]);
    expect(store.getSnapshot().groups.errorCode).toBeNull();
  });

  it("loads members and applies management mutations to the active snapshot", async () => {
    const { controller, store } = setup();
    await controller.initialize("account-1");

    await controller.loadMembers(baseGroup.id);
    expect(store.getSnapshot().members).toMatchObject({
      groupId: baseGroup.id,
      status: "ready",
      items: groupMembers,
      hasMore: false,
    });

    await controller.updateGroupName(baseGroup.id, "Renamed Circle", 3);
    expect(store.getSnapshot().groups.items[0]).toMatchObject({
      name: "Renamed Circle",
      revision: 4,
    });

    await controller.removeMember(baseGroup.id, "membership-member", 4);
    expect(store.getSnapshot().members.items).toEqual([groupMembers[0]]);

    await controller.leaveGroup(baseGroup.id);
    expect(store.getSnapshot().groups.items).toEqual([]);
    expect(store.getSnapshot().members.groupId).toBeNull();
  });

  it("removes a deleted group from every client collection", async () => {
    const { controller, store } = setup();
    await controller.initialize("account-1");
    await controller.loadMembers(baseGroup.id);
    await controller.loadLeaderboard(baseGroup.id, "week");

    await controller.deleteGroup(baseGroup.id, 3);

    expect(store.getSnapshot().groups.items).toEqual([]);
    expect(store.getSnapshot().members.groupId).toBeNull();
    expect(store.getSnapshot().leaderboard.byGroup[baseGroup.id]).toBeUndefined();
  });

  it("returns OFFLINE on refresh while keeping existing groups stable", async () => {
    let online = true;
    const { controller, store } = setup({
      isOnline: async () => online,
    });
    await controller.initialize("account-1");

    online = false;

    await expect(controller.refreshGroups()).rejects.toEqual(new GroupsError("OFFLINE"));
    expect(store.getSnapshot().groups.items).toEqual([baseGroup]);
    expect(store.getSnapshot().groups.status).toBe("ready");
    expect(store.getSnapshot().groups.errorCode).toBe("OFFLINE");
  });

  it("deduplicates concurrent refreshGroups calls", async () => {
    const pending = deferred<{ items: GroupListItem[] }>();
    const listMyGroups = vi
      .fn<GroupsGateway["listMyGroups"]>()
      .mockResolvedValueOnce({ items: [baseGroup] })
      .mockImplementationOnce(() => pending.promise);
    const { controller } = setup({
      gateway: createGateway({ listMyGroups }),
    });
    await controller.initialize("account-1");

    const first = controller.refreshGroups();
    const second = controller.refreshGroups();

    pending.resolve({ items: [baseGroup] });
    await Promise.all([first, second]);
    expect(listMyGroups).toHaveBeenCalledTimes(2);
  });

  it("queues concurrent distinct mutations so both execute and return their own result", async () => {
    const createDeferred = deferred<CreateInviteResponse>();
    const createdInvite: CreateInviteResponse = {
      invite: {
        ...inviteWithSecret.invite,
        id: "00000000-0000-4000-8000-000000000001",
      },
    };
    const revokedInvite: GroupInvite = {
      ...inviteOne,
      status: "revoked",
      revokedAt: "2026-08-31T22:00:00.000Z",
    };
    const createInvite = vi
      .fn<GroupsGateway["createInvite"]>()
      .mockImplementation(() => createDeferred.promise);
    const revokeInvite = vi
      .fn<GroupsGateway["revokeInvite"]>()
      .mockResolvedValue({ invite: revokedInvite });
    const { controller } = setup({
      gateway: createGateway({ createInvite, revokeInvite }),
    });
    await controller.initialize("account-1");

    const first = controller.createInvite(baseGroup.id);
    const second = controller.revokeInvite(baseGroup.id, inviteOne.id);
    expect(revokeInvite).toHaveBeenCalledTimes(0);

    createDeferred.resolve(createdInvite);
    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(firstResult).toEqual(createdInvite);
    expect(secondResult).toEqual({ invite: revokedInvite });
    expect(createInvite).toHaveBeenCalledTimes(1);
    expect(revokeInvite).toHaveBeenCalledTimes(1);
  });

  it("paginates leaderboard rows without duplicate row_id and preserves items on next-page error", async () => {
    const getLeaderboard = vi
      .fn<GroupsGateway["getLeaderboard"]>()
      .mockResolvedValueOnce(
        leaderboardPage(
          "week",
          [
            { rowId: "row-1", displayName: "Self", total: "9", rank: 1, isSelf: true },
            { rowId: "row-2", displayName: "Peer", total: "7", rank: 2, isSelf: false },
          ],
          {
            hasMore: true,
            nextCursor: { rank: 2, sortName: "peer", rowId: "row-2" },
          },
        ),
      )
      .mockResolvedValueOnce(
        leaderboardPage(
          "week",
          [
            { rowId: "row-2", displayName: "Peer", total: "7", rank: 2, isSelf: false },
            { rowId: "row-3", displayName: "New Peer", total: "6", rank: 3, isSelf: false },
          ],
          {
            hasMore: true,
            nextCursor: { rank: 3, sortName: "new peer", rowId: "row-3" },
          },
        ),
      )
      .mockRejectedValueOnce(new Error("INTERNAL"));
    const { controller, store } = setup({
      gateway: createGateway({ getLeaderboard }),
    });
    await controller.initialize("account-1");

    await controller.loadLeaderboard(baseGroup.id, "week", { mode: "reset" });
    await controller.loadLeaderboard(baseGroup.id, "week", { mode: "next" });

    expect(
      store.getSnapshot().leaderboard.byGroup[baseGroup.id].week.items.map((row) => row.rowId),
    ).toEqual(["row-1", "row-2", "row-3"]);

    await expect(
      controller.loadLeaderboard(baseGroup.id, "week", { mode: "next" }),
    ).rejects.toEqual(new GroupsError("INTERNAL"));

    const week = store.getSnapshot().leaderboard.byGroup[baseGroup.id].week;
    expect(week.items.map((row) => row.rowId)).toEqual(["row-1", "row-2", "row-3"]);
    expect(week.hasMore).toBe(true);
    expect(week.errorCode).toBe("INTERNAL");
  });

  it("ignores stale leaderboard responses after period switch", async () => {
    const slowWeek = deferred<GroupLeaderboardResponse>();
    const getLeaderboard = vi.fn<GroupsGateway["getLeaderboard"]>((_, period) => {
      if (period === "week") return slowWeek.promise;
      return Promise.resolve(
        leaderboardPage(
          "all_time",
          [{ rowId: "all-1", displayName: "All Time", total: "50", rank: 1, isSelf: true }],
          { hasMore: false, nextCursor: null, ownAlias: "Sanfter Stern" },
        ),
      );
    });
    const { controller, store } = setup({
      gateway: createGateway({ getLeaderboard }),
    });
    await controller.initialize("account-1");

    const weekLoad = controller.loadLeaderboard(baseGroup.id, "week", { mode: "reset" });
    await controller.loadLeaderboard(baseGroup.id, "all_time", { mode: "reset" });
    slowWeek.resolve(
      leaderboardPage(
        "week",
        [{ rowId: "week-1", displayName: "Week", total: "20", rank: 1, isSelf: true }],
        { hasMore: false, nextCursor: null },
      ),
    );
    await weekLoad;

    const allTime = store.getSnapshot().leaderboard.byGroup[baseGroup.id].all_time;
    const week = store.getSnapshot().leaderboard.byGroup[baseGroup.id].week;
    expect(store.getSnapshot().leaderboard.selectedPeriod).toBe("all_time");
    expect(allTime.items.map((row) => row.rowId)).toEqual(["all-1"]);
    expect(week.items).toEqual([]);
  });

  it("keeps week selected when it is re-selected while the same week request is still in-flight", async () => {
    const slowWeek = deferred<GroupLeaderboardResponse>();
    const getLeaderboard = vi.fn<GroupsGateway["getLeaderboard"]>((_, period) => {
      if (period === "week") return slowWeek.promise;
      return Promise.resolve(
        leaderboardPage(
          "all_time",
          [{ rowId: "all-1", displayName: "All Time", total: "50", rank: 1, isSelf: true }],
          { hasMore: false, nextCursor: null, ownAlias: "Sanfter Stern" },
        ),
      );
    });
    const { controller, store } = setup({
      gateway: createGateway({ getLeaderboard }),
    });
    await controller.initialize("account-1");

    const firstWeekLoad = controller.loadLeaderboard(baseGroup.id, "week", { mode: "reset" });
    await controller.loadLeaderboard(baseGroup.id, "all_time", { mode: "reset" });
    const secondWeekLoad = controller.loadLeaderboard(baseGroup.id, "week", { mode: "reset" });

    expect(store.getSnapshot().leaderboard.selectedPeriod).toBe("week");

    slowWeek.resolve(
      leaderboardPage(
        "week",
        [{ rowId: "week-1", displayName: "Week", total: "20", rank: 1, isSelf: true }],
        { hasMore: false, nextCursor: null },
      ),
    );

    await Promise.all([firstWeekLoad, secondWeekLoad]);
    const week = store.getSnapshot().leaderboard.byGroup[baseGroup.id].week;
    expect(store.getSnapshot().leaderboard.selectedPeriod).toBe("week");
    expect(week.loading).toBe(false);
    expect(week.items.map((row) => row.rowId)).toEqual(["week-1"]);
  });

  it("preserves visible leaderboard rows and cursor when reset is requested while offline", async () => {
    let online = true;
    const getLeaderboard = vi
      .fn<GroupsGateway["getLeaderboard"]>()
      .mockResolvedValueOnce(
        leaderboardPage(
          "week",
          [
            { rowId: "row-1", displayName: "Self", total: "9", rank: 1, isSelf: true },
            { rowId: "row-2", displayName: "Peer", total: "7", rank: 2, isSelf: false },
          ],
          {
            hasMore: true,
            nextCursor: { rank: 2, sortName: "peer", rowId: "row-2" },
          },
        ),
      );
    const { controller, store } = setup({
      gateway: createGateway({ getLeaderboard }),
      isOnline: async () => online,
    });
    await controller.initialize("account-1");
    await controller.loadLeaderboard(baseGroup.id, "week", { mode: "reset" });

    const beforeOfflineReset = store.getSnapshot().leaderboard.byGroup[baseGroup.id].week;
    online = false;

    await expect(
      controller.loadLeaderboard(baseGroup.id, "week", { mode: "reset" }),
    ).rejects.toEqual(new GroupsError("OFFLINE"));

    const afterOfflineReset = store.getSnapshot().leaderboard.byGroup[baseGroup.id].week;
    expect(afterOfflineReset.items).toEqual(beforeOfflineReset.items);
    expect(afterOfflineReset.nextCursor).toEqual(beforeOfflineReset.nextCursor);
    expect(afterOfflineReset.hasMore).toBe(true);
    expect(afterOfflineReset.errorCode).toBe("OFFLINE");
  });

  it("updates group metadata on setAnonymity and reloads selected leaderboard", async () => {
    const getLeaderboard = vi
      .fn<GroupsGateway["getLeaderboard"]>()
      .mockResolvedValueOnce(
        leaderboardPage(
          "week",
          [{ rowId: "named-1", displayName: "Named", total: "12", rank: 1, isSelf: true }],
          { hasMore: false, nextCursor: null, anonymous: false, revision: 3 },
        ),
      )
      .mockResolvedValueOnce(
        leaderboardPage(
          "week",
          [{ rowId: "anon-1", displayName: "Ruhiger Garten", total: "12", rank: 1, isSelf: true }],
          { hasMore: false, nextCursor: null, anonymous: true, revision: 4 },
        ),
      );
    const setLeaderboardAnonymity = vi.fn<GroupsGateway["setLeaderboardAnonymity"]>().mockResolvedValue({
      group: {
        id: baseGroup.id,
        name: baseGroup.name,
        timezone: baseGroup.timezone,
        status: "active",
        leaderboardAnonymous: true,
        createdAt: "2026-08-31T19:00:00.000Z",
        updatedAt: "2026-08-31T21:00:00.000Z",
        revision: 4,
      },
    });
    const { controller, store } = setup({
      gateway: createGateway({ getLeaderboard, setLeaderboardAnonymity }),
    });
    await controller.initialize("account-1");
    await controller.loadLeaderboard(baseGroup.id, "week", { mode: "reset" });

    await controller.setAnonymity(baseGroup.id, true);

    expect(setLeaderboardAnonymity).toHaveBeenCalledWith(baseGroup.id, true, 3);
    expect(store.getSnapshot().groups.items[0]).toMatchObject({
      leaderboardAnonymous: true,
      revision: 4,
    });
    expect(
      store.getSnapshot().leaderboard.byGroup[baseGroup.id].week.group?.leaderboardAnonymous,
    ).toBe(true);
  });

  it("loads invites and applies create/revoke updates without storing secrets", async () => {
    const { controller, store } = setup();
    await controller.initialize("account-1");

    await controller.loadInvites(baseGroup.id);
    await controller.createInvite(baseGroup.id);
    await controller.revokeInvite(baseGroup.id, inviteOne.id);

    const invites = store.getSnapshot().invites;
    expect(invites.status).toBe("ready");
    expect(invites.items.map((invite) => invite.id)).toEqual([inviteTwo.id, inviteOne.id]);
    expect(invites.items[0]).toMatchObject({
      id: inviteTwo.id,
      status: "active",
    });
    expect("token" in (invites.items[0] as unknown as Record<string, unknown>)).toBe(false);
    expect(
      invites.items.find((invite) => invite.id === inviteOne.id),
    ).toMatchObject({ status: "revoked" });
  });

  it("previews and accepts invites, then refreshes groups", async () => {
    const listMyGroups = vi
      .fn<GroupsGateway["listMyGroups"]>()
      .mockResolvedValueOnce({ items: [baseGroup] })
      .mockResolvedValueOnce({ items: [secondaryGroup] });
    const { controller, store } = setup({
      gateway: createGateway({ listMyGroups }),
    });
    await controller.initialize("account-1");

    await controller.previewInvite("code", "ABCD2345EF");
    await controller.acceptInvite("token", "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", "de");

    expect(store.getSnapshot().invitePreview.status).toBe("ready");
    expect(store.getSnapshot().invitePreview.data).toEqual({
      alreadyActive: acceptResponse.alreadyActive,
      group: acceptResponse.group,
    });
    expect(store.getSnapshot().groups.items).toEqual([secondaryGroup]);
    expect(store.getSnapshot().mutation.errorCode).toBeNull();
  });

  it("refreshes groups again after createGroup even when a pre-mutation refresh is already in-flight", async () => {
    const staleRefresh = deferred<{ items: GroupListItem[] }>();
    const listMyGroups = vi
      .fn<GroupsGateway["listMyGroups"]>()
      .mockResolvedValueOnce({ items: [baseGroup] })
      .mockImplementationOnce(() => staleRefresh.promise)
      .mockResolvedValueOnce({ items: [baseGroup, createdGroupListItem] });
    const createGroup = vi.fn<GroupsGateway["createGroup"]>().mockResolvedValue({
      group: {
        id: createdGroupListItem.id,
        name: createdGroupListItem.name,
        timezone: createdGroupListItem.timezone,
        status: "active",
        leaderboardAnonymous: createdGroupListItem.leaderboardAnonymous,
        createdAt: "2026-08-31T22:00:00.000Z",
        updatedAt: "2026-08-31T22:00:00.000Z",
        revision: createdGroupListItem.revision,
      },
      membership: {
        id: "membership-new",
        groupId: createdGroupListItem.id,
        joinedAt: "2026-08-31T22:00:00.000Z",
        createdAt: "2026-08-31T22:00:00.000Z",
      },
    });

    const { controller, store } = setup({
      gateway: createGateway({ listMyGroups, createGroup }),
      createId: () => createdGroupListItem.id,
    });
    await controller.initialize("account-1");

    const stalePromise = controller.refreshGroups();
    const createPromise = controller.createGroup("Gamma Circle", "Europe/Berlin", false, true);

    await createPromise;
    expect(listMyGroups).toHaveBeenCalledTimes(3);
    expect(store.getSnapshot().groups.items).toEqual([baseGroup, createdGroupListItem]);

    staleRefresh.resolve({ items: [baseGroup] });
    await stalePromise;
    expect(store.getSnapshot().groups.items).toEqual([baseGroup, createdGroupListItem]);
  });

  it("refreshes groups again after acceptInvite even when a pre-mutation refresh is already in-flight", async () => {
    const staleRefresh = deferred<{ items: GroupListItem[] }>();
    const listMyGroups = vi
      .fn<GroupsGateway["listMyGroups"]>()
      .mockResolvedValueOnce({ items: [baseGroup] })
      .mockImplementationOnce(() => staleRefresh.promise)
      .mockResolvedValueOnce({ items: [secondaryGroup] });
    const { controller, store } = setup({
      gateway: createGateway({ listMyGroups }),
    });
    await controller.initialize("account-1");

    const stalePromise = controller.refreshGroups();
    const acceptPromise = controller.acceptInvite(
      "token",
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      "de",
    );

    await acceptPromise;
    expect(listMyGroups).toHaveBeenCalledTimes(3);
    expect(store.getSnapshot().groups.items).toEqual([secondaryGroup]);

    staleRefresh.resolve({ items: [baseGroup] });
    await stalePromise;
    expect(store.getSnapshot().groups.items).toEqual([secondaryGroup]);
  });

  it("guards all online-only operations before hitting the gateway", async () => {
    const gateway = createGateway();
    let online = true;
    const { controller, store } = setup({
      gateway,
      isOnline: async () => online,
    });
    await controller.initialize("account-1");
    online = false;

    await expect(
      controller.createGroup("New Group", "Europe/Berlin", false, true),
    ).rejects.toEqual(new GroupsError("OFFLINE"));
    await expect(
      controller.loadLeaderboard(baseGroup.id, "week", { mode: "reset" }),
    ).rejects.toEqual(new GroupsError("OFFLINE"));
    await expect(controller.loadInvites(baseGroup.id)).rejects.toEqual(
      new GroupsError("OFFLINE"),
    );
    await expect(controller.createInvite(baseGroup.id)).rejects.toEqual(
      new GroupsError("OFFLINE"),
    );
    await expect(controller.previewInvite("code", "ABCD2345EF")).rejects.toEqual(
      new GroupsError("OFFLINE"),
    );
    await expect(
      controller.acceptInvite("code", "ABCD2345EF", "de"),
    ).rejects.toEqual(new GroupsError("OFFLINE"));

    expect(gateway.createGroup).toHaveBeenCalledTimes(0);
    expect(gateway.getLeaderboard).toHaveBeenCalledTimes(0);
    expect(gateway.listInvites).toHaveBeenCalledTimes(0);
    expect(gateway.createInvite).toHaveBeenCalledTimes(0);
    expect(gateway.previewInvite).toHaveBeenCalledTimes(0);
    expect(gateway.acceptInvite).toHaveBeenCalledTimes(0);
    expect(store.getSnapshot().mutation.errorCode).toBe("OFFLINE");
  });

  it("clears state on account switch and ignores stale account responses", async () => {
    const firstLoad = deferred<{ items: GroupListItem[] }>();
    const listMyGroups = vi
      .fn<GroupsGateway["listMyGroups"]>()
      .mockImplementationOnce(() => firstLoad.promise)
      .mockResolvedValueOnce({ items: [secondaryGroup] });
    const { controller, store } = setup({
      gateway: createGateway({ listMyGroups }),
    });

    const accountOne = controller.initialize("account-1");
    expect(store.getSnapshot().accountId).toBe("account-1");
    expect(store.getSnapshot().groups.items).toEqual([]);

    const accountTwo = controller.initialize("account-2");
    await accountTwo;
    firstLoad.resolve({ items: [baseGroup] });
    await accountOne;

    expect(store.getSnapshot().accountId).toBe("account-2");
    expect(store.getSnapshot().groups.items).toEqual([secondaryGroup]);

    controller.reset();
    expect(store.getSnapshot().accountId).toBeNull();
    expect(store.getSnapshot().groups.items).toEqual([]);
    expect(store.getSnapshot().leaderboard.byGroup).toEqual({});
    expect(store.getSnapshot().invites.items).toEqual([]);
    expect(store.getSnapshot().invitePreview.data).toBeNull();
  });

  it("deduplicates concurrent identical leaderboard loads", async () => {
    const pending = deferred<GroupLeaderboardResponse>();
    const getLeaderboard = vi
      .fn<GroupsGateway["getLeaderboard"]>()
      .mockImplementation(() => pending.promise);
    const { controller } = setup({
      gateway: createGateway({ getLeaderboard }),
    });
    await controller.initialize("account-1");

    const first = controller.loadLeaderboard(baseGroup.id, "week", { mode: "reset" });
    const second = controller.loadLeaderboard(baseGroup.id, "week", { mode: "reset" });

    pending.resolve(
      leaderboardPage(
        "week",
        [{ rowId: "one", displayName: "One", total: "1", rank: 1, isSelf: true }],
        { hasMore: false, nextCursor: null },
      ),
    );
    await Promise.all([first, second]);
    expect(getLeaderboard).toHaveBeenCalledTimes(1);
  });

  it("does not emit a redundant store update when a deduped request keeps the same leaderboard selection", async () => {
    const pending = deferred<GroupLeaderboardResponse>();
    const getLeaderboard = vi
      .fn<GroupsGateway["getLeaderboard"]>()
      .mockImplementation(() => pending.promise);
    const { controller, store } = setup({
      gateway: createGateway({ getLeaderboard }),
    });
    await controller.initialize("account-1");

    const first = controller.loadLeaderboard(baseGroup.id, "week", { mode: "reset" });
    const versionBeforeDedup = store.getVersion();
    const second = controller.loadLeaderboard(baseGroup.id, "week", { mode: "reset" });

    expect(store.getVersion()).toBe(versionBeforeDedup);

    pending.resolve(
      leaderboardPage(
        "week",
        [{ rowId: "one", displayName: "One", total: "1", rank: 1, isSelf: true }],
        { hasMore: false, nextCursor: null },
      ),
    );
    await Promise.all([first, second]);
  });

  it("subscribes via GroupsStore observable updates", async () => {
    const { controller, store } = setup();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    await controller.initialize("account-1");
    unsubscribe();
    await controller.refreshGroups();

    expect(listener).toHaveBeenCalled();
    const callsAfterUnsubscribe = listener.mock.calls.length;
    await controller.refreshGroups();
    expect(listener.mock.calls.length).toBe(callsAfterUnsubscribe);
  });

  it.each([
    ["createGroup", (controller: GroupsController) => controller.createGroup("A", "Europe/Berlin", false, true)],
    ["loadInvites", (controller: GroupsController) => controller.loadInvites(baseGroup.id)],
    ["createInvite", (controller: GroupsController) => controller.createInvite(baseGroup.id)],
    ["previewInvite", (controller: GroupsController) => controller.previewInvite("token" as InviteKind, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")],
  ])("returns AUTH_REQUIRED when %s is called before initialize", async (_, invoke) => {
    const { controller } = setup();

    await expect(invoke(controller)).rejects.toEqual(new GroupsError("AUTH_REQUIRED"));
  });
});
