import { describe, expect, it, vi } from "vitest";
import type { Database } from "@salawat-circle/shared-types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseEntriesGateway } from "./entries-gateway";

const entry = {
  id: "00000000-0000-4000-8000-000000000001",
  amount: "42",
  entry_date: "2026-08-31",
  timezone: "Europe/Berlin",
  recorded_at_client: "2026-08-31T10:00:00.000Z",
  created_at: "2026-08-31T10:00:01.000Z",
  updated_at: "2026-08-31T10:00:01.000Z",
  revision: 1,
};

describe("Supabase entries gateway", () => {
  it("uses the entry RPC contract and returns canonical server data", async () => {
    const rpc = vi.fn().mockImplementation((name: string) => {
      if (name === "create_entry") {
        return Promise.resolve({ data: { entry }, error: null });
      }
      if (name === "list_entries") {
        return Promise.resolve({
          data: { items: [entry], next_cursor: null, has_more: false },
          error: null,
        });
      }
      if (name === "get_entry") {
        return Promise.resolve({ data: { entry }, error: null });
      }
      if (name === "update_entry") {
        return Promise.resolve({
          data: null,
          error: { message: "ENTRY_VERSION_CONFLICT" },
          status: 400,
        });
      }
      return Promise.resolve({
        data: {
          today_total: "42",
          week_total: "42",
          all_time_total: "42",
          today_goal: "100",
          achieved_days: "2",
          eligible_goal_days: "4",
        },
        error: null,
      });
    });
    const single = vi.fn().mockResolvedValue({
      data: { timezone: "Europe/Berlin" },
      error: null,
    });
    const client = {
      rpc,
      from: vi.fn(() => ({ select: vi.fn(() => ({ single })) })),
      auth: {
        refreshSession: vi.fn().mockResolvedValue({ data: {}, error: null }),
      },
    } as unknown as SupabaseClient<Database>;
    const gateway = createSupabaseEntriesGateway(client);

    await expect(
      gateway.create({
        id: entry.id,
        amount: 42,
        entryDate: entry.entry_date,
        timezone: entry.timezone,
        recordedAtClient: entry.recorded_at_client,
      }),
    ).resolves.toEqual({
      id: entry.id,
      amount: "42",
      entryDate: "2026-08-31",
      timezone: "Europe/Berlin",
      recordedAtClient: "2026-08-31T10:00:00.000Z",
      createdAt: "2026-08-31T10:00:01.000Z",
      updatedAt: "2026-08-31T10:00:01.000Z",
      revision: 1,
    });
    await expect(gateway.list(null, 30)).resolves.toEqual({
      items: [
        {
          id: entry.id,
          amount: "42",
          entryDate: "2026-08-31",
          timezone: "Europe/Berlin",
          recordedAtClient: "2026-08-31T10:00:00.000Z",
          createdAt: "2026-08-31T10:00:01.000Z",
          updatedAt: "2026-08-31T10:00:01.000Z",
          revision: 1,
        },
      ],
      nextCursor: null,
      hasMore: false,
    });
    await expect(gateway.getSummary("Europe/Berlin")).resolves.toMatchObject({
      todayTotal: "42",
      weekTotal: "42",
      allTimeTotal: "42",
      todayGoal: "100",
      achievedDays: "2",
      eligibleGoalDays: "4",
    });
    await expect(gateway.setGoal(100, "2026-08-31")).resolves.toBeUndefined();
    await expect(gateway.setGoal(null, "2026-08-31")).resolves.toBeUndefined();
    await expect(gateway.getTimeZone("UTC")).resolves.toBe("Europe/Berlin");
    await expect(gateway.getEntry?.(entry.id)).resolves.toMatchObject({
      id: entry.id,
      revision: 1,
    });
    await expect(gateway.refreshSession?.()).resolves.toBeUndefined();
    await expect(
      gateway.update({
        id: entry.id,
        amount: 43,
        entryDate: entry.entry_date,
        expectedRevision: 1,
      }),
    ).rejects.toThrow("ENTRY_VERSION_CONFLICT");

    expect(rpc).toHaveBeenCalledWith("create_entry", {
      p_id: entry.id,
      p_amount: 42,
      p_entry_date: "2026-08-31",
      p_timezone: "Europe/Berlin",
      p_recorded_at_client: "2026-08-31T10:00:00.000Z",
    });
    expect(rpc).toHaveBeenCalledWith("list_entries", { p_limit: 30 });
    expect(rpc).toHaveBeenCalledWith("get_entry", { p_id: entry.id });
    expect(rpc).toHaveBeenCalledWith("set_daily_goal", {
      p_amount: 100,
      p_effective_from: "2026-08-31",
    });
    expect(rpc).toHaveBeenCalledWith("set_daily_goal", {
      p_amount: null,
      p_effective_from: "2026-08-31",
    });
  });
});
