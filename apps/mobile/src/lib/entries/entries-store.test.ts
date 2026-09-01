import { describe, expect, it, vi } from "vitest";
import type { EntriesGateway, Entry } from "./entries-gateway";
import { EntriesStore } from "./entries-store";
import { OfflineController } from "@/lib/offline/controller";
import {
  emptyOfflineState,
  migrateOfflineState,
  type OfflineAccountState,
} from "@/lib/offline/types";

const existingEntry: Entry = {
  id: "00000000-0000-4000-8000-000000000001",
  amount: "5",
  entryDate: "2026-08-31",
  timezone: "Europe/Berlin",
  recordedAtClient: "2026-08-31T10:00:00.000Z",
  createdAt: "2026-08-31T10:00:00.000Z",
  updatedAt: "2026-08-31T10:00:00.000Z",
  revision: 1,
};

function gateway(overrides: Partial<EntriesGateway> = {}): EntriesGateway {
  return {
    getTimeZone: vi.fn().mockResolvedValue("Europe/Berlin"),
    getSummary: vi.fn().mockResolvedValue({
      todayTotal: "5",
      weekTotal: "5",
      allTimeTotal: "5",
      todayGoal: null,
      achievedDays: "0",
      eligibleGoalDays: "0",
    }),
    list: vi.fn().mockResolvedValue({
      items: [existingEntry],
      nextCursor: null,
      hasMore: false,
    }),
    create: vi.fn().mockResolvedValue(existingEntry),
    update: vi.fn().mockResolvedValue(existingEntry),
    delete: vi.fn().mockResolvedValue(undefined),
    setGoal: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const emptyGoalSummary = {
  todayTotal: "5",
  weekTotal: "5",
  allTimeTotal: "5",
  todayGoal: null,
  achievedDays: "0",
  eligibleGoalDays: "0",
};

describe("EntriesStore", () => {
  it("restores a pending offline entry after an app restart", async () => {
    let persisted: OfflineAccountState | null = emptyOfflineState();
    persisted.timeZone = "Europe/Berlin";
    const persistence = {
      load: vi.fn(async () => structuredClone(persisted)),
      save: vi.fn(async (state: OfflineAccountState) => {
        persisted = structuredClone(state);
      }),
      clear: vi.fn(),
    };
    const offlineGateway = gateway({
      getSummary: vi.fn().mockRejectedValue(new Error("INTERNAL")),
      list: vi.fn().mockRejectedValue(new Error("INTERNAL")),
      create: vi.fn().mockRejectedValue(new Error("INTERNAL")),
    });
    const firstOffline = new OfflineController(
      persistence,
      offlineGateway,
      () => new Date("2026-08-31T10:00:00.000Z"),
      () => "mutation-1",
    );
    const first = new EntriesStore(
      offlineGateway,
      "UTC",
      () => new Date("2026-08-31T10:00:00.000Z"),
      () => "00000000-0000-4000-8000-000000000002",
      firstOffline,
    );
    await first.load();
    await first.create(42);

    const secondOffline = new OfflineController(
      persistence,
      offlineGateway,
      () => new Date("2026-08-31T10:01:00.000Z"),
      () => "mutation-2",
    );
    const restarted = new EntriesStore(
      offlineGateway,
      "UTC",
      () => new Date("2026-08-31T10:01:00.000Z"),
      () => "unused",
      secondOffline,
    );
    await restarted.load();

    expect(restarted.snapshot.entries).toHaveLength(1);
    expect(restarted.snapshot.entries[0]).toMatchObject({
      amount: "42",
      localState: "pending_create",
    });
    expect(restarted.snapshot.pendingCount).toBe(1);
    expect(restarted.snapshot.viewState).toBe("content");
  });

  it("shows an optimistic entry once while creation is pending", async () => {
    let resolveCreate: (entry: Entry) => void = () => undefined;
    const create = vi.fn(
      () =>
        new Promise<Entry>((resolve) => {
          resolveCreate = resolve;
        }),
    );
    const store = new EntriesStore(
      gateway({ create }),
      "UTC",
      () => new Date("2026-08-31T10:00:00.000Z"),
      () => "00000000-0000-4000-8000-000000000002",
    );
    await store.load();

    const first = store.create(42);
    const second = store.create(99);

    expect(store.snapshot.entries).toHaveLength(2);
    expect(store.snapshot.summary.todayTotal).toBe("47");
    expect(create).toHaveBeenCalledTimes(1);
    await expect(second).resolves.toBeUndefined();

    resolveCreate({ ...existingEntry, id: "00000000-0000-4000-8000-000000000002", amount: "42" });
    await first;
  });

  it("preserves an optimistic entry when the initial history page finishes later", async () => {
    let resolveList: (page: {
      items: Entry[];
      nextCursor: null;
      hasMore: boolean;
    }) => void = () => undefined;
    let resolveCreate: (entry: Entry) => void = () => undefined;
    const list = vi.fn(
      () =>
        new Promise<{
          items: Entry[];
          nextCursor: null;
          hasMore: boolean;
        }>((resolve) => {
          resolveList = resolve;
        }),
    );
    const create = vi.fn(
      () =>
        new Promise<Entry>((resolve) => {
          resolveCreate = resolve;
        }),
    );
    const store = new EntriesStore(
      gateway({ list, create }),
      "UTC",
      () => new Date("2026-08-31T10:00:00.000Z"),
      () => "00000000-0000-4000-8000-000000000002",
    );
    const load = store.load();
    await Promise.resolve();
    const pendingCreate = store.create(42);

    resolveList({ items: [existingEntry], nextCursor: null, hasMore: false });
    await load;

    expect(store.snapshot.entries.map((entry) => entry.id)).toEqual([
      "00000000-0000-4000-8000-000000000002",
      existingEntry.id,
    ]);
    resolveCreate({
      ...existingEntry,
      id: "00000000-0000-4000-8000-000000000002",
      amount: "42",
    });
    await pendingCreate;
  });

  it("rolls back an optimistic entry when the backend rejects it", async () => {
    const store = new EntriesStore(
      gateway({ create: vi.fn().mockRejectedValue(new Error("INVALID_AMOUNT")) }),
      "UTC",
      () => new Date("2026-08-31T10:00:00.000Z"),
      () => "00000000-0000-4000-8000-000000000002",
    );
    await store.load();

    await expect(store.create(42)).rejects.toThrow("INVALID_AMOUNT");

    expect(store.snapshot.entries).toEqual([existingEntry]);
    expect(store.snapshot.summary.todayTotal).toBe("5");
    expect(store.snapshot.errorCode).toBe("INVALID_AMOUNT");
  });

  it("merges a cursor page without duplicating an entry already shown", async () => {
    const laterEntry = {
      ...existingEntry,
      id: "00000000-0000-4000-8000-000000000003",
      amount: "7",
      createdAt: "2026-08-30T10:00:00.000Z",
    };
    const list = vi
      .fn()
      .mockResolvedValueOnce({
        items: [existingEntry],
        nextCursor: {
          entryDate: "2026-08-30",
          createdAt: "2026-08-30T10:00:00.000Z",
          id: laterEntry.id,
        },
        hasMore: true,
      })
      .mockResolvedValueOnce({
        items: [existingEntry, laterEntry],
        nextCursor: null,
        hasMore: false,
      });
    const store = new EntriesStore(
      gateway({ list }),
      "UTC",
      () => new Date("2026-08-31T10:00:00.000Z"),
      () => "unused",
    );
    await store.load();

    await store.loadMore();

    expect(store.snapshot.entries).toEqual([existingEntry, laterEntry]);
    expect(store.snapshot.hasMore).toBe(false);
    expect(list).toHaveBeenLastCalledWith(
      {
        entryDate: "2026-08-31",
        createdAt: "2026-08-31T10:00:00.000Z",
        id: existingEntry.id,
      },
      30,
    );
  });

  it("updates an entry and refreshes its canonical total", async () => {
    const updatedEntry = { ...existingEntry, amount: "9", revision: 2 };
    const getSummary = vi
      .fn()
      .mockResolvedValueOnce({
        todayTotal: "5",
        weekTotal: "5",
        allTimeTotal: "5",
      })
      .mockResolvedValueOnce({
        todayTotal: "9",
        weekTotal: "9",
        allTimeTotal: "9",
      });
    const store = new EntriesStore(
      gateway({
        getSummary,
        update: vi.fn().mockResolvedValue(updatedEntry),
      }),
      "UTC",
      () => new Date("2026-08-31T10:00:00.000Z"),
      () => "unused",
    );
    await store.load();

    await store.update(existingEntry.id, 9, "2026-08-31");

    expect(store.snapshot.entries).toEqual([updatedEntry]);
    expect(store.snapshot.summary.todayTotal).toBe("9");
  });

  it("restores an entry rather than overwriting it after a revision conflict", async () => {
    const store = new EntriesStore(
      gateway({
        update: vi
          .fn()
          .mockRejectedValue(new Error("ENTRY_VERSION_CONFLICT")),
      }),
      "UTC",
      () => new Date("2026-08-31T10:00:00.000Z"),
      () => "unused",
    );
    await store.load();

    await expect(store.update(existingEntry.id, 9, "2026-08-31")).rejects.toThrow(
      "ENTRY_VERSION_CONFLICT",
    );

    expect(store.snapshot.entries).toEqual([existingEntry]);
    expect(store.snapshot.conflictEntryId).toBe(existingEntry.id);
  });

  it("removes an entry and refreshes the displayed totals", async () => {
    const getSummary = vi
      .fn()
      .mockResolvedValueOnce({
        todayTotal: "5",
        weekTotal: "5",
        allTimeTotal: "5",
      })
      .mockResolvedValueOnce({
        todayTotal: "0",
        weekTotal: "0",
        allTimeTotal: "0",
      });
    const store = new EntriesStore(
      gateway({ getSummary }),
      "UTC",
      () => new Date("2026-08-31T10:00:00.000Z"),
      () => "unused",
    );
    await store.load();

    await store.delete(existingEntry.id);

    expect(store.snapshot.entries).toEqual([]);
    expect(store.snapshot.summary.todayTotal).toBe("0");
    expect(store.snapshot.viewState).toBe("empty");
  });

  it("restores a failed deletion at its original history position", async () => {
    const olderEntry = {
      ...existingEntry,
      id: "00000000-0000-4000-8000-000000000004",
      entryDate: "2026-08-30",
    };
    const list = vi.fn().mockResolvedValue({
      items: [existingEntry, olderEntry],
      nextCursor: null,
      hasMore: false,
    });
    const store = new EntriesStore(
      gateway({ list, delete: vi.fn().mockRejectedValue(new Error("INTERNAL")) }),
      "UTC",
      () => new Date("2026-08-31T10:00:00.000Z"),
      () => "unused",
    );
    await store.load();

    await expect(store.delete(olderEntry.id)).rejects.toThrow("INTERNAL");

    expect(store.snapshot.entries).toEqual([existingEntry, olderEntry]);
  });

  it("keeps history sorted after an entry date changes", async () => {
    const olderEntry = {
      ...existingEntry,
      id: "00000000-0000-4000-8000-000000000004",
      entryDate: "2026-08-30",
    };
    const list = vi.fn().mockResolvedValue({
      items: [existingEntry, olderEntry],
      nextCursor: null,
      hasMore: false,
    });
    const updatedEntry = {
      ...existingEntry,
      entryDate: "2026-08-29",
      revision: 2,
    };
    const store = new EntriesStore(
      gateway({
        list,
        update: vi.fn().mockResolvedValue(updatedEntry),
      }),
      "UTC",
      () => new Date("2026-08-31T10:00:00.000Z"),
      () => "unused",
    );
    await store.load();

    await store.update(existingEntry.id, 5, "2026-08-29");

    expect(store.snapshot.entries).toEqual([olderEntry, updatedEntry]);
  });

  it("keeps pagination retryable after a page request fails", async () => {
    const list = vi
      .fn()
      .mockResolvedValueOnce({
        items: [existingEntry],
        nextCursor: {
          entryDate: "2026-08-30",
          createdAt: "2026-08-30T10:00:00.000Z",
          id: "00000000-0000-4000-8000-000000000004",
        },
        hasMore: true,
      })
      .mockRejectedValueOnce(new Error("INTERNAL"));
    const store = new EntriesStore(
      gateway({ list }),
      "UTC",
      () => new Date("2026-08-31T10:00:00.000Z"),
      () => "unused",
    );
    await store.load();

    await store.loadMore();

    expect(store.snapshot.paginationError).toBe(true);
    expect(store.snapshot.hasMore).toBe(true);
  });

  it("uses the persisted server cursor instead of the last projected entry during offline pagination", async () => {
    const list = vi
      .fn()
      .mockRejectedValueOnce(new Error("INTERNAL"))
      .mockResolvedValueOnce({
        items: [
          {
            ...existingEntry,
            id: "00000000-0000-4000-8000-000000000003",
            entryDate: "2026-08-30",
            createdAt: "2026-08-30T10:00:00.000Z",
          },
        ],
        nextCursor: null,
        hasMore: false,
      });
    let persisted: OfflineAccountState | null = emptyOfflineState();
    persisted.timeZone = "Europe/Berlin";
    persisted.summary = { ...emptyGoalSummary };
    persisted.entries = [
      {
        ...existingEntry,
        localState: "synced",
        serverRevision: 1,
        lastAttemptAt: null,
        retryCount: 0,
        lastErrorCode: null,
      },
      {
        ...existingEntry,
        id: "entry-local-old",
        amount: "9",
        entryDate: "2026-07-01",
        createdAt: "2026-07-01T10:00:00.000Z",
        updatedAt: "2026-07-01T10:00:00.000Z",
        revision: 0,
        localState: "pending_create",
        serverRevision: null,
        lastAttemptAt: null,
        retryCount: 0,
        lastErrorCode: null,
      },
    ];
    persisted.queue = [
      {
        id: "mutation-local-old",
        entity: "entry",
        operation: "create",
        entityId: "entry-local-old",
        payload: {
          amount: 9,
          entryDate: "2026-07-01",
          timezone: "Europe/Berlin",
          recordedAtClient: "2026-07-01T10:00:00.000Z",
        },
        expectedRevision: null,
        createdAt: "2026-07-01T10:00:00.000Z",
        status: "pending",
        lastAttemptAt: null,
        retryCount: 0,
        lastErrorCode: null,
        nextAttemptAt: null,
      },
    ];
    persisted.hasMore = true;
    (
      persisted as OfflineAccountState & {
        serverCursor?: { entryDate: string; createdAt: string; id: string };
      }
    ).serverCursor = {
      entryDate: "2026-08-30",
      createdAt: "2026-08-30T10:00:00.000Z",
      id: "00000000-0000-4000-8000-000000000999",
    };
    const persistence = {
      load: vi.fn(async () => structuredClone(persisted)),
      save: vi.fn(async (state: OfflineAccountState) => {
        persisted = structuredClone(state);
      }),
      clear: vi.fn(),
    };
    const offline = new OfflineController(
      persistence,
      gateway({ list }),
      () => new Date("2026-08-31T10:00:00.000Z"),
      () => "mutation-generated",
      { drain: vi.fn().mockResolvedValue(undefined) },
    );
    const store = new EntriesStore(
      gateway({ list }),
      "UTC",
      () => new Date("2026-08-31T10:00:00.000Z"),
      () => "unused",
      offline,
    );
    await store.load();

    await store.loadMore();

    expect(list).toHaveBeenLastCalledWith(
      {
        entryDate: "2026-08-30",
        createdAt: "2026-08-30T10:00:00.000Z",
        id: "00000000-0000-4000-8000-000000000999",
      },
      30,
    );
  });

  it("keeps the server cursor across offline restart so pagination remains safe", async () => {
    const firstPageCursor = {
      entryDate: "2026-08-30",
      createdAt: "2026-08-30T10:00:00.000Z",
      id: "00000000-0000-4000-8000-000000000999",
    };
    const initialList = vi.fn().mockResolvedValue({
      items: [existingEntry],
      nextCursor: firstPageCursor,
      hasMore: true,
    });
    let persisted: OfflineAccountState | null = null;
    const persistence = {
      load: vi.fn(async () => structuredClone(persisted)),
      save: vi.fn(async (state: OfflineAccountState) => {
        persisted = structuredClone(state);
      }),
      clear: vi.fn(),
    };
    const firstStore = new EntriesStore(
      gateway({ list: initialList }),
      "UTC",
      () => new Date("2026-08-31T10:00:00.000Z"),
      () => "entry-generated",
      new OfflineController(
        persistence,
        gateway({ list: initialList }),
        () => new Date("2026-08-31T10:00:00.000Z"),
        () => "mutation-generated",
      ),
    );
    await firstStore.load();
    if (!persisted) throw new Error("Expected persisted offline state");
    const saved = persisted as OfflineAccountState & {
      serverCursor?: { entryDate: string; createdAt: string; id: string } | null;
    };
    saved.entries.push({
      ...existingEntry,
      id: "entry-local-old",
      amount: "11",
      entryDate: "2026-06-01",
      createdAt: "2026-06-01T10:00:00.000Z",
      updatedAt: "2026-06-01T10:00:00.000Z",
      revision: 0,
      localState: "pending_create",
      serverRevision: null,
      lastAttemptAt: null,
      retryCount: 0,
      lastErrorCode: null,
    });
    saved.queue.push({
      id: "mutation-local-old",
      entity: "entry",
      operation: "create",
      entityId: "entry-local-old",
      payload: {
        amount: 11,
        entryDate: "2026-06-01",
        timezone: "Europe/Berlin",
        recordedAtClient: "2026-06-01T10:00:00.000Z",
      },
      expectedRevision: null,
      createdAt: "2026-06-01T10:00:00.000Z",
      status: "pending",
      lastAttemptAt: null,
      retryCount: 0,
      lastErrorCode: null,
      nextAttemptAt: null,
    });
    persisted = structuredClone(saved);
    const restartedList = vi
      .fn()
      .mockRejectedValueOnce(new Error("INTERNAL"))
      .mockResolvedValueOnce({
        items: [
          {
            ...existingEntry,
            id: "00000000-0000-4000-8000-000000000003",
            entryDate: "2026-08-30",
            createdAt: "2026-08-30T10:00:00.000Z",
          },
        ],
        nextCursor: null,
        hasMore: false,
      });
    const restartedStore = new EntriesStore(
      gateway({ list: restartedList }),
      "UTC",
      () => new Date("2026-08-31T10:01:00.000Z"),
      () => "unused",
      new OfflineController(
        persistence,
        gateway({ list: restartedList }),
        () => new Date("2026-08-31T10:01:00.000Z"),
        () => "mutation-restarted",
        { drain: vi.fn().mockResolvedValue(undefined) },
      ),
    );
    await restartedStore.load();

    await restartedStore.loadMore();

    expect(restartedList).toHaveBeenLastCalledWith(firstPageCursor, 30);
  });

  it("replaces a cached synced tail when an online restart hydrates the first page", async () => {
    const firstPageCursor = {
      entryDate: "2026-08-30",
      createdAt: "2026-08-30T10:00:00.000Z",
      id: "00000000-0000-4000-8000-000000000002",
    };
    const secondPageCursor = {
      entryDate: "2026-08-29",
      createdAt: "2026-08-29T10:00:00.000Z",
      id: "00000000-0000-4000-8000-000000000003",
    };
    const secondPageEntry = {
      ...existingEntry,
      id: firstPageCursor.id,
      entryDate: firstPageCursor.entryDate,
      createdAt: firstPageCursor.createdAt,
      updatedAt: firstPageCursor.createdAt,
    };
    const staleThirdPageEntry = {
      ...existingEntry,
      id: secondPageCursor.id,
      entryDate: secondPageCursor.entryDate,
      createdAt: secondPageCursor.createdAt,
      updatedAt: secondPageCursor.createdAt,
    };
    const pendingEntry = {
      ...existingEntry,
      id: "entry-local-old",
      amount: "11",
      entryDate: "2026-06-01",
      createdAt: "2026-06-01T10:00:00.000Z",
      updatedAt: "2026-06-01T10:00:00.000Z",
      revision: 0,
      localState: "pending_create" as const,
      serverRevision: null,
      lastAttemptAt: null,
      retryCount: 0,
      lastErrorCode: null,
    };
    let persisted: OfflineAccountState | null = emptyOfflineState();
    persisted.timeZone = "Europe/Berlin";
    persisted.summary = { ...emptyGoalSummary };
    persisted.entries = [
      existingEntry,
      secondPageEntry,
      staleThirdPageEntry,
    ].map((entry) => ({
      ...entry,
      localState: "synced" as const,
      serverRevision: entry.revision,
      lastAttemptAt: null,
      retryCount: 0,
      lastErrorCode: null,
    }));
    persisted.entries.push(pendingEntry);
    persisted.queue = [
      {
        id: "mutation-local-old",
        entity: "entry",
        operation: "create",
        entityId: pendingEntry.id,
        payload: {
          amount: Number(pendingEntry.amount),
          entryDate: pendingEntry.entryDate,
          timezone: pendingEntry.timezone,
          recordedAtClient: pendingEntry.recordedAtClient,
        },
        expectedRevision: null,
        createdAt: pendingEntry.createdAt,
        status: "pending",
        lastAttemptAt: null,
        retryCount: 0,
        lastErrorCode: null,
        nextAttemptAt: null,
      },
    ];
    persisted.serverCursor = {
      entryDate: "2026-08-28",
      createdAt: "2026-08-28T10:00:00.000Z",
      id: "00000000-0000-4000-8000-000000000004",
    };
    persisted.hasMore = true;
    const persistence = {
      load: vi.fn(async () => structuredClone(persisted)),
      save: vi.fn(async (state: OfflineAccountState) => {
        persisted = structuredClone(state);
      }),
      clear: vi.fn(),
    };
    const list = vi
      .fn()
      .mockResolvedValueOnce({
        items: [existingEntry],
        nextCursor: firstPageCursor,
        hasMore: true,
      })
      .mockResolvedValueOnce({
        items: [secondPageEntry],
        nextCursor: secondPageCursor,
        hasMore: true,
      });
    const entriesGateway = gateway({ list });
    const offline = new OfflineController(
      persistence,
      entriesGateway,
      () => new Date("2026-08-31T10:01:00.000Z"),
      () => "mutation-restarted",
      { drain: vi.fn().mockResolvedValue(undefined) },
    );
    const store = new EntriesStore(
      entriesGateway,
      "UTC",
      () => new Date("2026-08-31T10:01:00.000Z"),
      () => "unused",
      offline,
    );

    await store.load();

    expect(store.snapshot.entries.map(({ id }) => id)).toEqual([
      existingEntry.id,
      pendingEntry.id,
    ]);
    expect(store.snapshot.entries[1]).toMatchObject({
      id: pendingEntry.id,
      localState: "pending_create",
    });
    expect(offline.state).toMatchObject({
      serverCursor: firstPageCursor,
      hasMore: true,
      queue: [{ entityId: pendingEntry.id, status: "pending" }],
    });

    await store.loadMore();

    expect(list).toHaveBeenNthCalledWith(2, firstPageCursor, 30);
    expect(store.snapshot.entries.map(({ id }) => id)).toEqual([
      existingEntry.id,
      secondPageEntry.id,
      pendingEntry.id,
    ]);
  });

  it("advances and persists the gateway cursor after every offline page", async () => {
    const firstCursor = {
      entryDate: "2026-08-30",
      createdAt: "2026-08-30T10:00:00.000Z",
      id: "00000000-0000-4000-8000-000000000002",
    };
    const secondCursor = {
      entryDate: "2026-08-29",
      createdAt: "2026-08-29T10:00:00.000Z",
      id: "00000000-0000-4000-8000-000000000003",
    };
    const list = vi
      .fn()
      .mockResolvedValueOnce({
        items: [existingEntry],
        nextCursor: firstCursor,
        hasMore: true,
      })
      .mockResolvedValueOnce({
        items: [
          {
            ...existingEntry,
            id: firstCursor.id,
            entryDate: firstCursor.entryDate,
            createdAt: firstCursor.createdAt,
          },
        ],
        nextCursor: secondCursor,
        hasMore: true,
      })
      .mockResolvedValueOnce({
        items: [
          {
            ...existingEntry,
            id: secondCursor.id,
            entryDate: secondCursor.entryDate,
            createdAt: secondCursor.createdAt,
          },
        ],
        nextCursor: null,
        hasMore: false,
      });
    let persisted: OfflineAccountState | null = null;
    const persistence = {
      load: vi.fn(async () => structuredClone(persisted)),
      save: vi.fn(async (state: OfflineAccountState) => {
        persisted = structuredClone(state);
      }),
      clear: vi.fn(),
    };
    const offlineGateway = gateway({ list });
    const store = new EntriesStore(
      offlineGateway,
      "UTC",
      () => new Date("2026-08-31T10:00:00.000Z"),
      () => "unused",
      new OfflineController(
        persistence,
        offlineGateway,
        () => new Date("2026-08-31T10:00:00.000Z"),
        () => "mutation-generated",
      ),
    );

    await store.load();
    await store.loadMore();
    await store.loadMore();

    expect(list).toHaveBeenNthCalledWith(2, firstCursor, 30);
    expect(list).toHaveBeenNthCalledWith(3, secondCursor, 30);
    expect(persisted).toMatchObject({
      serverCursor: null,
      hasMore: false,
    });
  });

  it("migrates legacy cached pagination state without cursor by preserving data and disabling unsafe load-more", async () => {
    const list = vi.fn().mockRejectedValueOnce(new Error("INTERNAL"));
    const legacy = emptyOfflineState() as OfflineAccountState & {
      serverCursor?: unknown;
    };
    legacy.timeZone = "Europe/Berlin";
    legacy.summary = { ...emptyGoalSummary };
    legacy.entries = [
      {
        ...existingEntry,
        localState: "pending_create",
        serverRevision: null,
        lastAttemptAt: null,
        retryCount: 0,
        lastErrorCode: null,
      },
    ];
    legacy.queue = [
      {
        id: "mutation-legacy",
        entity: "entry",
        operation: "create",
        entityId: existingEntry.id,
        payload: {
          amount: 5,
          entryDate: existingEntry.entryDate,
          timezone: existingEntry.timezone,
          recordedAtClient: existingEntry.recordedAtClient,
        },
        expectedRevision: null,
        createdAt: existingEntry.createdAt,
        status: "pending",
        lastAttemptAt: null,
        retryCount: 0,
        lastErrorCode: null,
        nextAttemptAt: null,
      },
    ];
    legacy.hasMore = true;
    (legacy as { serverCursor?: unknown }).serverCursor = undefined;
    let persisted: OfflineAccountState | null = legacy;
    const persistence = {
      load: vi.fn(async () => structuredClone(persisted)),
      save: vi.fn(async (state: OfflineAccountState) => {
        persisted = structuredClone(state);
      }),
      clear: vi.fn(),
    };
    const store = new EntriesStore(
      gateway({ list }),
      "UTC",
      () => new Date("2026-08-31T10:00:00.000Z"),
      () => "unused",
      new OfflineController(
        persistence,
        gateway({ list }),
        () => new Date("2026-08-31T10:00:00.000Z"),
        () => "mutation-generated",
        { drain: vi.fn().mockResolvedValue(undefined) },
      ),
    );

    await store.load();
    await store.loadMore();

    expect(store.snapshot.entries).toHaveLength(1);
    expect(store.snapshot.pendingCount).toBe(1);
    expect(store.snapshot.hasMore).toBe(false);
    expect(list).toHaveBeenCalledTimes(1);
  });

  it("surfaces malformed cached state without overwriting queued data", async () => {
    const malformed = emptyOfflineState();
    malformed.entries = [
      {
        ...existingEntry,
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
        entityId: existingEntry.id,
        payload: { amount: 8, entryDate: existingEntry.entryDate },
        expectedRevision: 1,
        createdAt: existingEntry.createdAt,
        status: "pending",
        lastAttemptAt: null,
        retryCount: 0,
        lastErrorCode: null,
        nextAttemptAt: null,
      },
    ] as unknown as OfflineAccountState["queue"];
    const persistence = {
      load: vi.fn(async () => malformed),
      save: vi.fn(),
      clear: vi.fn(),
    };
    const list = vi.fn();
    const store = new EntriesStore(
      gateway({ list }),
      "UTC",
      () => new Date("2026-08-31T10:00:00.000Z"),
      () => "unused",
      new OfflineController(
        persistence,
        gateway({ list }),
        () => new Date("2026-08-31T10:00:00.000Z"),
        () => "mutation-generated",
      ),
    );

    await expect(store.load()).resolves.toBeUndefined();

    expect(store.snapshot.viewState).toBe("error");
    expect(store.snapshot.errorCode).toBe("INVALID_OFFLINE_STATE");
    expect(list).not.toHaveBeenCalled();
    expect(persistence.save).not.toHaveBeenCalled();
    expect((await persistence.load()).queue).toHaveLength(1);
  });

  it("keeps transient cache loads retryable until a retry succeeds", async () => {
    const persistence = {
      load: vi
        .fn()
        .mockRejectedValueOnce(new Error("INTERNAL"))
        .mockRejectedValueOnce(new Error("INTERNAL"))
        .mockResolvedValue(emptyOfflineState()),
      save: vi.fn(),
      clear: vi.fn(),
    };
    const entriesGateway = gateway();
    const store = new EntriesStore(
      entriesGateway,
      "UTC",
      () => new Date("2026-08-31T10:00:00.000Z"),
      () => "unused",
      new OfflineController(
        persistence,
        entriesGateway,
        () => new Date("2026-08-31T10:00:00.000Z"),
        () => "mutation-generated",
      ),
    );

    await store.load();
    expect(store.snapshot.offlineLoadErrorCode).toBe("INTERNAL");

    await store.retryOfflineLoad();
    expect(store.snapshot.offlineLoadErrorCode).toBe("INTERNAL");

    await store.retryOfflineLoad();
    expect(store.snapshot.offlineLoadErrorCode).toBeNull();
    expect(store.snapshot.viewState).toBe("content");
    expect(persistence.load).toHaveBeenCalledTimes(3);
    expect(persistence.clear).not.toHaveBeenCalled();
  });

  it("surfaces a mid-drain writer failure without publishing unpersisted sync state", async () => {
    const initial = emptyOfflineState();
    initial.timeZone = "Europe/Berlin";
    const secondEntry = {
      ...existingEntry,
      id: "00000000-0000-4000-8000-000000000002",
      amount: "8",
    };
    initial.entries = [existingEntry, secondEntry].map((entry) => ({
      ...entry,
      revision: 0,
      localState: "pending_create" as const,
      serverRevision: null,
      lastAttemptAt: null,
      retryCount: 0,
      lastErrorCode: null,
    }));
    initial.queue = initial.entries.map((entry, index) => ({
      id: `mutation-${index + 1}`,
      entity: "entry" as const,
      operation: "create" as const,
      entityId: entry.id,
      payload: {
        amount: Number(entry.amount),
        entryDate: entry.entryDate,
        timezone: entry.timezone,
        recordedAtClient: entry.recordedAtClient,
      },
      expectedRevision: null,
      createdAt: entry.createdAt,
      status: "pending" as const,
      lastAttemptAt: null,
      retryCount: 0,
      lastErrorCode: null,
      nextAttemptAt: null,
    }));
    let persisted = structuredClone(initial);
    let saveCount = 0;
    const persistence = {
      load: vi.fn(async () => structuredClone(persisted)),
      save: vi.fn(async (state: OfflineAccountState) => {
        saveCount += 1;
        if (saveCount === 2) throw new Error("INVALID_OFFLINE_STATE");
        persisted = structuredClone(state);
      }),
      clear: vi.fn(),
    };
    const entriesGateway = gateway({
      create: vi.fn(async (input) => ({
        ...existingEntry,
        id: input.id,
        amount: String(input.amount),
        entryDate: input.entryDate,
        timezone: input.timezone,
        recordedAtClient: input.recordedAtClient,
      })),
    });
    const offline = new OfflineController(
      persistence,
      entriesGateway,
      () => new Date("2026-08-31T10:00:00.000Z"),
      () => "unused",
    );
    await offline.load();
    const store = new EntriesStore(
      entriesGateway,
      "UTC",
      () => new Date("2026-08-31T10:00:00.000Z"),
      () => "unused",
      offline,
    );

    await store.syncPending();

    expect(store.snapshot).toMatchObject({
      syncState: "error",
      errorCode: "INVALID_OFFLINE_STATE",
    });
    expect(offline.state).toEqual(persisted);
    expect(offline.state.entries).toEqual([
      expect.objectContaining({
        id: existingEntry.id,
        localState: "synced",
      }),
      expect.objectContaining({
        id: secondEntry.id,
        localState: "pending_create",
      }),
    ]);
    expect(offline.state.queue.map(({ entityId }) => entityId)).toEqual([
      secondEntry.id,
    ]);
    expect(() =>
      migrateOfflineState(structuredClone(offline.state)),
    ).not.toThrow();
  });

  it("clears invalid local state and reloads canonical server data on explicit recovery", async () => {
    const malformed = emptyOfflineState();
    malformed.summary = {
      todayTotal: 5,
    } as unknown as OfflineAccountState["summary"];
    let persisted: OfflineAccountState | null = malformed;
    const events: string[] = [];
    const persistence = {
      load: vi.fn(async () => structuredClone(persisted)),
      save: vi.fn(async (state: OfflineAccountState) => {
        events.push("save");
        persisted = structuredClone(state);
      }),
      clear: vi.fn(async () => {
        events.push("clear");
        persisted = null;
      }),
    };
    const list = vi.fn(async () => {
      events.push("list");
      return {
        items: [existingEntry],
        nextCursor: null,
        hasMore: false,
      };
    });
    const entriesGateway = gateway({ list });
    const store = new EntriesStore(
      entriesGateway,
      "UTC",
      () => new Date("2026-08-31T10:00:00.000Z"),
      () => "unused",
      new OfflineController(
        persistence,
        entriesGateway,
        () => new Date("2026-08-31T10:00:00.000Z"),
        () => "mutation-generated",
      ),
    );
    await store.load();

    await store.resetOfflineState();

    expect(persistence.clear).toHaveBeenCalledTimes(1);
    expect(events.indexOf("clear")).toBeLessThan(events.indexOf("list"));
    expect(store.snapshot).toMatchObject({
      viewState: "content",
      errorCode: null,
      entries: [
        expect.objectContaining({
          id: existingEntry.id,
          localState: "synced",
        }),
      ],
      summary: {
        todayTotal: "5",
        weekTotal: "5",
        allTimeTotal: "5",
      },
    });
  });

  it("keeps recovery required when clearing invalid local state fails", async () => {
    const malformed = emptyOfflineState();
    malformed.summary = {
      todayTotal: 5,
    } as unknown as OfflineAccountState["summary"];
    const persistence = {
      load: vi.fn(async () => structuredClone(malformed)),
      save: vi.fn(),
      clear: vi.fn().mockRejectedValue(new Error("INTERNAL")),
    };
    const entriesGateway = gateway();
    const store = new EntriesStore(
      entriesGateway,
      "UTC",
      () => new Date("2026-08-31T10:00:00.000Z"),
      () => "unused",
      new OfflineController(
        persistence,
        entriesGateway,
        () => new Date("2026-08-31T10:00:00.000Z"),
        () => "mutation-generated",
      ),
    );
    await store.load();

    await store.resetOfflineState();

    expect(store.snapshot).toMatchObject({
      viewState: "error",
      errorCode: "INVALID_OFFLINE_STATE",
    });
    expect(persistence.save).not.toHaveBeenCalled();
    expect(await persistence.load()).toEqual(malformed);
  });

  it("keeps conflict sync state and counts after resolving one selected entry", async () => {
    const secondEntry = {
      ...existingEntry,
      id: "00000000-0000-4000-8000-000000000002",
      amount: "12",
      entryDate: "2026-08-30",
      revision: 5,
    };
    const firstConflict = {
      entryId: existingEntry.id,
      operation: "update" as const,
      localAmount: "8",
      localEntryDate: existingEntry.entryDate,
      serverEntry: { ...existingEntry, amount: "7", revision: 2 },
    };
    const secondConflict = {
      entryId: secondEntry.id,
      operation: "update" as const,
      localAmount: "12",
      localEntryDate: secondEntry.entryDate,
      serverEntry: { ...secondEntry, amount: "10", revision: 6 },
    };
    let persisted: OfflineAccountState | null = emptyOfflineState();
    persisted.timeZone = "Europe/Berlin";
    persisted.summary = { ...emptyGoalSummary };
    persisted.entries = [
      {
        ...existingEntry,
        amount: "8",
        localState: "conflict",
        serverRevision: 1,
        lastAttemptAt: "2026-08-31T10:00:00.000Z",
        retryCount: 1,
        lastErrorCode: "ENTRY_VERSION_CONFLICT",
      },
      {
        ...secondEntry,
        localState: "conflict",
        serverRevision: 5,
        lastAttemptAt: "2026-08-31T10:00:00.000Z",
        retryCount: 1,
        lastErrorCode: "ENTRY_VERSION_CONFLICT",
      },
    ];
    persisted.queue = [
      {
        id: "mutation-1",
        entity: "entry",
        operation: "update",
        entityId: existingEntry.id,
        payload: { amount: 8, entryDate: existingEntry.entryDate },
        expectedRevision: 1,
        createdAt: "2026-08-31T10:00:00.000Z",
        status: "conflict",
        lastAttemptAt: "2026-08-31T10:00:00.000Z",
        retryCount: 1,
        lastErrorCode: "ENTRY_VERSION_CONFLICT",
        nextAttemptAt: null,
      },
      {
        id: "mutation-2",
        entity: "entry",
        operation: "update",
        entityId: secondEntry.id,
        payload: { amount: 12, entryDate: secondEntry.entryDate },
        expectedRevision: 5,
        createdAt: "2026-08-31T10:00:00.000Z",
        status: "conflict",
        lastAttemptAt: "2026-08-31T10:00:00.000Z",
        retryCount: 1,
        lastErrorCode: "ENTRY_VERSION_CONFLICT",
        nextAttemptAt: null,
      },
    ];
    persisted.conflicts = [firstConflict, secondConflict];
    persisted.conflict = firstConflict;
    const persistence = {
      load: vi.fn(async () => structuredClone(persisted)),
      save: vi.fn(async (state: OfflineAccountState) => {
        persisted = structuredClone(state);
      }),
      clear: vi.fn(),
    };
    const offlineGateway = gateway({
      list: vi.fn().mockRejectedValue(new Error("INTERNAL")),
    });
    const store = new EntriesStore(
      offlineGateway,
      "UTC",
      () => new Date("2026-08-31T10:00:00.000Z"),
      () => "unused",
      new OfflineController(
        persistence,
        offlineGateway,
        () => new Date("2026-08-31T10:00:00.000Z"),
        () => "mutation-generated",
        { drain: vi.fn().mockResolvedValue(undefined) },
      ),
    );

    await store.load();
    expect(store.snapshot).toMatchObject({
      syncState: "conflict",
      pendingCount: 0,
      failedCount: 0,
      conflictEntryId: existingEntry.id,
    });

    await store.keepServerVersion(secondEntry.id);

    expect(store.snapshot).toMatchObject({
      syncState: "conflict",
      pendingCount: 0,
      failedCount: 0,
      conflictEntryId: existingEntry.id,
    });
    expect(store.snapshot.conflicts.map(({ entryId }) => entryId)).toEqual([
      existingEntry.id,
    ]);
  });

  it("shows a goal optimistically and reconciles the canonical summary", async () => {
    let resolveGoal: () => void = () => undefined;
    const setGoal = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveGoal = resolve;
        }),
    );
    const getSummary = vi
      .fn()
      .mockResolvedValueOnce(emptyGoalSummary)
      .mockResolvedValueOnce({
        ...emptyGoalSummary,
        todayGoal: "100",
        eligibleGoalDays: "1",
      });
    const store = new EntriesStore(
      gateway({ getSummary, setGoal }),
      "UTC",
      () => new Date("2026-08-31T10:00:00.000Z"),
      () => "unused",
    );
    await store.load();

    const first = store.setGoal(100);
    const second = store.setGoal(200);

    expect(store.snapshot.summary.todayGoal).toBe("100");
    expect(setGoal).toHaveBeenCalledWith(100, "2026-08-31");
    await expect(second).resolves.toBeUndefined();

    resolveGoal();
    await first;

    expect(store.snapshot.summary).toMatchObject({
      todayGoal: "100",
      eligibleGoalDays: "1",
    });
  });

  it("restores the previous goal after the backend rejects a new target", async () => {
    const store = new EntriesStore(
      gateway({
        getSummary: vi.fn().mockResolvedValue({
          ...emptyGoalSummary,
          todayGoal: "100",
          eligibleGoalDays: "1",
        }),
        setGoal: vi.fn().mockRejectedValue(new Error("INVALID_AMOUNT")),
      }),
      "UTC",
      () => new Date("2026-08-31T10:00:00.000Z"),
      () => "unused",
    );
    await store.load();

    await expect(store.setGoal(200)).rejects.toThrow("INVALID_AMOUNT");

    expect(store.snapshot.summary.todayGoal).toBe("100");
    expect(store.snapshot.errorCode).toBe("INVALID_AMOUNT");
  });

  it("clears the goal and restores it when deactivation fails", async () => {
    const store = new EntriesStore(
      gateway({
        getSummary: vi.fn().mockResolvedValue({
          ...emptyGoalSummary,
          todayGoal: "100",
          eligibleGoalDays: "1",
        }),
        setGoal: vi.fn().mockRejectedValue(new Error("INTERNAL")),
      }),
      "UTC",
      () => new Date("2026-08-31T10:00:00.000Z"),
      () => "unused",
    );
    await store.load();

    await expect(store.clearGoal()).rejects.toThrow("INTERNAL");

    expect(store.snapshot.summary.todayGoal).toBe("100");
  });
});
