import { parseReminderTime, type ReminderTime } from "./reminder-time";
import type { StoredReminder } from "./reminder-store";
import type {
  ReminderNotificationContent,
  ReminderPermission,
} from "./scheduler";

type ReminderStore = {
  activate(accountId: string): Promise<void>;
  load(accountId: string): Promise<StoredReminder | null>;
  save(accountId: string, value: StoredReminder): Promise<void>;
  getActiveAccount(): Promise<string | null>;
};

type ReminderScheduler = {
  getPermission(): Promise<ReminderPermission>;
  requestPermission(): Promise<ReminderPermission>;
  scheduleDaily(
    time: ReminderTime,
    content: ReminderNotificationContent,
  ): Promise<string>;
  cancel(identifier: string): Promise<void>;
  list(): Promise<{ identifier: string }[]>;
};

const DEFAULT_TIME: ReminderTime = { hour: 20, minute: 0 };
const DEFAULT_NOTIFICATION_CONTENT: ReminderNotificationContent = {
  title: "Salawat Circle",
  body: "Zeit für deine heutige Salawat.",
};

export class ReminderController {
  readonly snapshot = {
    accountId: null as string | null,
    permission: "not_asked" as ReminderPermission,
    enabled: false,
    time: DEFAULT_TIME,
    busy: false,
  };
  private notificationContent = DEFAULT_NOTIFICATION_CONTENT;

  constructor(
    private readonly store: ReminderStore,
    private readonly scheduler: ReminderScheduler,
  ) {}

  async initialize(accountId: string) {
    const previousAccountId = await this.store.getActiveAccount();
    if (previousAccountId && previousAccountId !== accountId) {
      const previousReminder = await this.store.load(previousAccountId);
      if (previousReminder?.notificationId) {
        await this.scheduler.cancel(previousReminder.notificationId);
      }
    }
    await this.store.activate(accountId);
    this.snapshot.accountId = accountId;
    this.snapshot.permission = await this.scheduler.getPermission();
    const stored = await this.store.load(accountId);
    this.snapshot.time = stored
      ? parseReminderTime(stored)
      : { ...DEFAULT_TIME };
    this.snapshot.enabled = stored?.enabled === true &&
      this.snapshot.permission === "granted";

    if (this.snapshot.enabled && stored?.notificationId) {
      const scheduled = await this.scheduler.list();
      if (!scheduled.some(({ identifier }) => identifier === stored.notificationId)) {
        const notificationId = await this.scheduler.scheduleDaily(
          this.snapshot.time,
          this.notificationContent,
        );
        await this.store.save(accountId, {
          ...this.snapshot.time,
          enabled: true,
          notificationId,
        });
      }
    }
  }

  async enable() {
    const accountId = this.requireAccountId();
    if (this.snapshot.permission === "blocked" || this.snapshot.busy) return;
    this.snapshot.busy = true;
    try {
      const permission =
        this.snapshot.permission === "granted"
          ? "granted"
          : await this.scheduler.requestPermission();
      this.snapshot.permission = permission;
      if (permission !== "granted") {
        this.snapshot.enabled = false;
        return;
      }
      const current = await this.store.load(accountId);
      if (current?.notificationId) await this.scheduler.cancel(current.notificationId);
      const notificationId = await this.scheduler.scheduleDaily(
        this.snapshot.time,
        this.notificationContent,
      );
      await this.store.save(accountId, {
        ...this.snapshot.time,
        enabled: true,
        notificationId,
      });
      this.snapshot.enabled = true;
    } finally {
      this.snapshot.busy = false;
    }
  }

  async setTime(value: ReminderTime) {
    const accountId = this.requireAccountId();
    const time = parseReminderTime(value);
    const current = await this.store.load(accountId);
    if (!this.snapshot.enabled) {
      await this.store.save(accountId, {
        ...time,
        enabled: false,
        notificationId: null,
      });
      this.snapshot.time = time;
      return;
    }
    this.snapshot.busy = true;
    try {
      if (current?.notificationId) await this.scheduler.cancel(current.notificationId);
      const notificationId = await this.scheduler.scheduleDaily(
        time,
        this.notificationContent,
      );
      await this.store.save(accountId, {
        ...time,
        enabled: true,
        notificationId,
      });
      this.snapshot.time = time;
    } finally {
      this.snapshot.busy = false;
    }
  }

  async disable() {
    const accountId = this.requireAccountId();
    const current = await this.store.load(accountId);
    if (current?.notificationId) await this.scheduler.cancel(current.notificationId);
    await this.store.save(accountId, {
      ...this.snapshot.time,
      enabled: false,
      notificationId: null,
    });
    this.snapshot.enabled = false;
  }

  async clearForLogout() {
    if (!this.snapshot.accountId) return;
    await this.disable();
    this.snapshot.accountId = null;
  }

  async setNotificationContent(content: ReminderNotificationContent) {
    if (
      this.notificationContent.title === content.title &&
      this.notificationContent.body === content.body
    ) {
      return;
    }
    this.notificationContent = content;
    if (!this.snapshot.accountId || !this.snapshot.enabled) return;
    const current = await this.store.load(this.snapshot.accountId);
    if (current?.notificationId) await this.scheduler.cancel(current.notificationId);
    const notificationId = await this.scheduler.scheduleDaily(
      this.snapshot.time,
      this.notificationContent,
    );
    await this.store.save(this.snapshot.accountId, {
      ...this.snapshot.time,
      enabled: true,
      notificationId,
    });
  }

  private requireAccountId() {
    if (!this.snapshot.accountId) throw new Error("ACCOUNT_REQUIRED");
    return this.snapshot.accountId;
  }
}
