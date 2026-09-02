import * as SecureStore from "expo-secure-store";
import { AppState } from "react-native";
import {
  createContext,
  type PropsWithChildren,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useTranslation } from "@/localization";
import { ReminderController } from "./reminder-controller";
import {
  createExpoReminderScheduler,
  subscribeToReminderResponses,
  wasOpenedFromReminder,
} from "./expo-scheduler";
import { createReminderStore } from "./reminder-store";
import type { ReminderTime } from "./reminder-time";
import type { ReminderPermission } from "./scheduler";

type ReminderContextValue = {
  permission: ReminderPermission;
  enabled: boolean;
  time: ReminderTime;
  busy: boolean;
  enable(): Promise<void>;
  disable(): Promise<void>;
  setTime(time: ReminderTime): Promise<void>;
};

const Context = createContext<ReminderContextValue | null>(null);

export function ReminderProvider({
  children,
  accountId,
  controller: providedController,
  onOpenToday,
}: PropsWithChildren<{
  accountId: string | null;
  controller?: unknown;
  onOpenToday?: () => void;
}>) {
  const { locale, t } = useTranslation();
  const [revision, setRevision] = useState(0);
  const controller = useMemo(
    () =>
      providedController instanceof ReminderController
        ? providedController
        : new ReminderController(
            createReminderStore(SecureStore),
            createExpoReminderScheduler(),
          ),
    [providedController],
  );
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    void controller
      .setNotificationContent({
        title: t("appName"),
        body: t("reminderNotificationBody"),
      })
      .catch(() => undefined);
  }, [controller, locale, t]);

  useEffect(() => {
    if (!accountId) return;
    let active = true;
    void controller.initialize(accountId).finally(() => {
      if (active) refresh();
    });
    return () => {
      active = false;
    };
  }, [accountId, controller, refresh]);

  useEffect(() => {
    if (!onOpenToday) return;
    let active = true;
    void wasOpenedFromReminder()
      .then((openedFromReminder) => {
        if (active && openedFromReminder) onOpenToday();
      })
      .catch(() => undefined);
    const subscription = subscribeToReminderResponses(onOpenToday);
    return () => {
      active = false;
      subscription.remove();
    };
  }, [onOpenToday]);

  useEffect(() => {
    if (!accountId) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void controller.initialize(accountId).finally(refresh);
      }
    });
    return () => subscription.remove();
  }, [accountId, controller, refresh]);

  const run = useCallback(
    async (action: () => Promise<void>) => {
      const pending = action();
      refresh();
      await pending;
      refresh();
    },
    [refresh],
  );

  const value = useMemo<ReminderContextValue>(
    () => ({
      permission: controller.snapshot.permission,
      enabled: controller.snapshot.enabled,
      time: controller.snapshot.time,
      busy: controller.snapshot.busy,
      enable: () => run(() => controller.enable()),
      disable: () => run(() => controller.disable()),
      setTime: (time) => run(() => controller.setTime(time)),
    }),
    [controller, revision, run],
  );

  return (
    <Context.Provider value={value}>{children}</Context.Provider>
  );
}

export function useReminder() {
  const value = use(Context);
  if (!value) throw new Error("useReminder must be used within ReminderProvider");
  return value;
}
