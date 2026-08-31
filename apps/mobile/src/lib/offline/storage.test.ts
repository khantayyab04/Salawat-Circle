import { describe, expect, it, vi } from "vitest";
import { EncryptedAccountStorage, type EncryptedRowBackend } from "./storage";
import { emptyOfflineState } from "./types";

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
});
