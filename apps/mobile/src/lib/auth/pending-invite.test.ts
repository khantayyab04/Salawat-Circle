import { describe, expect, it } from "vitest";
import { createPendingInviteStore } from "./pending-invite";

describe("pending invitation storage", () => {
  it("returns a stored token once and removes it from secure storage", async () => {
    const values = new Map<string, string>();
    const store = createPendingInviteStore({
      getItemAsync: async (key) => values.get(key) ?? null,
      setItemAsync: async (key, value) => {
        values.set(key, value);
      },
      deleteItemAsync: async (key) => {
        values.delete(key);
      },
    });

    await store.save("synthetic-invite-token");
    await expect(store.consume()).resolves.toBe("synthetic-invite-token");
    await expect(store.consume()).resolves.toBeNull();
  });
});
