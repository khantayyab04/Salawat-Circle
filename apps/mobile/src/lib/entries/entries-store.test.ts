import { describe, expect, it, vi } from "vitest";
import type { EntriesGateway, Entry } from "./entries-gateway";
import { EntriesStore } from "./entries-store";
import { OfflineController } from "@/lib/offline/controller";
import {
  emptyOfflineState,
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
