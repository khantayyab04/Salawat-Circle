import { describe, expect, it, vi } from "vitest";
import { createDatabaseKeyStore } from "./database-key";

describe("database key store", () => {
  it("creates one account-scoped 256-bit key and reuses it", async () => {
    const values = new Map<string, string>();
    const backend = {
      getItemAsync: vi.fn(async (key: string) => values.get(key) ?? null),
      setItemAsync: vi.fn(async (key: string, value: string) => {
        values.set(key, value);
      }),
      deleteItemAsync: vi.fn(async (key: string) => {
        values.delete(key);
      }),
    };
    const randomBytes = vi.fn(() => new Uint8Array(32).fill(7));
    const store = createDatabaseKeyStore(backend, randomBytes);

    const first = await store.getOrCreate("account-a");
    const second = await store.getOrCreate("account-a");
    const other = await store.getOrCreate("account-b");

    expect(first).toEqual(new Uint8Array(32).fill(7));
    expect(second).toEqual(first);
    expect(other).toEqual(first);
    expect(randomBytes).toHaveBeenCalledTimes(2);
    expect(backend.setItemAsync).toHaveBeenCalledTimes(2);
  });

  it("removes only the selected account key", async () => {
    const values = new Map([
      ["salawat.offline.key.account-a", "07".repeat(32)],
      ["salawat.offline.key.account-b", "08".repeat(32)],
    ]);
    const backend = {
      getItemAsync: vi.fn(async (key: string) => values.get(key) ?? null),
      setItemAsync: vi.fn(),
      deleteItemAsync: vi.fn(async (key: string) => {
        values.delete(key);
      }),
    };
    const store = createDatabaseKeyStore(backend, () => new Uint8Array(32));

    await store.remove("account-a");

    expect(values.has("salawat.offline.key.account-a")).toBe(false);
    expect(values.has("salawat.offline.key.account-b")).toBe(true);
  });
});
