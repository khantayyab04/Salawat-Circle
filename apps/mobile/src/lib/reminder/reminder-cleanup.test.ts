import { describe, expect, it, vi } from "vitest";
import { clearActiveReminderForLogout } from "./reminder-cleanup";

describe("reminder logout cleanup", () => {
  it("cancels the active account notification but preserves the selected time disabled", async () => {
    const store = {
      getActiveAccount: vi.fn(async () => "account-a"),
      load: vi.fn(async () => ({
        hour: 7,
        minute: 5,
        enabled: true,
        notificationId: "notification-a",
      })),
      save: vi.fn(async () => undefined),
    };
    const scheduler = { cancel: vi.fn(async () => undefined) };

    await clearActiveReminderForLogout(store, scheduler);

    expect(scheduler.cancel).toHaveBeenCalledWith("notification-a");
    expect(store.save).toHaveBeenCalledWith("account-a", {
      hour: 7,
      minute: 5,
      enabled: false,
      notificationId: null,
    });
  });
});
