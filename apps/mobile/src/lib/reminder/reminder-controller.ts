import { parseReminderTime, type ReminderTime } from "./reminder-time";
import type { StoredJumuahReminder, StoredReminder } from "./reminder-store";
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
  scheduleFriday(
    time: ReminderTime,
    content: ReminderNotificationContent,
  ): Promise<string>;
  cancel(identifier: string): Promise<void>;
  list(): Promise<{ identifier: string }[]>;
};

const DEFAULT_TIME: ReminderTime = { hour: 20, minute: 0 };
const DEFAULT_JUMUAH_TIME: ReminderTime = { hour: 12, minute: 0 };
const DEFAULT_NOTIFICATION_CONTENT: ReminderNotificationContent = {
  title: "Salawat Circle",
  body: "Zeit für deine heutige Salawat.",
};
const DEFAULT_JUMUAH_NOTIFICATION_CONTENT: ReminderNotificationContent = {
  title: "Salawat Circle",
  body: "Freitag ist da – nimm dir Zeit für Salawat.",
};
type ReminderNotificationCopy = {
  daily: ReminderNotificationContent;
  jumuah: ReminderNotificationContent;
};

function sameCopy(
  first: ReminderNotificationCopy,
  second: ReminderNotificationCopy,
) {
  return first.daily.title === second.daily.title &&
    first.daily.body === second.daily.body &&
    first.jumuah.title === second.jumuah.title &&
    first.jumuah.body === second.jumuah.body;
}

type ReminderSnapshot = {
  accountId: string | null;
  permission: ReminderPermission;
  enabled: boolean;
  time: ReminderTime;
  jumuah: StoredJumuahReminder;
  busy: boolean;
  error: boolean;
};

export class ReminderController {
  readonly snapshot: ReminderSnapshot = {
    accountId: null,
    permission: "not_asked",
    enabled: false,
    time: DEFAULT_TIME,
    jumuah: {
      ...DEFAULT_JUMUAH_TIME,
      enabled: false,
      notificationId: null,
    },
    busy: false,
    error: false,
  };
  private notificationContent: ReminderNotificationCopy = {
    daily: DEFAULT_NOTIFICATION_CONTENT,
    jumuah: DEFAULT_JUMUAH_NOTIFICATION_CONTENT,
  };
  private requestedNotificationContent = this.notificationContent;
  private mutationTail: Promise<void> = Promise.resolve();
  private pendingMutations = 0;

  constructor(
    private readonly store: ReminderStore,
    private readonly scheduler: ReminderScheduler,
  ) {}

  async initialize(accountId: string) {
    return this.enqueueMutation(() => this.initializeNow(accountId));
  }

  private async initializeNow(accountId: string) {
    const previousAccountId = await this.store.getActiveAccount();
    if (previousAccountId && previousAccountId !== accountId) {
      const previousReminder = await this.store.load(previousAccountId);
      if (previousReminder?.notificationId) {
        await this.scheduler.cancel(previousReminder.notificationId);
      }
      if (previousReminder?.jumuah?.notificationId) {
        await this.scheduler.cancel(previousReminder.jumuah.notificationId);
      }
    }
    await this.store.activate(accountId);
    this.snapshot.accountId = accountId;
    this.snapshot.permission = await this.scheduler.getPermission();
    const stored = await this.store.load(accountId);
    this.snapshot.time = stored
      ? parseReminderTime(stored)
      : { ...DEFAULT_TIME };
    this.snapshot.jumuah = stored?.jumuah
      ? {
          ...stored.jumuah,
          enabled:
            stored.jumuah.enabled && this.snapshot.permission === "granted",
        }
      : {
          ...DEFAULT_JUMUAH_TIME,
          enabled: false,
          notificationId: null,
        };
    this.snapshot.enabled = stored?.enabled === true &&
      this.snapshot.permission === "granted";

    let dailyNotificationId = stored?.notificationId ?? null;
    let jumuah = stored?.jumuah;
    if (this.snapshot.enabled && stored?.notificationId) {
      const scheduled = await this.scheduler.list();
      if (!scheduled.some(({ identifier }) => identifier === stored.notificationId)) {
        dailyNotificationId = await this.scheduler.scheduleDaily(
          this.snapshot.time,
          this.notificationContent.daily,
        );
        await this.store.save(
          accountId,
          this.withJumuah(
            {
              ...this.snapshot.time,
              enabled: true,
              notificationId: dailyNotificationId,
            },
            jumuah,
          ),
        );
      }
    }
    if (this.snapshot.jumuah.enabled && stored?.jumuah?.notificationId) {
      const scheduled = await this.scheduler.list();
      if (
        !scheduled.some(
          ({ identifier }) => identifier === stored.jumuah?.notificationId,
        )
      ) {
        const jumuahNotificationId = await this.scheduler.scheduleFriday(
          parseReminderTime(this.snapshot.jumuah),
          this.notificationContent.jumuah,
        );
        jumuah = {
          ...this.snapshot.jumuah,
          enabled: true,
          notificationId: jumuahNotificationId,
        };
        await this.store.save(
          accountId,
          this.withJumuah(
            {
              ...this.snapshot.time,
              enabled: this.snapshot.enabled,
              notificationId: dailyNotificationId,
            },
            jumuah,
          ),
        );
      }
    }
  }

