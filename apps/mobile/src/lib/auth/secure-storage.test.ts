import { describe, expect, it } from "vitest";
import { createSecureStorage } from "./secure-storage";

describe("secure auth storage", () => {
  it("persists and removes a session through the secure backend", async () => {
    const values = new Map<string, string>();
    const storage = createSecureStorage({
      getItemAsync: async (key) => values.get(key) ?? null,
      setItemAsync: async (key, value) => {
        values.set(key, value);
      },
      deleteItemAsync: async (key) => {
        values.delete(key);
      },
    });

    await storage.setItem("supabase.session", "synthetic-session");
    await expect(storage.getItem("supabase.session")).resolves.toBe(
      "synthetic-session",
    );

    await storage.removeItem("supabase.session");
    await expect(storage.getItem("supabase.session")).resolves.toBeNull();
  });

  it("fails closed when the secure backend cannot restore a session", async () => {
    const storage = createSecureStorage({
      getItemAsync: async () => {
        throw new Error("keychain unavailable");
      },
      setItemAsync: async () => undefined,
      deleteItemAsync: async () => undefined,
    });

    await expect(storage.getItem("supabase.session")).resolves.toBeNull();
  });
});
