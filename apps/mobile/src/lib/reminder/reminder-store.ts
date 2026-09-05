import { parseReminderTime, type ReminderTime } from "./reminder-time";

export type ReminderStorageBackend = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
};

export type StoredReminder = ReminderTime & {
  enabled: boolean;
  notificationId: string | null;
  jumuah?: StoredJumuahReminder;
};

export type StoredJumuahReminder = ReminderTime & {
  enabled: boolean;
  notificationId: string | null;
};

const ACTIVE_ACCOUNT_KEY = "salawat.reminder.active-account";

function storageKey(accountId: string) {
  if (!accountId) throw new Error("ACCOUNT_REQUIRED");
  return `salawat.reminder.${accountId}`;
}

function parseStoredReminder(value: string): StoredReminder | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("enabled" in parsed) ||
      !("notificationId" in parsed) ||
      typeof parsed.enabled !== "boolean" ||
      (parsed.notificationId !== null && typeof parsed.notificationId !== "string")
    ) {
      return null;
    }
    const reminder = {
      ...parseReminderTime(parsed),
      enabled: parsed.enabled,
      notificationId: parsed.notificationId,
    };
    if (!("jumuah" in parsed)) return reminder;
    const jumuah = parseStoredJumuahReminder(parsed.jumuah);
    return { ...reminder, jumuah };
  } catch {
    return null;
  }
}

function parseStoredJumuahReminder(value: unknown): StoredJumuahReminder {
  if (
    typeof value !== "object" ||
    value === null ||
    !("enabled" in value) ||
    !("notificationId" in value) ||
    typeof value.enabled !== "boolean" ||
    (value.notificationId !== null && typeof value.notificationId !== "string")
  ) {
    throw new Error("INVALID_REMINDER_STATE");
  }
  return {
    ...parseReminderTime(value),
    enabled: value.enabled,
    notificationId: value.notificationId,
  };
}

export function createReminderStore(backend: ReminderStorageBackend) {
  return {
    async activate(accountId: string) {
      const previousAccountId = await backend.getItemAsync(ACTIVE_ACCOUNT_KEY);
      if (previousAccountId && previousAccountId !== accountId) {
        await backend.deleteItemAsync(storageKey(previousAccountId));
      }
      await backend.setItemAsync(ACTIVE_ACCOUNT_KEY, accountId);
    },
    async save(accountId: string, value: StoredReminder) {
      const time = parseReminderTime(value);
      if (
        typeof value.enabled !== "boolean" ||
        (value.notificationId !== null && typeof value.notificationId !== "string")
      ) {
        throw new Error("INVALID_REMINDER_STATE");
      }
      const jumuah = value.jumuah
        ? parseStoredJumuahReminder(value.jumuah)
        : undefined;
      await backend.setItemAsync(
        storageKey(accountId),
        JSON.stringify({
          ...time,
          enabled: value.enabled,
          notificationId: value.notificationId,
          ...(jumuah ? { jumuah } : {}),
        }),
      );
    },
    async load(accountId: string) {
      const value = await backend.getItemAsync(storageKey(accountId));
      return value ? parseStoredReminder(value) : null;
    },
    getActiveAccount: () => backend.getItemAsync(ACTIVE_ACCOUNT_KEY),
    remove: (accountId: string) => backend.deleteItemAsync(storageKey(accountId)),
  };
}