  async enable() {
    return this.enqueueMutation(() => this.enableNow());
  }

  private async enableNow() {
    const accountId = this.requireAccountId();
    if (this.snapshot.permission === "blocked" || this.snapshot.enabled) return;
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
    const notificationId = await this.scheduler.scheduleDaily(
      this.snapshot.time,
      this.notificationContent.daily,
    );
    let saved = false;
    try {
      await this.store.save(
        accountId,
        this.withJumuah(
          {
            ...this.snapshot.time,
            enabled: true,
            notificationId,
          },
          current?.jumuah,
        ),
      );
      saved = true;
      if (current?.notificationId) {
        await this.scheduler.cancel(current.notificationId);
      }
      this.snapshot.enabled = true;
    } catch (error) {
      await this.scheduler.cancel(notificationId).catch(() => undefined);
      if (saved && current) {
        await this.store.save(accountId, current).catch(() => undefined);
      }
      throw error;
    }
  }

  async setTime(value: ReminderTime) {
    const time = parseReminderTime(value);
    return this.enqueueMutation(() => this.setTimeNow(time));
  }

  private async setTimeNow(time: ReminderTime) {
    const accountId = this.requireAccountId();
    const current = await this.store.load(accountId);
    if (!this.snapshot.enabled) {
      await this.store.save(
        accountId,
        this.withJumuah(
          {
            ...time,
            enabled: false,
            notificationId: null,
          },
          current?.jumuah,
        ),
      );
      this.snapshot.time = time;
      return;
    }
    const notificationId = await this.scheduler.scheduleDaily(
      time,
      this.notificationContent.daily,
    );
    let saved = false;
    try {
      await this.store.save(
        accountId,
        this.withJumuah(
          {
            ...time,
            enabled: true,
            notificationId,
          },
          current?.jumuah,
        ),
      );
      saved = true;
      if (current?.notificationId) {
        await this.scheduler.cancel(current.notificationId);
      }
      this.snapshot.time = time;
    } catch (error) {
      await this.scheduler.cancel(notificationId).catch(() => undefined);
      if (saved && current) {
        await this.store.save(accountId, current).catch(() => undefined);
      }
      throw error;
    }
  }

  async disable() {
    return this.enqueueMutation(() => this.disableNow());
  }

  private async disableNow() {
    const accountId = this.requireAccountId();
    if (!this.snapshot.enabled) return;
    const current = await this.store.load(accountId);
    if (current?.notificationId) await this.scheduler.cancel(current.notificationId);
    await this.store.save(
      accountId,
      this.withJumuah(
        {
          ...this.snapshot.time,
          enabled: false,
          notificationId: null,
        },
        current?.jumuah,
      ),
    );
    this.snapshot.enabled = false;
  }

