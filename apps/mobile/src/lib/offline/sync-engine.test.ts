import { describe, expect, it, vi } from "vitest";
import type { EntriesGateway, Entry } from "@/lib/entries/entries-gateway";
import { SyncEngine } from "./sync-engine";
import { emptyOfflineState, type OfflineAccountState } from "./types";

const now = "2026-08-31T10:00:00.000Z";
const entry: Entry = {
  id: "entry-1",
  amount: "42",
  entryDate: "2026-08-31",
  timezone: "Europe/Berlin",
  recordedAtClient: now,
  createdAt: now,
  updatedAt: now,
  revision: 1,
};

function gateway(overrides: Partial<EntriesGateway> = {}): EntriesGateway {
  return {
    getTimeZone: vi.fn(),
    getSummary: vi.fn().mockResolvedValue({
      todayTotal: "42",
      weekTotal: "42",
      allTimeTotal: "42",
      todayGoal: null,
      achievedDays: "0",
      eligibleGoalDays: "0",
    }),
    list: vi.fn(),
    getEntry: vi.fn().mockResolvedValue(entry),
    create: vi.fn().mockResolvedValue(entry),
    update: vi.fn().mockResolvedValue(entry),
    delete: vi.fn().mockResolvedValue(undefined),
    setGoal: vi.fn().mockResolvedValue(undefined),
    refreshSession: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function pendingCreate(): OfflineAccountState {
  const state = emptyOfflineState();
  state.timeZone = "Europe/Berlin";
  state.entries = [
    {
      ...entry,
      revision: 0,
      serverRevision: null,
      localState: "pending_create",
      lastAttemptAt: null,
      retryCount: 0,
      lastErrorCode: null,
    },
  ];
  state.queue = [
    {
      id: "mutation-1",
      entity: "entry",
      operation: "create",
      entityId: entry.id,
      payload: {
        amount: 42,
        entryDate: entry.entryDate,
        timezone: entry.timezone,
        recordedAtClient: entry.recordedAtClient,
      },
      expectedRevision: null,
      createdAt: now,
      status: "pending",
      lastAttemptAt: null,
      retryCount: 0,
      lastErrorCode: null,
      nextAttemptAt: null,
    },
  ];
  return state;
}

describe("SyncEngine", () => {
  it("marks an idempotent create as synced and removes it from the queue", async () => {
    const state = pendingCreate();
    const save = vi.fn().mockResolvedValue(undefined);

    await new SyncEngine(gateway(), { save }, () => new Date(now), () => 0).drain(
      state,
    );

    expect(state.queue).toEqual([]);
    expect(state.entries[0]).toMatchObject({
      revision: 1,
      serverRevision: 1,
      localState: "synced",
    });
    expect(save).toHaveBeenCalled();
  });

  it("keeps network failures pending with backoff and visible error metadata", async () => {
    const state = pendingCreate();

    await new SyncEngine(
      gateway({ create: vi.fn().mockRejectedValue(new Error("INTERNAL")) }),
      { save: vi.fn().mockResolvedValue(undefined) },
      () => new Date(now),
      () => 0,
    ).drain(state);

    expect(state.queue[0]).toMatchObject({
      status: "pending",
      retryCount: 1,
      lastErrorCode: "INTERNAL",
      nextAttemptAt: "2026-08-31T10:00:01.000Z",
    });
    expect(state.entries[0]).toMatchObject({
      localState: "pending_create",
      retryCount: 1,
      lastErrorCode: "INTERNAL",
    });
  });

  it("keeps terminal failures visible and manually retryable", async () => {
    const state = pendingCreate();

    await new SyncEngine(
      gateway({ create: vi.fn().mockRejectedValue(new Error("INVALID_AMOUNT")) }),
      { save: vi.fn().mockResolvedValue(undefined) },
      () => new Date(now),
    ).drain(state);

    expect(state.queue[0].status).toBe("failed");
    expect(state.entries[0].localState).toBe("failed");
  });

  it("loads the current server value for a revision conflict", async () => {
    const state = pendingCreate();
    state.entries[0] = {
      ...state.entries[0],
      amount: "50",
      revision: 3,
      serverRevision: 3,
      localState: "pending_update",
    };
    state.queue[0] = {
      id: "mutation-1",
      entity: "entry",
      operation: "update",
      entityId: entry.id,
      payload: { amount: 50, entryDate: entry.entryDate },
      expectedRevision: 3,
      createdAt: now,
      status: "pending",
      lastAttemptAt: null,
      retryCount: 0,
      lastErrorCode: null,
      nextAttemptAt: null,
    };
    const serverEntry = { ...entry, amount: "45", revision: 4 };

    await new SyncEngine(
      gateway({
        update: vi
          .fn()
          .mockRejectedValue(new Error("ENTRY_VERSION_CONFLICT")),
        getEntry: vi.fn().mockResolvedValue(serverEntry),
      }),
      { save: vi.fn().mockResolvedValue(undefined) },
      () => new Date(now),
    ).drain(state);

    expect(state.queue[0].status).toBe("conflict");
    expect(state.entries[0].localState).toBe("conflict");
    expect(state.conflict).toEqual({
      entryId: "entry-1",
      operation: "update",
      localAmount: "50",
      localEntryDate: "2026-08-31",
      serverEntry,
    });
  });

  it("accepts an already-applied update after a crash without a false conflict", async () => {
    const state = pendingCreate();
    state.entries[0] = {
      ...state.entries[0],
      amount: "50",
      revision: 3,
      serverRevision: 3,
      localState: "pending_update",
    };
    state.queue[0] = {
      id: "mutation-1",
      entity: "entry",
      operation: "update",
      entityId: entry.id,
      payload: { amount: 50, entryDate: entry.entryDate },
      expectedRevision: 3,
      createdAt: now,
      status: "pending",
      lastAttemptAt: null,
      retryCount: 0,
      lastErrorCode: null,
      nextAttemptAt: null,
    };
    const alreadyApplied = { ...entry, amount: "50", revision: 4 };

    await new SyncEngine(
      gateway({
        update: vi
          .fn()
          .mockRejectedValue(new Error("ENTRY_VERSION_CONFLICT")),
        getEntry: vi.fn().mockResolvedValue(alreadyApplied),
      }),
      { save: vi.fn().mockResolvedValue(undefined) },
      () => new Date(now),
    ).drain(state);

    expect(state.queue).toEqual([]);
    expect(state.conflict).toBeNull();
    expect(state.entries[0]).toMatchObject({
      amount: "50",
      revision: 4,
      localState: "synced",
    });
  });

  it("preserves every conflict when two queued updates conflict in the same drain", async () => {
      const secondEntry = {
        ...entry,
        id: "entry-2",
        amount: "20",
        revision: 5,
        createdAt: "2026-08-30T10:00:00.000Z",
        updatedAt: "2026-08-30T10:00:00.000Z",
        recordedAtClient: "2026-08-30T10:00:00.000Z",
      };
      const state = emptyOfflineState() as OfflineAccountState & {
        conflicts?: {
          entryId: string;
          operation: "update" | "delete";
          localAmount: string;
          localEntryDate: string;
          serverEntry: Entry;
        }[];
      };
      state.timeZone = "Europe/Berlin";
      state.entries = [
        {
          ...entry,
          amount: "50",
          revision: 3,
          serverRevision: 3,
          localState: "pending_update",
          lastAttemptAt: null,
          retryCount: 0,
          lastErrorCode: null,
        },
        {
          ...secondEntry,
          amount: "60",
          serverRevision: 5,
          localState: "pending_update",
          lastAttemptAt: null,
          retryCount: 0,
          lastErrorCode: null,
        },
      ];
      state.queue = [
        {
          id: "mutation-1",
          entity: "entry",
          operation: "update",
          entityId: entry.id,
          payload: { amount: 50, entryDate: entry.entryDate },
          expectedRevision: 3,
          createdAt: now,
          status: "pending",
          lastAttemptAt: null,
          retryCount: 0,
          lastErrorCode: null,
          nextAttemptAt: null,
        },
        {
          id: "mutation-2",
          entity: "entry",
          operation: "update",
          entityId: secondEntry.id,
          payload: { amount: 60, entryDate: secondEntry.entryDate },
          expectedRevision: 5,
          createdAt: now,
          status: "pending",
          lastAttemptAt: null,
          retryCount: 0,
          lastErrorCode: null,
          nextAttemptAt: null,
        },
      ];
      const update = vi
        .fn()
        .mockRejectedValue(new Error("ENTRY_VERSION_CONFLICT"));
      const getEntry = vi
        .fn()
        .mockResolvedValueOnce({ ...entry, amount: "45", revision: 4 })
        .mockResolvedValueOnce({ ...secondEntry, amount: "55", revision: 6 });

      await new SyncEngine(
        gateway({ update, getEntry }),
        { save: vi.fn().mockResolvedValue(undefined) },
        () => new Date(now),
      ).drain(state);

      expect(state.queue.map(({ status }) => status)).toEqual([
        "conflict",
        "conflict",
      ]);
      expect(state.conflicts?.map(({ entryId }) => entryId)).toEqual([
        "entry-1",
        "entry-2",
      ]);
  });

  it("keeps a conflicting mutation pending when server-state lookup fails retryably", async () => {
    let nowDate = new Date(now);
    const state = pendingCreate();
    state.entries[0] = {
      ...state.entries[0],
      amount: "50",
      revision: 3,
      serverRevision: 3,
      localState: "pending_update",
    };
    state.queue[0] = {
      id: "mutation-1",
      entity: "entry",
      operation: "update",
      entityId: entry.id,
      payload: { amount: 50, entryDate: entry.entryDate },
      expectedRevision: 3,
      createdAt: now,
      status: "pending",
      lastAttemptAt: null,
      retryCount: 0,
      lastErrorCode: null,
      nextAttemptAt: null,
    };
    const syncEngine = new SyncEngine(
      gateway({
        update: vi
          .fn()
          .mockRejectedValue(new Error("ENTRY_VERSION_CONFLICT")),
        getEntry: vi
          .fn()
          .mockRejectedValueOnce({ status: 429, message: "retry later" })
          .mockResolvedValueOnce({ ...entry, amount: "50", revision: 4 }),
      }),
      { save: vi.fn().mockResolvedValue(undefined) },
      () => nowDate,
      () => 0,
    );

    await syncEngine.drain(state);

    expect(state.queue[0]).toMatchObject({
      status: "pending",
      retryCount: 1,
      lastErrorCode: "RATE_LIMITED",
      nextAttemptAt: "2026-08-31T10:00:01.000Z",
    });
    expect(state.entries[0]).toMatchObject({
      localState: "pending_update",
      retryCount: 1,
      lastErrorCode: "RATE_LIMITED",
    });

    nowDate = new Date("2026-08-31T10:00:02.000Z");
    await syncEngine.drain(state);

    expect(state.queue).toEqual([]);
    expect(state.entries[0]).toMatchObject({
      localState: "synced",
      revision: 4,
      amount: "50",
    });
  });

  it("keeps permanent lookup failures visible as failed mutations", async () => {
    const state = pendingCreate();
    state.entries[0] = {
      ...state.entries[0],
      amount: "50",
      revision: 3,
      serverRevision: 3,
      localState: "pending_update",
    };
    state.queue[0] = {
      id: "mutation-1",
      entity: "entry",
      operation: "update",
      entityId: entry.id,
      payload: { amount: 50, entryDate: entry.entryDate },
      expectedRevision: 3,
      createdAt: now,
      status: "pending",
      lastAttemptAt: null,
      retryCount: 0,
      lastErrorCode: null,
      nextAttemptAt: null,
    };

    await new SyncEngine(
      gateway({
        update: vi
          .fn()
          .mockRejectedValue(new Error("ENTRY_VERSION_CONFLICT")),
        getEntry: vi
          .fn()
          .mockRejectedValue(new Error("INVALID_INPUT")),
      }),
      { save: vi.fn().mockResolvedValue(undefined) },
      () => new Date(now),
    ).drain(state);

    expect(state.queue[0]).toMatchObject({
      status: "failed",
      retryCount: 1,
      lastErrorCode: "INVALID_INPUT",
      nextAttemptAt: null,
    });
    expect(state.entries[0]).toMatchObject({
      localState: "failed",
      retryCount: 1,
      lastErrorCode: "INVALID_INPUT",
    });
  });

  it("refreshes an expired session exactly once before retrying", async () => {
    const state = pendingCreate();
    const create = vi
      .fn()
      .mockRejectedValueOnce(new Error("AUTH_REQUIRED"))
      .mockResolvedValueOnce(entry);
    const refreshSession = vi.fn().mockResolvedValue(undefined);

    await new SyncEngine(
      gateway({ create, refreshSession }),
      { save: vi.fn().mockResolvedValue(undefined) },
      () => new Date(now),
    ).drain(state);

    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledTimes(2);
    expect(state.queue).toEqual([]);
  });

  it("does not remove another mutation when the completed object was coalesced", async () => {
    const state = pendingCreate();
    state.queue.push({
      id: "mutation-goal",
      entity: "goal",
      operation: "set_goal",
      entityId: "2026-08-31",
      payload: { amount: 100, effectiveFrom: "2026-08-31" },
      expectedRevision: null,
      createdAt: now,
      status: "pending",
      lastAttemptAt: null,
      retryCount: 0,
      lastErrorCode: null,
      nextAttemptAt: "2026-08-31T10:01:00.000Z",
    });
    const create = vi.fn(async () => {
      state.queue.shift();
      return entry;
    });

    await new SyncEngine(
      gateway({ create }),
      { save: vi.fn().mockResolvedValue(undefined) },
      () => new Date(now),
    ).drain(state);

    expect(state.queue.map(({ id }) => id)).toEqual(["mutation-goal"]);
  });
});
