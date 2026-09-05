import { describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Pressable, Text } from "react-native";
import { ReminderController } from "./reminder-controller";
import { ReminderProvider, useReminder } from "./provider";

jest.mock("./expo-scheduler", () => ({
  createExpoReminderScheduler: jest.fn(),
  subscribeToReminderResponses: jest.fn(() => ({ remove: jest.fn() })),
  wasOpenedFromReminder: jest.fn(async () => false),
}));
jest.mock("@/localization", () => ({
  useTranslation: () => ({
    locale: "de",
    t: (key: string) =>
      key === "reminderNotificationBody"
        ? "Zeit für deine heutige Salawat."
        : "Salawat Circle",
  }),
}));

function Consumer() {
  const reminder = useReminder();
  return <Text>{`${reminder.permission}:${reminder.enabled}:${reminder.time.hour}`}</Text>;
}

function JumuahConsumer() {
  const reminder = useReminder();
  return (
    <Text>
      {`${reminder.jumuah.enabled}:${reminder.jumuah.time.hour}:${reminder.jumuah.time.minute}`}
    </Text>
  );
}

function EnableConsumer() {
  const reminder = useReminder();
  return (
    <>
      <Text>{reminder.busy ? "busy" : "idle"}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="enable"
        onPress={() => void reminder.enable()}
      />
    </>
  );
}

describe("ReminderProvider", () => {
  it("loads the account reminder state without requesting permission", async () => {
    const scheduler = {
      getPermission: jest.fn(async () => "not_asked" as const),
      requestPermission: jest.fn(async () => "granted" as const),
      scheduleDaily: jest.fn(async () => "notification-1"),
      scheduleFriday: jest.fn(async () => "friday-notification-1"),
      cancel: jest.fn(async () => undefined),
      list: jest.fn(async () => []),
    };
    const controller = new ReminderController(
      {
        activate: async () => undefined,
        load: async () => null,
        save: async () => undefined,
        getActiveAccount: async () => null,
      },
      scheduler,
    );
    const view = await render(
      <ReminderProvider accountId="account-1" controller={controller}>
        <Consumer />
      </ReminderProvider>,
    );

    await waitFor(() => expect(view.getByText("not_asked:false:20")).toBeTruthy());
    expect(scheduler.getPermission).toHaveBeenCalledTimes(1);
    expect(scheduler.requestPermission).not.toHaveBeenCalled();
  });

  it("publishes initialized reminder state to context consumers", async () => {
    const controller = new ReminderController(
      {
        activate: async () => undefined,
        getActiveAccount: async () => null,
        load: async () => ({
          hour: 7,
          minute: 30,
          enabled: true,
          notificationId: "notification-1",
        }),
        save: async () => undefined,
      },
      {
        getPermission: async () => "granted",
        requestPermission: async () => "granted",
        scheduleDaily: async () => "notification-1",
        scheduleFriday: async () => "friday-notification-1",
        cancel: async () => undefined,
        list: async () => [{ identifier: "notification-1" }],
      },
    );
    const view = await render(
      <ReminderProvider accountId="account-1" controller={controller}>
        <Consumer />
      </ReminderProvider>,
    );

    await waitFor(() => expect(view.getByText("granted:true:7")).toBeTruthy());
  });

  it("publishes the configured Friday reminder separately from the daily reminder", async () => {
    const controller = new ReminderController(
      {
        activate: async () => undefined,
        getActiveAccount: async () => null,
        load: async () => ({
          hour: 7,
          minute: 30,
          enabled: false,
          notificationId: null,
          jumuah: {
            hour: 12,
            minute: 30,
            enabled: true,
            notificationId: "friday-notification-1",
          },
        }),
        save: async () => undefined,
      },
      {
        getPermission: async () => "granted",
        requestPermission: async () => "granted",
        scheduleDaily: async () => "notification-1",
        scheduleFriday: async () => "friday-notification-1",
        cancel: async () => undefined,
        list: async () => [{ identifier: "friday-notification-1" }],
      },
    );
    const view = await render(
      <ReminderProvider accountId="account-1" controller={controller}>
        <JumuahConsumer />
      </ReminderProvider>,
    );

    await waitFor(() => expect(view.getByText("true:12:30")).toBeTruthy());
  });

  it("publishes busy before an in-flight reminder action settles", async () => {
    let resolvePermission!: (value: "granted") => void;
    const permission = new Promise<"granted">((resolve) => {
      resolvePermission = resolve;
    });
    const controller = new ReminderController(
      {
        activate: async () => undefined,
        getActiveAccount: async () => null,
        load: async () => null,
        save: async () => undefined,
      },
      {
        getPermission: async () => "not_asked",
        requestPermission: () => permission,
        scheduleDaily: async () => "notification-1",
        scheduleFriday: async () => "friday-notification-1",
        cancel: async () => undefined,
        list: async () => [],
      },
    );
    const view = await render(
      <ReminderProvider accountId="account-1" controller={controller}>
        <EnableConsumer />
      </ReminderProvider>,
    );

    await waitFor(() => expect(view.getByText("idle")).toBeTruthy());
    fireEvent.press(view.getByRole("button", { name: "enable" }));
    await waitFor(() => expect(view.getByText("busy")).toBeTruthy());

    await act(async () => resolvePermission("granted"));
    await waitFor(() => expect(view.getByText("idle")).toBeTruthy());
  });

  it("forwards a local reminder tap to the supplied today navigation handler", async () => {
    const schedulerModule = jest.requireMock("./expo-scheduler") as {
      subscribeToReminderResponses: jest.MockedFunction<
        (listener: () => void) => { remove: () => void }
      >;
    };
    schedulerModule.subscribeToReminderResponses.mockImplementationOnce((listener) => {
      listener();
      return { remove: jest.fn() };
    });
    const onOpenToday = jest.fn();
    const controller = new ReminderController(
      {
        activate: async () => undefined,
        load: async () => null,
        save: async () => undefined,
        getActiveAccount: async () => null,
      },
      {
        getPermission: async () => "granted",
        requestPermission: async () => "granted",
        scheduleDaily: async () => "notification-1",
        scheduleFriday: async () => "friday-notification-1",
        cancel: async () => undefined,
        list: async () => [],
      },
    );

    await render(
      <ReminderProvider
        accountId="account-1"
        controller={controller}
        onOpenToday={onOpenToday}
      >
        <Consumer />
      </ReminderProvider>,
    );

    await waitFor(() => expect(onOpenToday).toHaveBeenCalledTimes(1));
  });

  it("forwards a retained cold-start reminder response to today", async () => {
    const schedulerModule = jest.requireMock("./expo-scheduler") as {
      wasOpenedFromReminder: jest.MockedFunction<() => Promise<boolean>>;
    };
    schedulerModule.wasOpenedFromReminder.mockResolvedValueOnce(true);
    const onOpenToday = jest.fn();
    const controller = new ReminderController(
      {
        activate: async () => undefined,
        load: async () => null,
        save: async () => undefined,
        getActiveAccount: async () => null,
      },
      {
        getPermission: async () => "granted",
        requestPermission: async () => "granted",
        scheduleDaily: async () => "notification-1",
        scheduleFriday: async () => "friday-notification-1",
        cancel: async () => undefined,
        list: async () => [],
      },
    );

    await render(
      <ReminderProvider
        accountId="account-1"
        controller={controller}
        onOpenToday={onOpenToday}
      >
        <Consumer />
      </ReminderProvider>,
    );

    await waitFor(() => expect(onOpenToday).toHaveBeenCalledTimes(1));
  });
});
