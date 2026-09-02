import type { StoredReminder } from "./reminder-store";

type ReminderCleanupStore = {
  getActiveAccount(): Promise<string | null>;
  load(accountId: string): Promise<StoredReminder | null>;
  save(accountId: string, reminder: StoredReminder): Promise<void>;
};

type ReminderCleanupScheduler = {
  cancel(identifier: string): Promise<void>;
};

export async function clearActiveReminderForLogout(
  store: ReminderCleanupStore,
  scheduler: ReminderCleanupScheduler,
) {
  const accountId = await store.getActiveAccount();
  if (!accountId) return;
  const reminder = await store.load(accountId);
  if (!reminder) return;
  if (reminder.notificationId) await scheduler.cancel(reminder.notificationId);
  await store.save(accountId, {
    hour: reminder.hour,
    minute: reminder.minute,
    enabled: false,
    notificationId: null,
  });
}
