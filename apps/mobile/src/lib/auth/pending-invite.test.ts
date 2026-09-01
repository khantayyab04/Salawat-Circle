import { describe, expect, it, vi } from "vitest";
import { createPendingInviteStore } from "./pending-invite";

describe("pending invitation storage", () => {
  it("peeks at a stored token repeatedly without deleting it", async () => {
    const values = new Map<string, string>();
    const getItemAsync = vi.fn(async (key: string) => values.get(key) ?? null);
    const setItemAsync = vi.fn(async (key: string, value: string) => {
      values.set(key, value);
    });
    const deleteItemAsync = vi.fn(async (key: string) => {
      values.delete(key);
    });
    const backend = {
      getItemAsync,
      setItemAsync,
      deleteItemAsync,
    };
    const store = createPendingInviteStore(backend);
    const peek = (store as typeof store & { peek?: () => Promise<string | null> })
      .peek;

    expect(peek).toBeTypeOf("function");
    await store.save("synthetic-invite-token");
    await expect(peek?.()).resolves.toBe("synthetic-invite-token");
    const restartedStore = createPendingInviteStore(backend);
    await expect(restartedStore.peek()).resolves.toBe("synthetic-invite-token");
    expect(setItemAsync).toHaveBeenCalledWith(
      "salawat-circle.pending-invite",
      "synthetic-invite-token",
    );
    expect(getItemAsync).toHaveBeenCalledTimes(2);
    expect(deleteItemAsync).not.toHaveBeenCalled();
  });

  it("clears a stored token from secure storage explicitly", async () => {
    const values = new Map<string, string>();
    const deleteItemAsync = vi.fn(async (key: string) => {
      values.delete(key);
    });
    const store = createPendingInviteStore({
      getItemAsync: async (key) => values.get(key) ?? null,
      setItemAsync: async (key, value) => {
        values.set(key, value);
      },
      deleteItemAsync,
    });

    await store.save("synthetic-invite-token");
    await store.clear();
    await expect(store.peek()).resolves.toBeNull();
    expect(deleteItemAsync).toHaveBeenCalledWith("salawat-circle.pending-invite");
  });
});
