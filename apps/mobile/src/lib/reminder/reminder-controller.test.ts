import { describe, expect, it, vi } from "vitest";
import { ReminderController } from "./reminder-controller";
import type { StoredReminder } from "./reminder-store";
import type { ReminderPermission } from "./scheduler";

function setup({
  permission = "granted",
}: {
  permission?: ReminderPermission;
} = {}) {
  const store = {
    activate: vi.fn(async () => undefined),
    load: vi.fn<() => Promise<StoredReminder | null>>(async () => null),
    save: vi.fn(async () => undefined),
    getActiveAccount: vi.fn(async () => null),
  };
  const scheduler = {
    getPermission: vi.fn(async () => permission),
    requestPermission: vi.fn(async () => permission),
    scheduleDaily: vi.fn(async () => "notification-1"),
    scheduleFriday: vi.fn(async () => "friday-notification"),
    cancel: vi.fn(async () => undefined),
    list: vi.fn<() => Promise<{ identifier: string }[]>>(async () => []),
  };
  return { store, scheduler, controller: new ReminderController(store, scheduler) };
}

describe("ReminderController", () => {
  it("does not request notification permission while loading the reminder", async () => {
    const { controller, scheduler } = setup({ permission: "not_asked" });

    await controller.initialize("account-1");

    expect(controller.snapshot.permission).toBe("not_asked");
    expect(scheduler.requestPermission).not.toHaveBeenCalled();
  });

  it("schedules exactly one daily reminder only after the user actively enables it", async () => {
    const { controller, scheduler, store } = setup({ permission: "not_asked" });
    scheduler.requestPermission.mockResolvedValue("granted");
    await controller.initialize("account-1");

    await controller.enable();

    expect(scheduler.scheduleDaily).toHaveBeenCalledWith(
      { hour: 20, minute: 0 },
      {
        title: "Salawat Circle",
        body: "Zeit für deine heutige Salawat.",
      },
    );
    expect(store.save).toHaveBeenLastCalledWith("account-1", {
      hour: 20,
      minute: 0,
      enabled: true,
      notificationId: "notification-1",
    });
    expect(controller.snapshot.enabled).toBe(true);
  });

  it("schedules the Friday reminder only after the user actively enables it", async () => {
    const { controller, scheduler, store } = setup({ permission: "not_asked" });
    scheduler.requestPermission.mockResolvedValue("granted");
    await controller.initialize("account-1");

    await controller.enableJumuah();

    expect(scheduler.scheduleFriday).toHaveBeenCalledWith(
      { hour: 12, minute: 0 },
      {
        title: "Salawat Circle",
        body: "Zeit für deine heutige Salawat.",
      },
    );
    expect(store.save).toHaveBeenLastCalledWith("account-1", {
      hour: 20,
      minute: 0,
      enabled: false,
      notificationId: null,
      jumuah: {
        hour: 12,
        minute: 0,
        enabled: true,
        notificationId: "friday-notification",
      },
    });
    expect(controller.snapshot.jumuah.enabled).toBe(true);
  });

  it("reschedules an enabled Friday reminder when its selected time changes", async () => {
    const { controller, scheduler, store } = setup();
    store.load
      .mockResolvedValueOnce({
        hour: 7,
        minute: 5,
        enabled: false,
        notificationId: null,
        jumuah: {
          hour: 12,
          minute: 0,
          enabled: true,
          notificationId: "friday-notification-1",
        },
      })
      .mockResolvedValueOnce({
        hour: 7,
        minute: 5,
        enabled: false,
        notificationId: null,
        jumuah: {
          hour: 12,
          minute: 0,
          enabled: true,
          notificationId: "friday-notification-1",
        },
      });
    scheduler.list.mockResolvedValue([{ identifier: "friday-notification-1" }]);
    scheduler.scheduleFriday.mockResolvedValue("friday-notification-2");
    await controller.initialize("account-1");

    await controller.setJumuahTime({ hour: 13, minute: 15 });

    expect(scheduler.cancel).toHaveBeenCalledWith("friday-notification-1");
    expect(scheduler.scheduleFriday).toHaveBeenCalledWith(
      { hour: 13, minute: 15 },
      {
        title: "Salawat Circle",
        body: "Zeit für deine heutige Salawat.",
      },
    );
    expect(store.save).toHaveBeenLastCalledWith("account-1", {
      hour: 7,
      minute: 5,
      enabled: false,
      notificationId: null,
      jumuah: {
        hour: 13,
        minute: 15,
        enabled: true,
        notificationId: "friday-notification-2",
      },
    });
  });

  it("disables the Friday reminder without discarding its selected time", async () => {
    const { controller, scheduler, store } = setup();
    store.load
      .mockResolvedValueOnce({
        hour: 7,
        minute: 5,
        enabled: false,
        notificationId: null,
        jumuah: {
          hour: 12,
          minute: 0,
          enabled: true,
          notificationId: "friday-notification-1",
        },
      })
      .mockResolvedValueOnce({
        hour: 7,
        minute: 5,
        enabled: false,
        notificationId: null,
        jumuah: {
          hour: 12,
          minute: 0,
          enabled: true,
          notificationId: "friday-notification-1",
        },
      });
    scheduler.list.mockResolvedValue([{ identifier: "friday-notification-1" }]);
    await controller.initialize("account-1");

    await controller.disableJumuah();

    expect(scheduler.cancel).toHaveBeenCalledWith("friday-notification-1");
    expect(store.save).toHaveBeenLastCalledWith("account-1", {
      hour: 7,
      minute: 5,
      enabled: false,
      notificationId: null,
      jumuah: {
        hour: 12,
        minute: 0,
        enabled: false,
        notificationId: null,
      },
    });
  });

  it("restores missing daily and Friday schedules without overwriting either identifier", async () => {
    const { controller, scheduler, store } = setup();
    store.load.mockResolvedValue({
      hour: 7,
      minute: 5,
      enabled: true,
      notificationId: "missing-daily-notification",
      jumuah: {
        hour: 12,
        minute: 0,
        enabled: true,
        notificationId: "missing-friday-notification",
      },
    });
    scheduler.scheduleDaily.mockResolvedValue("daily-notification-2");
    scheduler.scheduleFriday.mockResolvedValue("friday-notification-2");

    await controller.initialize("account-1");

    expect(store.save).toHaveBeenLastCalledWith("account-1", {
      hour: 7,
      minute: 5,
      enabled: true,
      notificationId: "daily-notification-2",
      jumuah: {
        hour: 12,
        minute: 0,
        enabled: true,
        notificationId: "friday-notification-2",
      },
    });
  });

  it("uses the latest localized copy when scheduling a reminder", async () => {
    const { controller, scheduler } = setup({ permission: "granted" });
    await controller.initialize("account-1");
    controller.setNotificationContent({
      title: "Salawat Circle",
      body: "Time for your Salawat today.",
    });

    await controller.enable();

    expect(scheduler.scheduleDaily).toHaveBeenCalledWith(
      { hour: 20, minute: 0 },
      { title: "Salawat Circle", body: "Time for your Salawat today." },
    );
  });

  it("replaces an active trigger when notification copy changes", async () => {
    const { controller, scheduler, store } = setup();
    store.load.mockResolvedValue({
      hour: 7,
      minute: 5,
      enabled: true,
      notificationId: "notification-1",
    });
    scheduler.list.mockResolvedValue([{ identifier: "notification-1" }]);
    scheduler.scheduleDaily.mockResolvedValue("notification-2");
    await controller.initialize("account-1");

    await controller.setNotificationContent({
      title: "Salawat Circle",
      body: "Time for your Salawat today.",
    });

    expect(scheduler.cancel).toHaveBeenCalledWith("notification-1");
    expect(scheduler.scheduleDaily).toHaveBeenCalledWith(
      { hour: 7, minute: 5 },
      { title: "Salawat Circle", body: "Time for your Salawat today." },
    );
    expect(store.save).toHaveBeenLastCalledWith("account-1", {
      hour: 7,
      minute: 5,
      enabled: true,
      notificationId: "notification-2",
    });
  });

  it("does not re-request a system-blocked notification permission", async () => {
    const { controller, scheduler } = setup({ permission: "blocked" });
    await controller.initialize("account-1");

    await controller.enable();

    expect(scheduler.requestPermission).not.toHaveBeenCalled();
    expect(scheduler.scheduleDaily).not.toHaveBeenCalled();
  });

  it("ignores a second enable while the first permission request is pending", async () => {
    let resolvePermission!: (value: "granted") => void;
    const permission = new Promise<"granted">((resolve) => {
      resolvePermission = resolve;
    });
    const { controller, scheduler } = setup({ permission: "not_asked" });
    scheduler.requestPermission.mockImplementation(() => permission);
    await controller.initialize("account-1");

    const first = controller.enable();
    const second = controller.enable();
    expect(scheduler.requestPermission).toHaveBeenCalledTimes(1);

    resolvePermission("granted");
    await Promise.all([first, second]);
    expect(scheduler.scheduleDaily).toHaveBeenCalledTimes(1);
  });

  it("cancels the scheduled reminder on logout but keeps its selected time disabled", async () => {
    const { controller, scheduler, store } = setup();
    store.load.mockResolvedValue({
      hour: 7,
      minute: 5,
      enabled: true,
      notificationId: "notification-1",
    });
    scheduler.list.mockResolvedValue([{ identifier: "notification-1" }]);
    await controller.initialize("account-1");

    await controller.clearForLogout();

    expect(scheduler.cancel).toHaveBeenCalledWith("notification-1");
    expect(store.save).toHaveBeenLastCalledWith("account-1", {
      hour: 7,
      minute: 5,
      enabled: false,
      notificationId: null,
    });
  });

  it("replaces the previous scheduled trigger when an enabled reminder time changes", async () => {
    const { controller, scheduler, store } = setup();
    store.load
      .mockResolvedValueOnce({
        hour: 7,
        minute: 5,
        enabled: true,
        notificationId: "notification-1",
      })
      .mockResolvedValueOnce({
        hour: 7,
        minute: 5,
        enabled: true,
        notificationId: "notification-1",
      });
    scheduler.list.mockResolvedValue([{ identifier: "notification-1" }]);
    scheduler.scheduleDaily.mockResolvedValue("notification-2");
    await controller.initialize("account-1");

    await controller.setTime({ hour: 8, minute: 30 });

    expect(scheduler.cancel).toHaveBeenCalledWith("notification-1");
    expect(scheduler.scheduleDaily).toHaveBeenCalledWith(
      { hour: 8, minute: 30 },
      {
        title: "Salawat Circle",
        body: "Zeit für deine heutige Salawat.",
      },
    );
    expect(store.save).toHaveBeenLastCalledWith("account-1", {
      hour: 8,
      minute: 30,
      enabled: true,
      notificationId: "notification-2",
    });
  });

  it("disables a reminder without discarding its selected time", async () => {
    const { controller, scheduler, store } = setup();
    store.load.mockResolvedValue({
      hour: 7,
      minute: 5,
      enabled: true,
      notificationId: "notification-1",
    });
    scheduler.list.mockResolvedValue([{ identifier: "notification-1" }]);
    await controller.initialize("account-1");

    await controller.disable();

    expect(scheduler.cancel).toHaveBeenCalledWith("notification-1");
    expect(store.save).toHaveBeenLastCalledWith("account-1", {
      hour: 7,
      minute: 5,
      enabled: false,
      notificationId: null,
    });
  });

  it("cancels the previous account reminder before clearing it on an account switch", async () => {
    const { controller, scheduler, store } = setup();
    Object.assign(store, {
      getActiveAccount: vi.fn(async () => "account-a"),
    });
    store.load.mockResolvedValue({
      hour: 7,
      minute: 5,
      enabled: true,
      notificationId: "notification-a",
    });

    await controller.initialize("account-b");

    expect(scheduler.cancel).toHaveBeenCalledWith("notification-a");
    expect(store.activate).toHaveBeenCalledWith("account-b");
  });
});
