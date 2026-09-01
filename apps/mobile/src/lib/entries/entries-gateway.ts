import type { Database } from "@salawat-circle/shared-types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getEntriesErrorCode } from "./errors";

export type Entry = {
  id: string;
  amount: string;
  entryDate: string;
  timezone: string;
  recordedAtClient: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
};

export type EntryCursor = {
  entryDate: string;
  createdAt: string;
  id: string;
};

export type EntrySummary = {
  todayTotal: string;
  weekTotal: string;
  allTimeTotal: string;
};

export type CreateEntryInput = {
  id: string;
  amount: number;
  entryDate: string;
  timezone: string;
  recordedAtClient: string;
};

export type EntriesGateway = {
  getTimeZone(fallback: string): Promise<string>;
  getSummary(timezone: string): Promise<EntrySummary>;
  list(cursor: EntryCursor | null, limit: number): Promise<{
    items: Entry[];
    nextCursor: EntryCursor | null;
    hasMore: boolean;
  }>;
  create(input: CreateEntryInput): Promise<Entry>;
  update(input: {
    id: string;
    amount: number;
    entryDate: string;
    expectedRevision: number;
  }): Promise<Entry>;
  delete(input: { id: string; expectedRevision: number }): Promise<void>;
};

type RawEntry = {
  id: string;
  amount: string;
  entry_date: string;
  timezone: string;
  recorded_at_client: string;
  created_at: string;
  updated_at: string;
  revision: number;
};

function entryFromRaw(entry: RawEntry): Entry {
  return {
    id: entry.id,
    amount: entry.amount,
    entryDate: entry.entry_date,
    timezone: entry.timezone,
    recordedAtClient: entry.recorded_at_client,
    createdAt: entry.created_at,
    updatedAt: entry.updated_at,
    revision: entry.revision,
  };
}

function ensureSuccess(error: { message?: string } | null) {
  if (error) throw new Error(getEntriesErrorCode(error));
}

export function createSupabaseEntriesGateway(
  client: SupabaseClient<Database>,
): EntriesGateway {
  return {
    async getTimeZone(fallback) {
      const { data, error } = await client
        .from("user_settings")
        .select("timezone")
        .single();
      if (error || !data?.timezone) return fallback;
      return data.timezone;
    },

    async getSummary(timezone) {
      const { data, error } = await client.rpc("get_home_summary", {
        p_timezone: timezone,
      });
      ensureSuccess(error);
      const summary = data as {
        today_total?: string;
        week_total?: string;
        all_time_total?: string;
      } | null;
      if (
        !summary?.today_total ||
        !summary.week_total ||
        !summary.all_time_total
      ) {
        throw new Error("INTERNAL");
      }
      return {
        todayTotal: summary.today_total,
        weekTotal: summary.week_total,
        allTimeTotal: summary.all_time_total,
      };
    },

    async list(cursor, limit) {
      const cursorArgs = cursor
        ? {
            p_cursor_entry_date: cursor.entryDate,
            p_cursor_created_at: cursor.createdAt,
            p_cursor_id: cursor.id,
          }
        : {};
      const { data, error } = await client.rpc("list_entries", {
        ...cursorArgs,
        p_limit: limit,
      });
      ensureSuccess(error);
      const page = data as {
        items?: RawEntry[];
        next_cursor?: {
          entry_date: string;
          created_at: string;
          id: string;
        } | null;
        has_more?: boolean;
      } | null;
      if (!page?.items || typeof page.has_more !== "boolean") {
        throw new Error("INTERNAL");
      }
      return {
        items: page.items.map(entryFromRaw),
        nextCursor: page.next_cursor
          ? {
              entryDate: page.next_cursor.entry_date,
              createdAt: page.next_cursor.created_at,
              id: page.next_cursor.id,
            }
          : null,
        hasMore: page.has_more,
      };
    },

    async create(input) {
      const { data, error } = await client.rpc("create_entry", {
        p_id: input.id,
        p_amount: input.amount,
        p_entry_date: input.entryDate,
        p_timezone: input.timezone,
        p_recorded_at_client: input.recordedAtClient,
      });
      ensureSuccess(error);
      const rawEntry = (data as { entry?: RawEntry } | null)?.entry;
      if (!rawEntry) throw new Error("INTERNAL");
      return entryFromRaw(rawEntry);
    },

    async update(input) {
      const { data, error } = await client.rpc("update_entry", {
        p_id: input.id,
        p_amount: input.amount,
        p_entry_date: input.entryDate,
        p_expected_revision: input.expectedRevision,
      });
      ensureSuccess(error);
      const rawEntry = (data as { entry?: RawEntry } | null)?.entry;
      if (!rawEntry) throw new Error("INTERNAL");
      return entryFromRaw(rawEntry);
    },

    async delete(input) {
      const { error } = await client.rpc("delete_entry", {
        p_id: input.id,
        p_expected_revision: input.expectedRevision,
      });
      ensureSuccess(error);
    },
  };
}