  async enableJumuah() {
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
        this.snapshot.jumuah.enabled = false;
        return;
      }
      const current = await this.store.load(accountId);
      if (current?.jumuah?.notificationId) {
        await this.scheduler.cancel(current.jumuah.notificationId);
      }
      const notificationId = await this.scheduler.scheduleFriday(
        parseReminderTime(this.snapshot.jumuah),
        this.notificationContent.jumuah,
      );
      this.snapshot.jumuah = {
        ...this.snapshot.jumuah,
        enabled: true,
        notificationId,
      };
      await this.store.save(
        accountId,
        this.withJumuah(
          {
            ...this.snapshot.time,
            enabled: this.snapshot.enabled,
            notificationId: current?.notificationId ?? null,
          },
          this.snapshot.jumuah,
        ),
      );
    } finally {
      this.snapshot.busy = false;
    }
  }

  async setJumuahTime(value: ReminderTime) {
    const accountId = this.requireAccountId();
    const time = parseReminderTime(value);
    const current = await this.store.load(accountId);
    if (!this.snapshot.jumuah.enabled) {
      this.snapshot.jumuah = {
        ...time,
        enabled: false,
        notificationId: null,
      };
      await this.store.save(
        accountId,
        this.withJumuah(
          {
            ...this.snapshot.time,
            enabled: this.snapshot.enabled,
            notificationId: current?.notificationId ?? null,
          },
          this.snapshot.jumuah,
        ),
      );
      return;
    }
    this.snapshot.busy = true;
    try {
      if (current?.jumuah?.notificationId) {
        await this.scheduler.cancel(current.jumuah.notificationId);
      }
      const notificationId = await this.scheduler.scheduleFriday(
        time,
        this.notificationContent.jumuah,
      );
      this.snapshot.jumuah = {
        ...time,
        enabled: true,
        notificationId,
      };
      await this.store.save(
        accountId,
        this.withJumuah(
          {
            ...this.snapshot.time,
            enabled: this.snapshot.enabled,
            notificationId: current?.notificationId ?? null,
          },
          this.snapshot.jumuah,
        ),
      );
    } finally {
      this.snapshot.busy = false;
    }
  }

  async disableJumuah() {
    const accountId = this.requireAccountId();
    const current = await this.store.load(accountId);
    if (current?.jumuah?.notificationId) {
      await this.scheduler.cancel(current.jumuah.notificationId);
    }
    this.snapshot.jumuah = {
      ...this.snapshot.jumuah,
      enabled: false,
      notificationId: null,
    };
    await this.store.save(
      accountId,
      this.withJumuah(
        {
          ...this.snapshot.time,
          enabled: this.snapshot.enabled,
          notificationId: current?.notificationId ?? null,
        },
        this.snapshot.jumuah,
      ),
    );
  }

  async clearForLogout() {
    if (!this.snapshot.accountId) return;
    const accountId = this.snapshot.accountId;
    const current = await this.store.load(accountId);
    if (current?.notificationId) await this.scheduler.cancel(current.notificationId);
    if (current?.jumuah?.notificationId) {
      await this.scheduler.cancel(current.jumuah.notificationId);
    }
    this.snapshot.enabled = false;
    this.snapshot.jumuah = {
      ...this.snapshot.jumuah,
      enabled: false,
      notificationId: null,
    };
    await this.store.save(
      accountId,
      this.withJumuah(
        {
          ...this.snapshot.time,
          enabled: false,
          notificationId: null,
        },
        current?.jumuah
          ? this.snapshot.jumuah
          : undefined,
      ),
    );
    this.snapshot.accountId = null;
  }

  async setNotificationContent(
    daily: ReminderNotificationContent,
    jumuah: ReminderNotificationContent = daily,
  ) {
    const content: ReminderNotificationCopy = { daily, jumuah };
    if (sameCopy(this.requestedNotificationContent, content)) return;
    this.requestedNotificationContent = content;
    return this.enqueueMutation(async () => {
      if (sameCopy(this.notificationContent, content)) return;
      const accountId = this.snapshot.accountId;
      if (!accountId || (!this.snapshot.enabled && !this.snapshot.jumuah.enabled)) {
        this.notificationContent = content;
        return;
      }
      const current = await this.store.load(accountId);
      const replacements: string[] = [];
      let saved = false;
      try {
        let notificationId = current?.notificationId ?? null;
        let jumuah = current?.jumuah;
        if (this.snapshot.enabled) {
          notificationId = await this.scheduler.scheduleDaily(this.snapshot.time, content.daily);
          replacements.push(notificationId);
        }
        if (this.snapshot.jumuah.enabled) {
          const fridayId = await this.scheduler.scheduleFriday(parseReminderTime(this.snapshot.jumuah), content.jumuah);
          replacements.push(fridayId);
          jumuah = { ...this.snapshot.jumuah, notificationId: fridayId };
        }
        await this.store.save(accountId, this.withJumuah({
          ...this.snapshot.time, enabled: this.snapshot.enabled, notificationId,
        }, jumuah));
        saved = true;
        if (this.snapshot.enabled && current?.notificationId) {
          await this.scheduler.cancel(current.notificationId);
        }
        if (this.snapshot.jumuah.enabled && current?.jumuah?.notificationId) {
          await this.scheduler.cancel(current.jumuah.notificationId);
        }
        if (jumuah) this.snapshot.jumuah = jumuah;
        this.notificationContent = content;
      } catch (error) {
        for (const identifier of replacements) {
          await this.scheduler.cancel(identifier).catch(() => undefined);
        }
        if (saved && current) await this.store.save(accountId, current).catch(() => undefined);
        throw error;
      }
    }).catch((error: unknown) => {
      if (this.requestedNotificationContent === content) {
        this.requestedNotificationContent = this.notificationContent;
      }
      throw error;
    });
  }

  private withJumuah(
    reminder: Omit<StoredReminder, "jumuah">,
    jumuah: StoredJumuahReminder | undefined,
  ): StoredReminder {
    return jumuah ? { ...reminder, jumuah } : reminder;
  }

  private requireAccountId() {
    if (!this.snapshot.accountId) throw new Error("ACCOUNT_REQUIRED");
    return this.snapshot.accountId;
  }

  private enqueueMutation(action: () => Promise<void>) {
    this.pendingMutations += 1;
    this.snapshot.busy = true;
    const execute = async () => {
      this.snapshot.error = false;
      await action();
    };
    const operation =
      this.pendingMutations === 1 ? execute() : this.mutationTail.then(execute);
    this.mutationTail = operation.catch(() => undefined);
    return operation
      .catch((error: unknown) => {
        this.snapshot.error = true;
        throw error;
      })
      .finally(() => {
        this.pendingMutations -= 1;
        this.snapshot.busy = this.pendingMutations > 0;
      });
  }
}
