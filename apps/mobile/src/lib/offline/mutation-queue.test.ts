import { describe, expect, it } from "vitest";
import {
  enqueueCreate,
  enqueueDelete,
  enqueueGoal,
  enqueueUpdate,
} from "./mutation-queue";
import { emptyOfflineState, type OfflineEntry } from "./types";

const now = "2026-08-31T10:00:00.000Z";
const syncedEntry: OfflineEntry = {
  id: "entry-1",
  amount: "5",
  entryDate: "2026-08-31",
  timezone: "Europe/Berlin",
  recordedAtClient: now,
  createdAt: now,
  updatedAt: now,
  revision: 3,
  localState: "synced",
  serverRevision: 3,
  lastAttemptAt: null,
  retryCount: 0,
  lastErrorCode: null,
};

describe("mutation queue", () => {
  it("merges updates into an unsent create", () => {
    const state = emptyOfflineState();
    enqueueCreate(
      state,
      { ...syncedEntry, revision: 0, serverRevision: null },
      "mutation-1",
      now,
    );

    enqueueUpdate(state, "entry-1", 42, "2026-08-30", "mutation-2", now);

    expect(state.queue).toHaveLength(1);
    expect(state.queue[0]).toMatchObject({
      operation: "create",
      payload: { amount: 42, entryDate: "2026-08-30" },
    });
    expect(state.entries[0]).toMatchObject({
      amount: "42",
      entryDate: "2026-08-30",
      localState: "pending_create",
    });
  });

  it("removes a create that is deleted before its first sync", () => {
    const state = emptyOfflineState();
    enqueueCreate(
      state,
      { ...syncedEntry, revision: 0, serverRevision: null },
      "mutation-1",
      now,
    );

    enqueueDelete(state, "entry-1", "mutation-2", now);

    expect(state.queue).toEqual([]);
    expect(state.entries).toEqual([]);
  });

  it("coalesces updates and preserves the original server revision", () => {
    const state = emptyOfflineState();
    state.entries = [{ ...syncedEntry }];

    enqueueUpdate(state, "entry-1", 10, "2026-08-31", "mutation-1", now);
    enqueueUpdate(state, "entry-1", 15, "2026-08-30", "mutation-2", now);
    enqueueDelete(state, "entry-1", "mutation-3", now);

    expect(state.queue).toHaveLength(1);
    expect(state.queue[0]).toMatchObject({
      operation: "delete",
      expectedRevision: 3,
    });
    expect(state.entries[0].localState).toBe("pending_delete");
  });

  it("keeps only the latest goal change for a date", () => {
    const state = emptyOfflineState();

    enqueueGoal(state, 100, "2026-08-31", "mutation-1", now);
    enqueueGoal(state, null, "2026-08-31", "mutation-2", now);

    expect(state.queue).toHaveLength(1);
    expect(state.queue[0]).toMatchObject({
      operation: "set_goal",
      payload: { amount: null, effectiveFrom: "2026-08-31" },
    });
    expect(state.summary.todayGoal).toBeNull();
  });
});
