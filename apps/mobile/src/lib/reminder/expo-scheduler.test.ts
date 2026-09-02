import { describe, expect, it, vi } from "vitest";
import { createExpoReminderScheduler } from "./expo-scheduler";

const notifications = vi.hoisted(() => ({
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DAILY: "daily" },
  getPermissionsAsync: vi.fn(async () => ({
    status: "granted",
    canAskAgain: true,
  })),
  requestPermissionsAsync: vi.fn(async () => ({
    status: "granted",
    canAskAgain: true,
  })),
  scheduleNotificationAsync: vi.fn(async () => "notification-1"),
  cancelScheduledNotificationAsync: vi.fn(async () => undefined),
  getAllScheduledNotificationsAsync: vi.fn(async () => []),
  setNotificationChannelAsync: vi.fn(async () => null),
  addNotificationResponseReceivedListener: vi.fn<
    (
      listener: (value: {
        notification: { request: { content: { data: unknown } } };
      }) => void,
    ) => { remove: () => void }
  >(),
  getLastNotificationResponseAsync: vi.fn<
    () => Promise<{ notification: { request: { content: { data: unknown } } } } | null>
  >(async () => null),
  clearLastNotificationResponseAsync: vi.fn(async () => undefined),
}));

vi.mock("expo-notifications", () => notifications);

describe("Expo reminder scheduler", () => {
  it("uses Expo's daily trigger and default Android channel importance", async () => {
    const scheduler = createExpoReminderScheduler();

    await scheduler.scheduleDaily({ hour: 7, minute: 5 });

    expect(notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      "salawat-daily",
      { name: "Salawat Circle", importance: 3 },
    );
    expect(notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: {
        title: "Salawat Circle",
        body: "Zeit für deine heutige Salawat.",
        data: { url: "salawat-circle://today" },
      },
      trigger: {
        type: "daily",
        hour: 7,
        minute: 5,
        channelId: "salawat-daily",
      },
    });

  });

  it("routes only this app's reminder notification responses to today", async () => {
    const openToday = vi.fn();
    notifications.addNotificationResponseReceivedListener.mockImplementation(
      (listener: (value: { notification: { request: { content: { data: unknown } } } }) => void) => {
        listener({
          notification: {
            request: { content: { data: { url: "salawat-circle://today" } } },
          },
        });
        return { remove: vi.fn() };
      },
    );

    const { subscribeToReminderResponses } = await import("./expo-scheduler");
    subscribeToReminderResponses(openToday);

    expect(openToday).toHaveBeenCalledOnce();
  });

  it("recognizes a reminder response retained from a cold app start", async () => {
    notifications.getLastNotificationResponseAsync.mockResolvedValueOnce({
      notification: {
        request: { content: { data: { url: "salawat-circle://today" } } },
      },
    });

    const { wasOpenedFromReminder } = await import("./expo-scheduler");

    await expect(wasOpenedFromReminder()).resolves.toBe(true);
    expect(notifications.clearLastNotificationResponseAsync).toHaveBeenCalledOnce();
  });
});
