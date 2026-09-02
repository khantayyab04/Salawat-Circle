import * as SecureStore from "expo-secure-store";
import { clearActiveReminderForLogout } from "./reminder-cleanup";
import { createExpoReminderScheduler } from "./expo-scheduler";
import { createReminderStore } from "./reminder-store";

export function clearExpoReminderForLogout() {
  return clearActiveReminderForLogout(
    createReminderStore(SecureStore),
    createExpoReminderScheduler(),
  );
}
