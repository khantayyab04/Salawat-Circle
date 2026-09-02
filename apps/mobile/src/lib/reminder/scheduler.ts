import { parseReminderTime, type ReminderTime } from "./reminder-time";

export type ReminderPermission =
  | "not_asked"
  | "granted"
  | "denied"
  | "blocked";

export type ReminderNotificationContent = {
  title: string;
  body: string;
};

type PermissionStatus = {
  status: string;
  canAskAgain: boolean;
  ios?: { status: number };
};

export type ReminderSchedulerBackend = {
  getPermissionsAsync(): Promise<PermissionStatus>;
  requestPermissionsAsync(): Promise<PermissionStatus>;
  scheduleNotificationAsync(input: {
    content: {
      title: string;
      body: string;
      data: { url: string };
    };
    trigger: {
      type: string;
      hour: number;
      minute: number;
      channelId: string;
    };
  }): Promise<string>;
  cancelScheduledNotificationAsync(identifier: string): Promise<void>;
  getAllScheduledNotificationsAsync(): Promise<{ identifier: string }[]>;
  setNotificationChannelAsync(
    channelId: string,
    input: { name: string; importance: number },
  ): Promise<unknown>;
};

export function toReminderPermission(status: PermissionStatus): ReminderPermission {
  if (status.ios) {
    if ([2, 3, 4].includes(status.ios.status)) return "granted";
    if (status.ios.status === 0) return "not_asked";
    return status.canAskAgain ? "denied" : "blocked";
  }
  if (status.status === "granted") return "granted";
  if (status.status === "undetermined") return "not_asked";
  return status.canAskAgain ? "denied" : "blocked";
}

export function createReminderScheduler(backend: ReminderSchedulerBackend) {
  return {
    async getPermission() {
      return toReminderPermission(await backend.getPermissionsAsync());
    },
    async requestPermission() {
      return toReminderPermission(await backend.requestPermissionsAsync());
    },
    async scheduleDaily(
      value: ReminderTime,
      content: ReminderNotificationContent = {
        title: "Salawat Circle",
        body: "Zeit für deine heutige Salawat.",
      },
    ) {
      const time = parseReminderTime(value);
      await backend.setNotificationChannelAsync("salawat-daily", {
        name: "Salawat Circle",
        importance: 3,
      });
      return backend.scheduleNotificationAsync({
        content: {
          title: content.title,
          body: content.body,
          data: { url: "salawat-circle://today" },
        },
        trigger: {
          type: "daily",
          hour: time.hour,
          minute: time.minute,
          channelId: "salawat-daily",
        },
      });
    },
    cancel: (identifier: string) =>
      backend.cancelScheduledNotificationAsync(identifier),
    list: () => backend.getAllScheduledNotificationsAsync(),
  };
}
