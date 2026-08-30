import { z } from "zod";
import { localDb } from "./local-db";
import type {
  HomeSummaryData,
  LocalSalawatEntry,
  SyncQueueItem,
} from "./types";

export const SalawatEntrySchema = z.object({
  amount: z.number().int().min(1).max(10000000),
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone: z.string().min(1),
});

export const DailyGoalSchema = z.object({
  effective_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().int().min(1).max(10000000).nullable(),
});

export function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function calculateBackoffDelay(retryCount: number): number {
  const base = 1000; // 1 second
  const max = 60000; // 60 seconds
  const exponential = Math.min(max, base * Math.pow(2, retryCount));
  const jitter = Math.floor(Math.random() * 500);
  return exponential + jitter;
}

export async function createSalawatEntry(params: {
  amount: number;
  entry_date: string;
  timezone: string;
}): Promise<LocalSalawatEntry> {
  const validated = SalawatEntrySchema.parse(params);
  const id = generateUUID();
  const now = new Date().toISOString();

  const entry: LocalSalawatEntry = {
    id,
    amount: validated.amount,
    entry_date: validated.entry_date,
    timezone: validated.timezone,
    recorded_at_client: now,
    created_at: now,
    updated_at: now,
    revision: 1,
    local_state: "pending_create",
    retry_count: 0,
  };

  await localDb.saveEntry(entry);

  const queueItem: SyncQueueItem = {
    id: generateUUID(),
    entity_type: "salawat_entry",
    entity_id: id,
    operation: "create",
    payload: {
      id,
      amount: validated.amount,
      entry_date: validated.entry_date,
      timezone: validated.timezone,
      recorded_at_client: now,
    },
    created_at: now,
    status: "pending",
    retry_count: 0,
  };

  await localDb.enqueueSyncItem(queueItem);
  return entry;
}

export async function updateSalawatEntry(params: {
  id: string;
  amount: number;
  entry_date: string;
}): Promise<LocalSalawatEntry> {
  const existing = await localDb.getEntry(params.id);
  if (!existing) {
    throw new Error("Eintrag nicht gefunden.");
  }

  const validated = SalawatEntrySchema.partial().parse({
    amount: params.amount,
    entry_date: params.entry_date,
  });

  const now = new Date().toISOString();
  const updated: LocalSalawatEntry = {
    ...existing,
    amount: validated.amount ?? existing.amount,
    entry_date: validated.entry_date ?? existing.entry_date,
    updated_at: now,
    revision: existing.revision + 1,
    local_state: existing.local_state === "pending_create" ? "pending_create" : "pending_update",
  };

  await localDb.saveEntry(updated);

  await localDb.enqueueSyncItem({
    id: generateUUID(),
    entity_type: "salawat_entry",
    entity_id: params.id,
    operation: updated.local_state === "pending_create" ? "create" : "update",
    payload: {
      id: params.id,
      amount: updated.amount,
      entry_date: updated.entry_date,
      expected_revision: existing.revision,
    },
    expected_revision: existing.revision,
    created_at: now,
    status: "pending",
    retry_count: 0,
  });

  return updated;
}

export async function deleteSalawatEntry(id: string): Promise<void> {
  const existing = await localDb.getEntry(id);
  if (!existing) {
    return;
  }

  if (existing.local_state === "pending_create") {
    // If not yet sent to server, remove locally and purge queue
    await localDb.deleteEntry(id);
    await localDb.removeQueueItemsForEntity(id);
    return;
  }

  const now = new Date().toISOString();
  const updated: LocalSalawatEntry = {
    ...existing,
    local_state: "pending_delete",
    updated_at: now,
  };

  await localDb.saveEntry(updated);

  await localDb.enqueueSyncItem({
    id: generateUUID(),
    entity_type: "salawat_entry",
    entity_id: id,
    operation: "delete",
    payload: {
      id,
      expected_revision: existing.revision,
    },
    expected_revision: existing.revision,
    created_at: now,
    status: "pending",
    retry_count: 0,
  });
}

export async function resolveEntryConflict(
  id: string,
  choice: "keep_server" | "reapply_mine",
): Promise<void> {
  const existing = await localDb.getEntry(id);
  if (!existing) {
    return;
  }

  if (choice === "keep_server" && existing.server_data) {
    const updated: LocalSalawatEntry = {
      ...existing,
      amount: existing.server_data.amount,
      entry_date: existing.server_data.entry_date,
      revision: existing.server_data.revision,
      local_state: "synced",
      server_data: undefined,
    };
    await localDb.saveEntry(updated);
    await localDb.removeQueueItemsForEntity(id);
  } else if (choice === "reapply_mine" && existing.server_data) {
    const updated: LocalSalawatEntry = {
      ...existing,
      revision: existing.server_data.revision + 1,
      local_state: "pending_update",
      server_data: undefined,
    };
    await localDb.saveEntry(updated);
    await localDb.enqueueSyncItem({
      id: generateUUID(),
      entity_type: "salawat_entry",
      entity_id: id,
      operation: "update",
      payload: {
        id,
        amount: updated.amount,
        entry_date: updated.entry_date,
        expected_revision: existing.server_data.revision,
      },
      expected_revision: existing.server_data.revision,
      created_at: new Date().toISOString(),
      status: "pending",
      retry_count: 0,
    });
  }
}

