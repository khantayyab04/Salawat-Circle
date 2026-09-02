import { describe, expect, it, vi } from "vitest";
import { createReminderStore } from "./reminder-store";

function backend(initial = new Map<string, string>()) {
  return {
    getItemAsync: vi.fn(async (key: string) => initial.get(key) ?? null),
    setItemAsync: vi.fn(async (key: string, value: string) => {
      initial.set(key, value);
    }),
    deleteItemAsync: vi.fn(async (key: string) => {
      initial.delete(key);
    }),
  };
}

describe("reminder store", () => {
  it("preserves a disabled account's selected time for conscious reactivation", async () => {
    const storage = backend();
    const store = createReminderStore(storage);

    await store.activate("account-a");
    await store.save("account-a", {
      hour: 7,
      minute: 5,
      enabled: false,
      notificationId: null,
    });

    await expect(store.load("account-a")).resolves.toEqual({
      hour: 7,
      minute: 5,
      enabled: false,
      notificationId: null,
    });
  });

  it("clears the previous account's reminder data on an account switch", async () => {
    const storage = backend();
    const store = createReminderStore(storage);
    await store.activate("account-a");
    await store.save("account-a", {
      hour: 7,
      minute: 5,
      enabled: true,
      notificationId: "notification-a",
    });

    await store.activate("account-b");

    await expect(store.load("account-a")).resolves.toBeNull();
    expect(storage.deleteItemAsync).toHaveBeenCalledWith(
      "salawat.reminder.account-a",
    );
  });

  it("exposes the active account for logout cleanup", async () => {
    const storage = backend();
    const store = createReminderStore(storage);

    await store.activate("account-a");

    await expect(store.getActiveAccount()).resolves.toBe("account-a");
  });
});
