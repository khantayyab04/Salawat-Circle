import { beforeEach, describe, expect, it } from "vitest";
import { localDb } from "../storage/local-db";
import {
  calculateHomeSummary,
  createSalawatEntry,
  deleteSalawatEntry,
  setDailyGoal,
} from "../storage/sync-engine";

describe("useSalawat Hook Business Logic", () => {
  beforeEach(async () => {
    await localDb.clear();
  });

  it("computes summary after adding entries and daily goal", async () => {
    await setDailyGoal({
      effective_from: "2026-08-30",
      amount: 500,
    });

    await createSalawatEntry({
      amount: 200,
      entry_date: "2026-08-30",
      timezone: "UTC",
    });

    await createSalawatEntry({
      amount: 300,
      entry_date: "2026-08-30",
      timezone: "UTC",
    });

    const summary = await calculateHomeSummary("2026-08-30");

    expect(summary.today_total).toBe(500);
    expect(summary.today_goal).toBe(500);
    expect(summary.achieved_days).toBe(1);
    expect(summary.eligible_goal_days).toBe(1);
  });

  it("updates pagination and entries list on deletion", async () => {
    const entry1 = await createSalawatEntry({
      amount: 100,
      entry_date: "2026-08-30",
      timezone: "UTC",
    });

    const entry2 = await createSalawatEntry({
      amount: 200,
      entry_date: "2026-08-30",
      timezone: "UTC",
    });

    let all = await localDb.getAllEntries();
    expect(all.length).toBe(2);

    await deleteSalawatEntry(entry1.id);

    all = await localDb.getAllEntries();
    expect(all.length).toBe(1);
    expect(all[0].id).toBe(entry2.id);
  });
});
