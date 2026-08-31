import type { Entry, EntrySummary } from "@/lib/entries/entries-gateway";

export type LocalState =
  | "synced"
  | "pending_create"
  | "pending_update"
  | "pending_delete"
  | "conflict"
  | "failed";

export type OfflineEntry = Entry & {
  localState: LocalState;
  serverRevision: number | null;
  lastAttemptAt: string | null;
  retryCount: number;
  lastErrorCode: string | null;
};

export type EntryMutation =
  | {
      id: string;
      entity: "entry";
      operation: "create";
      entityId: string;
      payload: {
        amount: number;
        entryDate: string;
        timezone: string;
        recordedAtClient: string;
      };
      expectedRevision: null;
    }
  | {
      id: string;
      entity: "entry";
      operation: "update";
      entityId: string;
      payload: { amount: number; entryDate: string };
      expectedRevision: number;
    }
  | {
      id: string;
      entity: "entry";
      operation: "delete";
      entityId: string;
      payload: null;
      expectedRevision: number;
    }
  | {
      id: string;
      entity: "goal";
      operation: "set_goal";
      entityId: string;
      payload: { amount: number | null; effectiveFrom: string };
      expectedRevision: null;
    };

export type QueueMutation = EntryMutation & {
  createdAt: string;
  status: "pending" | "failed" | "conflict";
  lastAttemptAt: string | null;
  retryCount: number;
  lastErrorCode: string | null;
  nextAttemptAt: string | null;
};

export type EntryConflict = {
  entryId: string;
  operation: "update" | "delete";
  localAmount: string;
  localEntryDate: string;
  serverEntry: Entry;
};

export type OfflineAccountState = {
  entries: OfflineEntry[];
  summary: EntrySummary;
  timeZone: string;
  queue: QueueMutation[];
  conflict: EntryConflict | null;
  hasMore: boolean;
};

export const EMPTY_SUMMARY: EntrySummary = {
  todayTotal: "0",
  weekTotal: "0",
  allTimeTotal: "0",
  todayGoal: null,
  achievedDays: "0",
  eligibleGoalDays: "0",
};

export function emptyOfflineState(): OfflineAccountState {
  return {
    entries: [],
    summary: { ...EMPTY_SUMMARY },
    timeZone: "",
    queue: [],
    conflict: null,
    hasMore: false,
  };
}
