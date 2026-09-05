import { describe, expect, it, vi } from "vitest";
import {
  createReminderScheduler,
  toReminderPermission,
} from "./scheduler";

describe("reminder scheduler", () => {
  it.each([
    [{ status: "undetermined", canAskAgain: true }, "not_asked"],
    [{ status: "granted", canAskAgain: true }, "granted"],
    [{ status: "denied", canAskAgain: true }, "denied"],
    [{ status: "denied", canAskAgain: false }, "blocked"],
    [{ status: "granted", canAskAgain: false, ios: { status: 1 } }, "blocked"],
  ] as const)("maps platform permission %o to %s", (status, expected) => {
    expect(toReminderPermission(status)).toBe(expected);
  });

  it("schedules a daily local reminder with the selected wall-clock time", async () => {
    const scheduleNotificationAsync = vi.fn(async () => "notification-1");
    const scheduler = createReminderScheduler({
      getPermissionsAsync: async () => ({ status: "granted", canAskAgain: true }),
      requestPermissionsAsync: async () => ({
        status: "granted",
        canAskAgain: true,
      }),
      scheduleNotificationAsync,
      cancelScheduledNotificationAsync: async () => undefined,
      getAllScheduledNotificationsAsync: async () => [],
      setNotificationChannelAsync: async () => null,
    });

    await expect(scheduler.scheduleDaily({ hour: 7, minute: 5 })).resolves.toBe(
      "notification-1",
    );
    expect(scheduleNotificationAsync).toHaveBeenCalledWith({
      content: {
        title: "Salawat Circle",
        body: "Zeit für deine heutige Salawat.",
        data: { url: "salawat-circle://today" },
      },
      trigger: { type: "daily", hour: 7, minute: 5, channelId: "salawat-daily" },
    });
  });

  it("schedules a local Friday reminder at the selected wall-clock time", async () => {
    const scheduleNotificationAsync = vi.fn(async () => "friday-notification");
    const scheduler = createReminderScheduler({
      getPermissionsAsync: async () => ({ status: "granted", canAskAgain: true }),
      requestPermissionsAsync: async () => ({
        status: "granted",
        canAskAgain: true,
      }),
      scheduleNotificationAsync,
      cancelScheduledNotificationAsync: async () => undefined,
      getAllScheduledNotificationsAsync: async () => [],
      setNotificationChannelAsync: async () => null,
    });

    await expect(scheduler.scheduleFriday({ hour: 12, minute: 30 })).resolves.toBe(
      "friday-notification",
    );
    expect(scheduleNotificationAsync).toHaveBeenCalledWith({
      content: {
        title: "Salawat Circle",
        body: "Zeit für deine heutige Salawat.",
        data: { url: "salawat-circle://today" },
      },
      trigger: {
        type: "weekly",
        weekday: 6,
        hour: 12,
        minute: 30,
        channelId: "salawat-friday",
      },
    });
  });

  it("uses the caller's localized notification copy", async () => {
    const scheduleNotificationAsync = vi.fn(async () => "notification-1");
    const scheduler = createReminderScheduler({
      getPermissionsAsync: async () => ({ status: "granted", canAskAgain: true }),
      requestPermissionsAsync: async () => ({
        status: "granted",
        canAskAgain: true,
      }),
      scheduleNotificationAsync,
      cancelScheduledNotificationAsync: async () => undefined,
      getAllScheduledNotificationsAsync: async () => [],
      setNotificationChannelAsync: async () => null,
    });

    await scheduler.scheduleDaily(
      { hour: 7, minute: 5 },
      { title: "Salawat Circle", body: "Time for your Salawat today." },
    );

    expect(scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          body: "Time for your Salawat today.",
        }),
      }),
    );
  });
});
