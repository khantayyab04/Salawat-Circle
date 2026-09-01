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

  it("resolves only the explicitly selected conflict entry", async () => {
    const controller = new OfflineController(
      storage(),
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
    controller.state.conflicts = [firstConflict, secondConflict];

    await controller.keepServerVersion("entry-2");

    expect(controller.state.conflicts.map(({ entryId }) => entryId)).toEqual([
      "entry-1",
    ]);
    expect(controller.state.queue.map(({ entityId }) => entityId)).toEqual([
      "entry-1",
    ]);
    expect(controller.state.entries).toEqual([
      expect.objectContaining({
        id: "entry-1",
        amount: "8",
        localState: "conflict",
      }),
      expect.objectContaining({
        id: "entry-2",
        amount: "10",
        localState: "synced",
      }),
    ]);
  });

  it("keeps a goal mutation whose entity id matches a resolved entry", async () => {
    const controller = new OfflineController(
      storage(),
      gateway(),
      () => new Date(now),
      () => "mutation-3",
      { drain: vi.fn().mockResolvedValue(undefined) },
    );
    const collidingEntry = {
      ...entry,
      id: "2026-08-31",
      amount: "8",
    };
    const conflict = {
      entryId: collidingEntry.id,
      operation: "update" as const,
      localAmount: "8",
      localEntryDate: collidingEntry.entryDate,
      serverEntry: { ...collidingEntry, amount: "7", revision: 2 },
    };
    controller.state.entries = [
      {
        ...collidingEntry,
        localState: "conflict",
        serverRevision: 1,
        lastAttemptAt: now,
        retryCount: 1,
        lastErrorCode: "ENTRY_VERSION_CONFLICT",
      },
    ];
    controller.state.queue = [
      {
        id: "mutation-entry",
        entity: "entry",
        operation: "update",
        entityId: collidingEntry.id,
        payload: { amount: 8, entryDate: collidingEntry.entryDate },
        expectedRevision: 1,
        createdAt: now,
        status: "conflict",
        lastAttemptAt: now,
        retryCount: 1,
        lastErrorCode: "ENTRY_VERSION_CONFLICT",
        nextAttemptAt: null,
      },
      {
        id: "mutation-goal",
        entity: "goal",
        operation: "set_goal",
        entityId: collidingEntry.id,
        payload: { amount: 100, effectiveFrom: collidingEntry.id },
        expectedRevision: null,
        createdAt: now,
        status: "pending",
        lastAttemptAt: null,
        retryCount: 0,
        lastErrorCode: null,
        nextAttemptAt: null,
      },
    ];
    controller.state.conflicts = [conflict];
    controller.state.conflict = conflict;

    await controller.keepServerVersion(collidingEntry.id);

    expect(controller.state.queue).toEqual([
      expect.objectContaining({
        id: "mutation-goal",
        entity: "goal",
      }),
    ]);
  });

  it("keeps resolver memory unchanged when persistence fails", async () => {
    const resolvers: {
      name: string;
      run(controller: OfflineController): Promise<unknown>;
    }[] = [
      {
        name: "keep server",
        run: (controller) => controller.keepServerVersion(entry.id),
      },
      {
        name: "reapply",
        run: (controller) => controller.reapplyConflict(entry.id),
      },
    ];

    for (const resolver of resolvers) {
      const persistence = storage();
      persistence.save.mockRejectedValueOnce(new Error("SAVE_FAILED"));
      const drain = vi.fn().mockResolvedValue(undefined);
      const controller = new OfflineController(
        persistence,
        gateway(),
        () => new Date(now),
        () => "mutation-2",
        { drain },
      );
      const conflict = {
        entryId: entry.id,
        operation: "update" as const,
        localAmount: "8",
        localEntryDate: entry.entryDate,
        serverEntry: { ...entry, amount: "7", revision: 2 },
      };
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
      controller.state.conflicts = [conflict];
      controller.state.conflict = conflict;
      const before = structuredClone(controller.state);

      await expect(resolver.run(controller), resolver.name).rejects.toThrow(
        "SAVE_FAILED",
      );

      expect(controller.state, resolver.name).toEqual(before);
      expect(drain, resolver.name).not.toHaveBeenCalled();
    }
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

  it("rejects a malformed cached mutation instead of silently dropping queued work", async () => {
    const malformed = emptyOfflineState();
    malformed.timeZone = "Europe/Berlin";
    malformed.entries = [
      {
        ...entry,
        amount: "8",
        localState: "pending_update",
        serverRevision: 1,
        lastAttemptAt: null,
        retryCount: 0,
        lastErrorCode: null,
      },
    ];
    malformed.queue = [
      {
        id: "mutation-1",
        entity: "entry",
        operation: "replace",
        entityId: entry.id,
        payload: { amount: 8, entryDate: entry.entryDate },
        expectedRevision: 1,
        createdAt: now,
        status: "pending",
        lastAttemptAt: null,
        retryCount: 0,
        lastErrorCode: null,
        nextAttemptAt: null,
      },
    ] as unknown as OfflineAccountState["queue"];
    const persistence = storage(malformed);
    const controller = new OfflineController(
      persistence,
      gateway(),
      () => new Date(now),
      () => "mutation-2",
    );

    await expect(controller.load()).rejects.toThrow("INVALID_OFFLINE_STATE");

    const persisted = await persistence.load();
    expect(persisted?.queue).toHaveLength(1);
    expect(persisted?.entries[0].localState).toBe("pending_update");
  });

  it("rejects cached entry mutations whose optimistic projection is missing", async () => {
    const malformed = emptyOfflineState();
    malformed.queue = [
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
    const controller = new OfflineController(
      storage(malformed),
      gateway(),
      () => new Date(now),
      () => "mutation-2",
    );

    await expect(controller.load()).rejects.toThrow("INVALID_OFFLINE_STATE");
  });

  it("rejects malformed conflict details instead of hiding an unresolved mutation", async () => {
    const malformed = emptyOfflineState();
    malformed.timeZone = "Europe/Berlin";
    malformed.entries = [
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
    malformed.queue = [
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
    malformed.conflicts = [
      {
        entryId: entry.id,
        operation: "update",
        localAmount: "8",
        localEntryDate: entry.entryDate,
      },
    ] as unknown as OfflineAccountState["conflicts"];
    const controller = new OfflineController(
      storage(malformed),
      gateway(),
      () => new Date(now),
      () => "mutation-2",
    );

    await expect(controller.load()).rejects.toThrow("INVALID_OFFLINE_STATE");
  });

  it("rejects a cached conflict mutation that has no resolvable conflict details", async () => {
    const malformed = emptyOfflineState();
    malformed.entries = [
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
    malformed.queue = [
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
    const controller = new OfflineController(
      storage(malformed),
      gateway(),
      () => new Date(now),
      () => "mutation-2",
    );

    await expect(controller.load()).rejects.toThrow("INVALID_OFFLINE_STATE");
  });

  it("rejects malformed cached entries before projecting offline content", async () => {
    const malformed = emptyOfflineState();
    malformed.entries = [
      {
        id: entry.id,
        localState: "pending_update",
      },
    ] as unknown as OfflineAccountState["entries"];
    const controller = new OfflineController(
      storage(malformed),
      gateway(),
      () => new Date(now),
      () => "mutation-1",
    );

    await expect(controller.load()).rejects.toThrow("INVALID_OFFLINE_STATE");
  });

  it("rejects malformed cached summary metadata before updating totals", async () => {
    const malformed = emptyOfflineState();
    malformed.summary = {
      todayTotal: 42,
    } as unknown as OfflineAccountState["summary"];
    const controller = new OfflineController(
      storage(malformed),
      gateway(),
      () => new Date(now),
      () => "mutation-1",
    );

    await expect(controller.load()).rejects.toThrow("INVALID_OFFLINE_STATE");
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

  it("rejects every state-writing operation after a failed load", async () => {
    const malformed = emptyOfflineState();
    malformed.summary = {
      todayTotal: 5,
    } as unknown as OfflineAccountState["summary"];
    const actions: {
      name: string;
      run(controller: OfflineController): Promise<unknown>;
    }[] = [
      {
        name: "create",
        run: (controller) =>
          controller.create({
            ...entry,
            revision: 0,
            localState: "pending_create",
            serverRevision: null,
            lastAttemptAt: null,
            retryCount: 0,
            lastErrorCode: null,
          }),
      },
      {
        name: "update",
        run: (controller) =>
          controller.update(entry.id, 8, entry.entryDate),
      },
      {
        name: "delete",
        run: (controller) => controller.delete(entry.id),
      },
      {
        name: "goal",
        run: (controller) => controller.setGoal(100, entry.entryDate),
      },
      {
        name: "sync",
        run: (controller) => controller.sync(true),
      },
      {
        name: "retry",
        run: (controller) => controller.retryFailed(),
      },
      {
        name: "hydrate",
        run: (controller) =>
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
      },
      {
        name: "append",
        run: (controller) => controller.appendPage([entry], null, false),
      },
      {
        name: "keep server conflict resolution",
        run: (controller) => controller.keepServerVersion(entry.id),
      },
      {
        name: "reapply conflict resolution",
        run: (controller) => controller.reapplyConflict(entry.id),
      },
    ];

    for (const action of actions) {
      const persistence = storage(malformed);
      const drain = vi.fn().mockResolvedValue(undefined);
      const controller = new OfflineController(
        persistence,
        gateway(),
        () => new Date(now),
        () => "mutation-1",
        { drain },
      );
      await expect(controller.load()).rejects.toThrow("INVALID_OFFLINE_STATE");
      persistence.save.mockClear();

      await expect(action.run(controller), action.name).rejects.toThrow(
        "INVALID_OFFLINE_STATE",
      );
      expect(persistence.save, action.name).not.toHaveBeenCalled();
      expect(drain, action.name).not.toHaveBeenCalled();
    }
  });
});
