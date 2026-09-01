import { describe, expect, it, vi } from "vitest";
import type { EntriesGateway } from "@/lib/entries/entries-gateway";
import { OfflineController } from "./controller";
import { encryptJson } from "./local-crypto";
import { EncryptedAccountStorage, type EncryptedRowBackend } from "./storage";
import { emptyOfflineState, type OfflineAccountState } from "./types";

function backend() {
  const rows = new Map<string, string>();
  const value: EncryptedRowBackend = {
    read: vi.fn(async (accountId) => rows.get(accountId) ?? null),
    write: vi.fn(async (accountId, encryptedPayload) => {
      rows.set(accountId, encryptedPayload);
    }),
    remove: vi.fn(async (accountId) => {
      rows.delete(accountId);
    }),
  };
  return { rows, value };
}

describe("EncryptedAccountStorage", () => {
  it("persists account state without exposing entry values in SQLite", async () => {
    const rows = backend();
    const state = emptyOfflineState();
    state.entries.push({
      id: "entry-1",
      amount: "424242",
      entryDate: "2026-08-31",
      timezone: "Europe/Berlin",
      recordedAtClient: "2026-08-31T10:00:00.000Z",
      createdAt: "2026-08-31T10:00:00.000Z",
      updatedAt: "2026-08-31T10:00:00.000Z",
      revision: 0,
      localState: "pending_create",
      serverRevision: null,
      lastAttemptAt: null,
      retryCount: 0,
      lastErrorCode: null,
    });
    state.queue.push({
      id: "mutation-1",
      entity: "entry",
      operation: "create",
      entityId: "entry-1",
      payload: {
        amount: 424242,
        entryDate: "2026-08-31",
        timezone: "Europe/Berlin",
        recordedAtClient: "2026-08-31T10:00:00.000Z",
      },
      expectedRevision: null,
      createdAt: "2026-08-31T10:00:00.000Z",
      status: "pending",
      lastAttemptAt: null,
      retryCount: 0,
      lastErrorCode: null,
      nextAttemptAt: null,
    });
    const storage = new EncryptedAccountStorage(
      "account-a",
      new Uint8Array(32).fill(7),
      rows.value,
      () => new Uint8Array(12).fill(1),
    );

    await storage.save(state);

    expect(rows.rows.get("account-a")).not.toContain("424242");
    expect(await storage.load()).toEqual(state);
  });

  it("rejects loader-invalid writes without replacing recoverable state", async () => {
    const rows = backend();
    const storage = new EncryptedAccountStorage(
      "account-a",
      new Uint8Array(32).fill(7),
      rows.value,
      () => new Uint8Array(12).fill(1),
    );
    const valid = emptyOfflineState();
    valid.timeZone = "Europe/Berlin";
    await storage.save(valid);
    const invalid = structuredClone(valid);
    invalid.entries = [
      {
        id: "entry-1",
        amount: "42",
        entryDate: "2026-08-31",
        timezone: "Europe/Berlin",
        recordedAtClient: "2026-08-31T10:00:00.000Z",
        createdAt: "2026-08-31T10:00:00.000Z",
        updatedAt: "2026-08-31T10:00:00.000Z",
        revision: 1,
        localState: "conflict",
        serverRevision: 1,
        lastAttemptAt: "2026-08-31T10:00:00.000Z",
        retryCount: 1,
        lastErrorCode: "ENTRY_VERSION_CONFLICT",
      },
    ];
    invalid.queue = [
      {
        id: "mutation-1",
        entity: "entry",
        operation: "update",
        entityId: "entry-1",
        payload: { amount: 42, entryDate: "2026-08-31" },
        expectedRevision: 1,
        createdAt: "2026-08-31T10:00:00.000Z",
        status: "conflict",
        lastAttemptAt: "2026-08-31T10:00:00.000Z",
        retryCount: 1,
        lastErrorCode: "ENTRY_VERSION_CONFLICT",
        nextAttemptAt: null,
      },
    ];

    await expect(storage.save(invalid)).rejects.toThrow(
      "INVALID_OFFLINE_STATE",
    );

    expect(await storage.load()).toEqual(valid);
  });

  it("persists the normalized migration result for legacy state", async () => {
    const rows = backend();
    const storage = new EncryptedAccountStorage(
      "account-a",
      new Uint8Array(32).fill(7),
      rows.value,
      () => new Uint8Array(12).fill(1),
    );
    const legacy = {
      entries: [],
      summary: emptyOfflineState().summary,
      timeZone: "",
      queue: [],
      conflict: null,
      hasMore: true,
    } as unknown as OfflineAccountState;

    await storage.save(legacy);

    expect(await storage.load()).toMatchObject({
      conflicts: [],
      conflict: null,
      serverCursor: null,
      hasMore: false,
    });
  });

  it("maps unreadable encrypted data to recovery without deleting it", async () => {
    const rows = backend();
    const storage = new EncryptedAccountStorage(
      "account-a",
      new Uint8Array(32).fill(7),
      rows.value,
      () => new Uint8Array(12).fill(1),
    );
    await storage.save(emptyOfflineState());
    const encrypted = rows.rows.get("account-a")!;
    const tampered = `${encrypted.slice(0, -1)}${
      encrypted.endsWith("0") ? "1" : "0"
    }`;
    rows.rows.set("account-a", tampered);

    await expect(storage.load()).rejects.toThrow("INVALID_OFFLINE_STATE");

    expect(rows.rows.get("account-a")).toBe(tampered);
  });

  it("isolates and removes the selected account", async () => {
    const rows = backend();
    const first = new EncryptedAccountStorage(
      "account-a",
      new Uint8Array(32).fill(7),
      rows.value,
      () => new Uint8Array(12).fill(1),
    );
    const second = new EncryptedAccountStorage(
      "account-b",
      new Uint8Array(32).fill(8),
      rows.value,
      () => new Uint8Array(12).fill(2),
    );
    const state = emptyOfflineState();
    state.timeZone = "Europe/Berlin";
    await first.save(state);
    await second.save({ ...state, timeZone: "UTC" });

    await first.clear();

    expect(await first.load()).toBeNull();
    expect((await second.load())?.timeZone).toBe("UTC");
  });

  it("migrates legacy encrypted JSON without losing local entries or queued work", async () => {
    const rows = backend();
    const encryptedStorage = new EncryptedAccountStorage(
      "account-a",
      new Uint8Array(32).fill(7),
      rows.value,
      () => new Uint8Array(12).fill(1),
    );
    const legacy = {
      entries: [
        {
          id: "entry-1",
          amount: "42",
          entryDate: "2026-08-31",
          timezone: "Europe/Berlin",
          recordedAtClient: "2026-08-31T10:00:00.000Z",
          createdAt: "2026-08-31T10:00:00.000Z",
          updatedAt: "2026-08-31T10:00:00.000Z",
          revision: 0,
          localState: "pending_create",
          serverRevision: null,
          lastAttemptAt: null,
          retryCount: 0,
          lastErrorCode: null,
        },
      ],
      summary: emptyOfflineState().summary,
      timeZone: "Europe/Berlin",
      queue: [
        {
          id: "mutation-1",
          entity: "entry",
          operation: "create",
          entityId: "entry-1",
          payload: {
            amount: 42,
            entryDate: "2026-08-31",
            timezone: "Europe/Berlin",
            recordedAtClient: "2026-08-31T10:00:00.000Z",
          },
          expectedRevision: null,
          createdAt: "2026-08-31T10:00:00.000Z",
          status: "pending",
          lastAttemptAt: null,
          retryCount: 0,
          lastErrorCode: null,
          nextAttemptAt: null,
        },
      ],
      conflict: null,
      hasMore: true,
    } as unknown as OfflineAccountState;
    await encryptedStorage.save(legacy);
    const gateway = {
      getTimeZone: vi.fn(),
      getSummary: vi.fn(),
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      setGoal: vi.fn(),
    } satisfies EntriesGateway;
    const controller = new OfflineController(
      encryptedStorage,
      gateway,
      () => new Date("2026-08-31T10:00:00.000Z"),
      () => "mutation-2",
    );

    const state = await controller.load();

    expect(state.entries.map(({ id }) => id)).toEqual(["entry-1"]);
    expect(state.queue.map(({ id }) => id)).toEqual(["mutation-1"]);
    expect(state.conflicts).toEqual([]);
    expect(state.serverCursor).toBeNull();
    expect(state.hasMore).toBe(false);
  });

  it("rejects structurally malformed encrypted JSON instead of treating it as empty state", async () => {
    const rows = backend();
    const encryptedStorage = new EncryptedAccountStorage(
      "account-a",
      new Uint8Array(32).fill(7),
      rows.value,
      () => new Uint8Array(12).fill(1),
    );
    rows.rows.set(
      "account-a",
      encryptJson(false, new Uint8Array(32).fill(7), () =>
        new Uint8Array(12).fill(1),
      ),
    );
    const gateway = {
      getTimeZone: vi.fn(),
      getSummary: vi.fn(),
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      setGoal: vi.fn(),
    } satisfies EntriesGateway;
    const controller = new OfflineController(
      encryptedStorage,
      gateway,
      () => new Date("2026-08-31T10:00:00.000Z"),
      () => "mutation-1",
    );

    await expect(controller.load()).rejects.toThrow("INVALID_OFFLINE_STATE");
  });
});