export async function setDailyGoal(params: {
  effective_from: string;
  amount: number | null;
}): Promise<void> {
  const validated = DailyGoalSchema.parse(params);
  const now = new Date().toISOString();
  const id = generateUUID();

  await localDb.saveGoal({
    id,
    effective_from: validated.effective_from,
    amount: validated.amount,
    created_at: now,
    updated_at: now,
    local_state: "pending_update",
  });

  await localDb.enqueueSyncItem({
    id: generateUUID(),
    entity_type: "daily_goal",
    entity_id: id,
    operation: "update",
    payload: {
      effective_from: validated.effective_from,
      amount: validated.amount,
    },
    created_at: now,
    status: "pending",
    retry_count: 0,
  });
}

export async function processSyncQueue(
  remoteRpcCaller?: (rpcName: string, args: Record<string, unknown>) => Promise<Record<string, unknown>>,
): Promise<void> {
  const pendingItems = await localDb.getPendingQueueItems();
  if (pendingItems.length === 0) return;

  for (const item of pendingItems) {
    item.status = "in_flight";
    item.last_attempt_at = new Date().toISOString();
    await localDb.updateQueueItem(item);

    try {
      if (remoteRpcCaller) {
        let rpcName = "";
        if (item.entity_type === "salawat_entry") {
          rpcName =
            item.operation === "create"
              ? "create_entry"
              : item.operation === "update"
              ? "update_entry"
              : "delete_entry";
        } else if (item.entity_type === "daily_goal") {
          rpcName = "set_daily_goal";
        }

        const res = await remoteRpcCaller(rpcName, item.payload);

        if (item.entity_type === "salawat_entry") {
          if (item.operation === "delete") {
            await localDb.deleteEntry(item.entity_id);
          } else if (res) {
            const entry = await localDb.getEntry(item.entity_id);
            if (entry) {
              await localDb.saveEntry({
                ...entry,
                local_state: "synced",
                revision: typeof res.revision === "number" ? res.revision : entry.revision,
              });
            }
          }
        }
      }

      await localDb.removeQueueItem(item.id);
    } catch (err: unknown) {
      item.status = "failed";
      item.retry_count += 1;
      await localDb.updateQueueItem(item);

      const isConflict =
        err instanceof Error &&
        (err.message.includes("ENTRY_VERSION_CONFLICT") || err.message.includes("409"));

      if (isConflict && item.entity_type === "salawat_entry") {
        const entry = await localDb.getEntry(item.entity_id);
        if (entry) {
          await localDb.saveEntry({
            ...entry,
            local_state: "conflict",
          });
        }
      }
    }
  }
}

export async function calculateHomeSummary(
  targetDate: string,
): Promise<HomeSummaryData> {
  const entries = await localDb.getAllEntries();
  const activeEntries = entries.filter((e) => e.local_state !== "pending_delete");

  // Calculate Monday to Sunday of current ISO week
  const dateObj = new Date(targetDate);
  const dayOfWeek = dateObj.getUTCDay() || 7; // 1 (Mon) to 7 (Sun)
  const mondayObj = new Date(dateObj);
  mondayObj.setUTCDate(dateObj.getUTCDate() - (dayOfWeek - 1));
  const weekStart = mondayObj.toISOString().slice(0, 10);

  const sundayObj = new Date(mondayObj);
  sundayObj.setUTCDate(mondayObj.getUTCDate() + 6);
  const weekEnd = sundayObj.toISOString().slice(0, 10);

  const todayEntries = activeEntries.filter((e) => e.entry_date === targetDate);
  const todayTotal = todayEntries.reduce((sum, e) => sum + e.amount, 0);

  const weekEntries = activeEntries.filter(
    (e) => e.entry_date >= weekStart && e.entry_date <= weekEnd,
  );
  const weekTotal = weekEntries.reduce((sum, e) => sum + e.amount, 0);

  const allTimeTotal = activeEntries.reduce((sum, e) => sum + e.amount, 0);

  const goalVersion = await localDb.getGoalForDate(targetDate);
  const todayGoal = goalVersion ? goalVersion.amount : null;

  // Compute goal statistics for Monday up to targetDate
  let achievedDays = 0;
  let eligibleGoalDays = 0;

  const current = new Date(mondayObj);
  const end = new Date(dateObj);

  while (current <= end) {
    const dateStr = current.toISOString().slice(0, 10);
    const goal = await localDb.getGoalForDate(dateStr);
    if (goal && goal.amount !== null && goal.amount > 0) {
      eligibleGoalDays++;
      const dayTotal = activeEntries
        .filter((e) => e.entry_date === dateStr)
        .reduce((sum, e) => sum + e.amount, 0);
      if (dayTotal >= goal.amount) {
        achievedDays++;
      }
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }

  const pendingCount = entries.filter((e) => e.local_state !== "synced").length;

  return {
    today_date: targetDate,
    today_total: todayTotal,
    week_start: weekStart,
    week_total: weekTotal,
    all_time_total: allTimeTotal,
    today_goal: todayGoal,
    achieved_days: achievedDays,
    eligible_goal_days: eligibleGoalDays,
    pending_server_count: pendingCount,
    calculated_at: new Date().toISOString(),
  };
}
