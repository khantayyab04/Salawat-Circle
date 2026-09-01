import { describe, expect, it, vi } from "vitest";
import type { EntriesGateway, Entry } from "@/lib/entries/entries-gateway";
import { OfflineController } from "./controller";
import { emptyOfflineState, type OfflineAccountState } from "./types";

const now = "2026-08-31T10:00:00.000Z";
const entry: Entry = {
  id: "entry-1",
  amount: "5",
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
      todayTotal: "5",
      weekTotal: "5",
      allTimeTotal: "5",
      todayGoal: null,
      achievedDays: "0",
      eligibleGoalDays: "0",
    }),
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    setGoal: vi.fn(),
    ...overrides,
  };
}

function storage(initial: OfflineAccountState | null = null) {
  let value = initial;
  return {
    load: vi.fn(async () => value),
    save: vi.fn(async (state: OfflineAccountState) => {
      value = structuredClone(state);
    }),
    clear: vi.fn(async () => {
      value = null;
    }),
  };
}

describe("OfflineController", () => {
  it("loads cached content before the network and persists a queued create", async () => {
    const cached = emptyOfflineState();
    cached.timeZone = "Europe/Berlin";
    cached.entries = [
      {
        ...entry,
        localState: "synced",
        serverRevision: 1,
        lastAttemptAt: null,
        retryCount: 0,
        lastErrorCode: null,
      },
    ];
    const persistence = storage(cached);
    const controller = new OfflineController(
      persistence,
      gateway(),
      () => new Date(now),
      () => "mutation-1",
    );

    expect((await controller.load()).entries).toHaveLength(1);
    await controller.create({
      ...entry,
      id: "entry-2",
      revision: 0,
      localState: "pending_create",
      serverRevision: null,
      lastAttemptAt: null,
      retryCount: 0,
      lastErrorCode: null,
    });

    expect(controller.state.queue).toHaveLength(1);
    expect(persistence.save).toHaveBeenCalled();
  });

  it("keeps queued local projections when a server page is hydrated", async () => {
    const persistence = storage();
    const controller = new OfflineController(
      persistence,
      gateway(),
      () => new Date(now),
      () => "mutation-1",
    );
    await controller.load();
    await controller.create({
      ...entry,
      id: "entry-local",
      revision: 0,
      localState: "pending_create",
      serverRevision: null,
      lastAttemptAt: null,
      retryCount: 0,
      lastErrorCode: null,
    });

    await controller.hydrate({
      entries: [entry],
      summary: {
        todayTotal: "5",
        weekTotal: "5",
        allTimeTotal: "5",
        todayGoal: null,
        achievedDays: "0",
        eligibleGoalDays: "0",
      },
      timeZone: "Europe/Berlin",
      serverCursor: null,
      hasMore: false,
    });

    expect(controller.state.entries.map(({ id }) => id)).toEqual([
      "entry-1",
      "entry-local",
    ]);
    expect(controller.state.entries[1].localState).toBe("pending_create");
  });

  it("hydrates without relying on unsupported iterator helpers", async () => {
    const iteratorPrototype = Object.getPrototypeOf(new Map().values()) as {
      filter?: unknown;
    };
    const originalFilter = iteratorPrototype.filter;
    iteratorPrototype.filter = undefined;
    try {
      const controller = new OfflineController(
        storage(),
        gateway(),
        () => new Date(now),
        () => "mutation-1",
      );
      await controller.load();

      await expect(
        controller.hydrate({
          entries: [entry],
          summary: {
            todayTotal: "5",
            weekTotal: "5",
            allTimeTotal: "5",
            todayGoal: null,
            achievedDays: "0",
            eligibleGoalDays: "0",
          },
          timeZone: "Europe/Berlin",
          serverCursor: null,
          hasMore: false,
        }),
      ).resolves.toMatchObject({ entries: [{ id: "entry-1" }] });
    } finally {
      iteratorPrototype.filter = originalFilter;
    }
  });

  it("appends a history page without dropping cached or pending entries", async () => {
    const persistence = storage();
    const controller = new OfflineController(
      persistence,
      gateway(),
      () => new Date(now),
      () => "mutation-1",
    );
    await controller.load();
    await controller.hydrate({
      entries: [entry],
      summary: {
        todayTotal: "5",
        weekTotal: "5",
        allTimeTotal: "5",
        todayGoal: null,
        achievedDays: "0",
        eligibleGoalDays: "0",
      },
      timeZone: "Europe/Berlin",
      serverCursor: {
        entryDate: "2026-08-30",
        createdAt: "2026-08-30T10:00:00.000Z",
        id: "entry-older",
      },
      hasMore: true,
    });

    await controller.appendPage(
      [{ ...entry, id: "entry-older", entryDate: "2026-08-30" }],
      null,
      false,
    );

    expect(controller.state.entries.map(({ id }) => id)).toEqual([
      "entry-1",
      "entry-older",
    ]);
    expect(controller.state.hasMore).toBe(false);
  });

  it("can retry failed mutations and keep or reapply a conflict", async () => {
    const persistence = storage();
    const sync = vi.fn().mockResolvedValue(undefined);
    const controller = new OfflineController(
      persistence,
      gateway(),
      () => new Date(now),
      () => "mutation-1",
      { drain: sync },
    );
    controller.state.entries = [
      {
        ...entry,
        amount: "8",
        localState: "conflict",
        serverRevision: 1,
        lastAttemptAt: now,
        retryCount: 1,
        lastErrorCode: "ENTRY_VERSION_CONFLICT",
      },
    ];
    controller.state.queue = [
      {
        id: "mutation-1",
        entity: "entry",
        operation: "update",
        entityId: entry.id,
        payload: { amount: 8, entryDate: entry.entryDate },
        expectedRevision: 1,
        createdAt: now,
        status: "conflict",
        lastAttemptAt: now,
        retryCount: 1,
        lastErrorCode: "ENTRY_VERSION_CONFLICT",
        nextAttemptAt: null,
      },
    ];
    controller.state.conflict = {
      entryId: entry.id,
      operation: "update",
      localAmount: "8",
      localEntryDate: entry.entryDate,
      serverEntry: { ...entry, amount: "7", revision: 2 },
    };

    await controller.reapplyConflict();

    expect(controller.state.queue[0]).toMatchObject({
      status: "pending",
      expectedRevision: 2,
    });
    expect(sync).toHaveBeenCalled();

    controller.state.conflict = {
      entryId: entry.id,
      operation: "update",
      localAmount: "8",
      localEntryDate: entry.entryDate,
      serverEntry: { ...entry, amount: "7", revision: 2 },
    };
    await controller.keepServerVersion();
    expect(controller.state.queue).toEqual([]);
    expect(controller.state.entries[0]).toMatchObject({
      amount: "7",
      revision: 2,
      localState: "synced",
    });
  });

  it("keeps other conflicts visible after resolving one conflict entry", async () => {
    const persistence = storage();
    const controller = new OfflineController(
      persistence,
      gateway(),
      () => new Date(now),
      () => "mutation-1",
      { drain: vi.fn().mockResolvedValue(undefined) },
    );
    const firstConflict = {
      entryId: "entry-1",
      operation: "update" as const,
      localAmount: "8",
      localEntryDate: "2026-08-31",
      serverEntry: { ...entry, amount: "7", revision: 2 },
    };
    const secondConflict = {
      entryId: "entry-2",
      operation: "update" as const,
      localAmount: "12",
      localEntryDate: "2026-08-30",
      serverEntry: {
        ...entry,
        id: "entry-2",
        amount: "10",
        entryDate: "2026-08-30",
        revision: 6,
      },
    };
    controller.state.entries = [
      {
        ...entry,
        id: "entry-1",
        amount: "8",
        localState: "conflict",
        serverRevision: 1,
        lastAttemptAt: now,
        retryCount: 1,
        lastErrorCode: "ENTRY_VERSION_CONFLICT",
      },
      {
        ...entry,
        id: "entry-2",
        amount: "12",
        entryDate: "2026-08-30",
        localState: "conflict",
        serverRevision: 5,
        lastAttemptAt: now,
        retryCount: 1,
        lastErrorCode: "ENTRY_VERSION_CONFLICT",
      },
    ];
    controller.state.queue = [
      {
        id: "mutation-1",
        entity: "entry",
        operation: "update",
        entityId: "entry-1",
        payload: { amount: 8, entryDate: "2026-08-31" },
        expectedRevision: 1,
        createdAt: now,
        status: "conflict",
        lastAttemptAt: now,
        retryCount: 1,
        lastErrorCode: "ENTRY_VERSION_CONFLICT",
        nextAttemptAt: null,
      },
      {
        id: "mutation-2",
        entity: "entry",
        operation: "update",
        entityId: "entry-2",
        payload: { amount: 12, entryDate: "2026-08-30" },
        expectedRevision: 5,
        createdAt: now,
        status: "conflict",
        lastAttemptAt: now,
        retryCount: 1,
        lastErrorCode: "ENTRY_VERSION_CONFLICT",
        nextAttemptAt: null,
      },
    ];
    controller.state.conflict = firstConflict;
    (
      controller.state as OfflineAccountState & {
        conflicts?: typeof firstConflict[];
      }
    ).conflicts = [firstConflict, secondConflict];

    await controller.keepServerVersion();

    expect(controller.state.queue.map(({ entityId }) => entityId)).toEqual([
      "entry-2",
    ]);
    expect(controller.state.conflict?.entryId).toBe("entry-2");
  });

  it("migrates a legacy single conflict field into the per-entry conflict collection", async () => {
    const legacy = emptyOfflineState() as OfflineAccountState & {
      conflicts?: unknown;
    };
    legacy.timeZone = "Europe/Berlin";
    legacy.entries = [
      {
        ...entry,
        amount: "8",
        localState: "conflict",
        serverRevision: 1,
        lastAttemptAt: now,
        retryCount: 1,
        lastErrorCode: "ENTRY_VERSION_CONFLICT",
      },
    ];
    legacy.queue = [
      {
        id: "mutation-1",
        entity: "entry",
        operation: "update",
        entityId: entry.id,
        payload: { amount: 8, entryDate: entry.entryDate },
        expectedRevision: 1,
        createdAt: now,
        status: "conflict",
        lastAttemptAt: now,
        retryCount: 1,
        lastErrorCode: "ENTRY_VERSION_CONFLICT",
        nextAttemptAt: null,
      },
    ];
    legacy.conflict = {
      entryId: entry.id,
      operation: "update",
      localAmount: "8",
      localEntryDate: entry.entryDate,
      serverEntry: { ...entry, amount: "7", revision: 2 },
    };
    (legacy as { conflicts?: unknown }).conflicts = undefined;
    const controller = new OfflineController(
      storage(legacy),
      gateway(),
      () => new Date(now),
      () => "mutation-2",
    );

    await controller.load();

    const conflicts = (
      controller.state as OfflineAccountState & {
        conflicts?: { entryId: string }[];
      }
    ).conflicts;
    expect(controller.state.entries).toHaveLength(1);
    expect(controller.state.queue).toHaveLength(1);
    expect(conflicts?.map(({ entryId }) => entryId)).toEqual([entry.id]);
  });

  it("serializes a user mutation behind an in-flight sync write", async () => {
    const initial = emptyOfflineState();
    initial.timeZone = "Europe/Berlin";
    initial.entries = [
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
    initial.queue = [
      {
        id: "mutation-1",
        entity: "entry",
        operation: "create",
        entityId: entry.id,
        payload: {
          amount: 5,
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
    let releaseCreate: (value: Entry) => void = () => undefined;
    const create = vi.fn(
      () =>
        new Promise<Entry>((resolve) => {
          releaseCreate = resolve;
        }),
    );
    const persistence = storage(initial);
    let id = 1;
    const controller = new OfflineController(
      persistence,
      gateway({ create }),
      () => new Date(now),
      () => `mutation-${++id}`,
    );
    await controller.load();

    const syncing = controller.sync();
    await Promise.resolve();
    const queued = controller.create({
      ...entry,
      id: "entry-2",
      revision: 0,
      serverRevision: null,
      localState: "pending_create",
      lastAttemptAt: null,
      retryCount: 0,
      lastErrorCode: null,
    });
    releaseCreate(entry);
    await Promise.all([syncing, queued]);

    const persisted = await persistence.load();
    expect(persisted?.queue.map(({ entityId }) => entityId)).toEqual([
      "entry-2",
    ]);
  });
});
