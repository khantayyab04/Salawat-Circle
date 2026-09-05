import * as ExpoNotifications from "expo-notifications";
import { createReminderScheduler } from "./scheduler";

type NotificationsModule = typeof ExpoNotifications;

/**
 * Indirection over `expo-notifications` so the module can be swapped in tests
 * and, more importantly, so a runtime that cannot provide notifications does
 * not take the rest of the app down with it: the auth provider imports this
 * module transitively, so an unguarded failure here would break every route.
 */
function notifications(): NotificationsModule {
  return ExpoNotifications;
}

export function createExpoReminderScheduler() {
  const Notifications = notifications();
  return createReminderScheduler({
    getPermissionsAsync: () => Notifications.getPermissionsAsync(),
    requestPermissionsAsync: () => Notifications.requestPermissionsAsync(),
    scheduleNotificationAsync: (input) =>
      Notifications.scheduleNotificationAsync({
        content: input.content,
        trigger:
          input.trigger.weekday === undefined
            ? {
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour: input.trigger.hour,
                minute: input.trigger.minute,
                channelId: input.trigger.channelId,
              }
            : {
                type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
                weekday: input.trigger.weekday,
                hour: input.trigger.hour,
                minute: input.trigger.minute,
                channelId: input.trigger.channelId,
              },
      }),
    cancelScheduledNotificationAsync: (identifier) =>
      Notifications.cancelScheduledNotificationAsync(identifier),
    getAllScheduledNotificationsAsync: () =>
      Notifications.getAllScheduledNotificationsAsync(),
    setNotificationChannelAsync: (channelId, input) =>
      Notifications.setNotificationChannelAsync(channelId, {
        ...input,
        importance: Notifications.AndroidImportance.DEFAULT,
      }),
  });
}

export function subscribeToReminderResponses(onOpenToday: () => void) {
  const Notifications = notifications();
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const url = response.notification.request.content.data?.url;
    if (url === "salawat-circle://today") onOpenToday();
  });
}

export async function wasOpenedFromReminder() {
  const Notifications = notifications();
  const response = await Notifications.getLastNotificationResponseAsync();
  if (!response) return false;
  await Notifications.clearLastNotificationResponseAsync();
  return response.notification.request.content.data?.url === "salawat-circle://today";
}
