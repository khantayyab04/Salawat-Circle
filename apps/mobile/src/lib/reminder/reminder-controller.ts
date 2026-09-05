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

type ReminderSnapshot = {
  accountId: string | null;
  permission: ReminderPermission;
  enabled: boolean;
  time: ReminderTime;
  jumuah: StoredJumuahReminder;
  busy: boolean;
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
          this.notificationContent,
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
          this.notificationContent,
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
    this.snapshot.busy = true;
    try {
      if (current?.notificationId) await this.scheduler.cancel(current.notificationId);
      const notificationId = await this.scheduler.scheduleDaily(
        time,
        this.notificationContent,
      );
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
      this.snapshot.time = time;
    } finally {
      this.snapshot.busy = false;
    }
  }

  async disable() {
    const accountId = this.requireAccountId();
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
        this.notificationContent,
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
        this.notificationContent,
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

  async setNotificationContent(content: ReminderNotificationContent) {
    if (
      this.notificationContent.title === content.title &&
      this.notificationContent.body === content.body
    ) {
      return;
    }
    this.notificationContent = content;
    if (
      !this.snapshot.accountId ||
      (!this.snapshot.enabled && !this.snapshot.jumuah.enabled)
    ) {
      return;
    }
    const current = await this.store.load(this.snapshot.accountId);
    let notificationId = current?.notificationId ?? null;
    let jumuah = current?.jumuah;
    if (this.snapshot.enabled) {
      if (current?.notificationId) await this.scheduler.cancel(current.notificationId);
      notificationId = await this.scheduler.scheduleDaily(
        this.snapshot.time,
        this.notificationContent,
      );
    }
    if (this.snapshot.jumuah.enabled) {
      if (current?.jumuah?.notificationId) {
        await this.scheduler.cancel(current.jumuah.notificationId);
      }
      const jumuahNotificationId = await this.scheduler.scheduleFriday(
        parseReminderTime(this.snapshot.jumuah),
        this.notificationContent,
      );
      jumuah = {
        ...this.snapshot.jumuah,
        enabled: true,
        notificationId: jumuahNotificationId,
      };
      this.snapshot.jumuah = jumuah;
    }
    await this.store.save(
      this.snapshot.accountId,
      this.withJumuah(
        {
          ...this.snapshot.time,
          enabled: this.snapshot.enabled,
          notificationId,
        },
        jumuah,
      ),
    );
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
}
