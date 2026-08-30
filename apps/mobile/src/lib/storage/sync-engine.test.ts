import { beforeEach, describe, expect, it } from "vitest";
import { localDb } from "./local-db";
import {
  calculateBackoffDelay,
  calculateHomeSummary,
  createSalawatEntry,
  deleteSalawatEntry,
  resolveEntryConflict,
  setDailyGoal,
  updateSalawatEntry,
} from "./sync-engine";

describe("Sync Engine & Storage Logic", () => {
  beforeEach(async () => {
    await localDb.clear();
  });

  it("calculates backoff delay with exponential increase and jitter", () => {
    const delay0 = calculateBackoffDelay(0);
    const delay3 = calculateBackoffDelay(3);

    expect(delay0).toBeGreaterThanOrEqual(1000);
    expect(delay0).toBeLessThan(2000);

    expect(delay3).toBeGreaterThanOrEqual(8000);
    expect(delay3).toBeLessThan(9000);
  });

  it("validates amount limits (1 to 10,000,000)", async () => {
    await expect(
      createSalawatEntry({
        amount: 0,
        entry_date: "2026-08-30",
        timezone: "UTC",
      }),
    ).rejects.toThrow();

    await expect(
      createSalawatEntry({
        amount: 10000001,
        entry_date: "2026-08-30",
        timezone: "UTC",
      }),
    ).rejects.toThrow();

    const entry = await createSalawatEntry({
      amount: 500,
      entry_date: "2026-08-30",
      timezone: "UTC",
    });

    expect(entry.amount).toBe(500);
    expect(entry.local_state).toBe("pending_create");
  });

  it("updates existing entry and handles revision increment", async () => {
    const entry = await createSalawatEntry({
      amount: 100,
      entry_date: "2026-08-30",
      timezone: "UTC",
    });

    const updated = await updateSalawatEntry({
      id: entry.id,
      amount: 250,
      entry_date: "2026-08-30",
    });

    expect(updated.amount).toBe(250);
    expect(updated.revision).toBe(2);
  });

  it("deletes unsent entry immediately from local db", async () => {
    const entry = await createSalawatEntry({
      amount: 100,
      entry_date: "2026-08-30",
      timezone: "UTC",
    });

    await deleteSalawatEntry(entry.id);

    const found = await localDb.getEntry(entry.id);
    expect(found).toBeNull();
  });

  it("calculates home summary metrics correctly", async () => {
    // Set daily goal of 200 for 2026-08-24 (Monday)
    await setDailyGoal({
      effective_from: "2026-08-24",
      amount: 200,
    });

    // Add entry on Monday (150) -> below goal
    await createSalawatEntry({
      amount: 150,
      entry_date: "2026-08-24",
      timezone: "UTC",
    });

    // Add entries on Tuesday (250) -> meets goal
    await createSalawatEntry({
      amount: 250,
      entry_date: "2026-08-25",
      timezone: "UTC",
    });

    // Summary for Tuesday 2026-08-25
    const summary = await calculateHomeSummary("2026-08-25");

    expect(summary.today_total).toBe(250);
    expect(summary.week_total).toBe(400);
    expect(summary.all_time_total).toBe(400);
    expect(summary.today_goal).toBe(200);
    expect(summary.achieved_days).toBe(1); // Only 2026-08-25 achieved
    expect(summary.eligible_goal_days).toBe(2); // Monday & Tuesday
  });

  it("resolves entry conflicts by keeping server or reapplying client change", async () => {
    const entry = await createSalawatEntry({
      amount: 100,
      entry_date: "2026-08-30",
      timezone: "UTC",
    });

    // Simulate conflict received from server
    const conflictedEntry = {
      ...entry,
      local_state: "conflict" as const,
      server_data: {
        amount: 300,
        entry_date: "2026-08-30",
        revision: 2,
      },
    };
    await localDb.saveEntry(conflictedEntry);

    // Resolve choosing server version
    await resolveEntryConflict(entry.id, "keep_server");
    const resolved = await localDb.getEntry(entry.id);

    expect(resolved?.amount).toBe(300);
    expect(resolved?.revision).toBe(2);
    expect(resolved?.local_state).toBe("synced");
  });
});
