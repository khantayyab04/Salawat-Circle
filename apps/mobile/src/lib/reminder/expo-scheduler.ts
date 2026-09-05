import * as Notifications from "expo-notifications";
import { createReminderScheduler } from "./scheduler";

export function createExpoReminderScheduler() {
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
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const url = response.notification.request.content.data?.url;
    if (url === "salawat-circle://today") onOpenToday();
  });
}

export async function wasOpenedFromReminder() {
  const response = await Notifications.getLastNotificationResponseAsync();
  if (!response) return false;
  await Notifications.clearLastNotificationResponseAsync();
  return response.notification.request.content.data?.url === "salawat-circle://today";
}
