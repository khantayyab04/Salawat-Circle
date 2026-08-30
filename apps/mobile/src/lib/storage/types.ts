export type LocalState =
  | "synced"
  | "pending_create"
  | "pending_update"
  | "pending_delete"
  | "conflict"
  | "failed";

export type LocalSalawatEntry = {
  id: string;
  amount: number;
  entry_date: string; // YYYY-MM-DD
  timezone: string;
  recorded_at_client: string; // ISO 8601
  created_at: string;
  updated_at: string;
  revision: number;
  local_state: LocalState;
  server_revision?: number;
  last_attempt_at?: string;
  retry_count: number;
  last_error_code?: string;
  server_data?: {
    amount: number;
    entry_date: string;
    revision: number;
  };
};

export type LocalDailyGoalVersion = {
  id: string;
  effective_from: string; // YYYY-MM-DD
  amount: number | null;
  created_at: string;
  updated_at: string;
  local_state: LocalState;
  server_revision?: number;
};

export type SyncOperationType = "create" | "update" | "delete";
export type EntityType = "salawat_entry" | "daily_goal";

export type SyncQueueItem = {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  operation: SyncOperationType;
  payload: Record<string, unknown>;
  expected_revision?: number;
  created_at: string;
  status: "pending" | "in_flight" | "failed";
  retry_count: number;
  last_attempt_at?: string;
};

export type HomeSummaryData = {
  today_date: string;
  today_total: number;
  week_start: string;
  week_total: number;
  all_time_total: number;
  today_goal: number | null;
  achieved_days: number;
  eligible_goal_days: number;
  pending_server_count: number;
  calculated_at: string;
};
