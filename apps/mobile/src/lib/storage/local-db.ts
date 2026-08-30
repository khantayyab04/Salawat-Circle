import type {
  LocalDailyGoalVersion,
  LocalSalawatEntry,
  SyncQueueItem,
} from "./types";

interface SQLiteDatabaseMock {
  runAsync(sql: string, params?: unknown[]): Promise<unknown>;
  getFirstAsync<T>(sql: string, params?: unknown[]): Promise<T | null>;
  getAllAsync<T>(sql: string, params?: unknown[]): Promise<T[]>;
  execAsync(sql: string): Promise<void>;
}

export class LocalDatabaseService {
  private db: SQLiteDatabaseMock | null = null;
  private entriesMap = new Map<string, LocalSalawatEntry>();
  private goalsMap = new Map<string, LocalDailyGoalVersion>();
  private queueMap = new Map<string, SyncQueueItem>();

  async init(): Promise<void> {
    try {
      const SQLite = await import("expo-sqlite");
      if (typeof SQLite.openDatabaseAsync === "function") {
        const database = (await SQLite.openDatabaseAsync("salawat_local.db")) as unknown as SQLiteDatabaseMock;
        await database.execAsync(`
          PRAGMA journal_mode = WAL;
          CREATE TABLE IF NOT EXISTS local_salawat_entries (
            id TEXT PRIMARY KEY,
            amount INTEGER NOT NULL,
            entry_date TEXT NOT NULL,
            timezone TEXT NOT NULL,
            recorded_at_client TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            revision INTEGER NOT NULL,
            local_state TEXT NOT NULL,
            server_revision INTEGER,
            last_attempt_at TEXT,
            retry_count INTEGER NOT NULL DEFAULT 0,
            last_error_code TEXT,
            server_data TEXT
          );
          CREATE TABLE IF NOT EXISTS local_daily_goal_versions (
            id TEXT PRIMARY KEY,
            effective_from TEXT NOT NULL,
            amount INTEGER,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            local_state TEXT NOT NULL,
            server_revision INTEGER
          );
          CREATE TABLE IF NOT EXISTS sync_queue (
            id TEXT PRIMARY KEY,
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            operation TEXT NOT NULL,
            payload TEXT NOT NULL,
            expected_revision INTEGER,
            created_at TEXT NOT NULL,
            status TEXT NOT NULL,
            retry_count INTEGER NOT NULL DEFAULT 0,
            last_attempt_at TEXT
          );
        `);
        this.db = database;
      }
    } catch {
      // In non-native test environments, fall back to memory maps
      this.db = null;
    }
  }

  async saveEntry(entry: LocalSalawatEntry): Promise<void> {
    if (this.db) {
      await this.db.runAsync(
        `INSERT INTO local_salawat_entries (
          id, amount, entry_date, timezone, recorded_at_client, created_at, updated_at, revision, local_state, retry_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          amount = excluded.amount,
          entry_date = excluded.entry_date,
          updated_at = excluded.updated_at,
          revision = excluded.revision,
          local_state = excluded.local_state,
          retry_count = excluded.retry_count`,
        [
          entry.id,
          entry.amount,
          entry.entry_date,
          entry.timezone,
          entry.recorded_at_client,
          entry.created_at,
          entry.updated_at,
          entry.revision,
          entry.local_state,
          entry.retry_count,
        ],
      );
    }
    this.entriesMap.set(entry.id, { ...entry });
  }

  async getEntry(id: string): Promise<LocalSalawatEntry | null> {
    if (this.db) {
      const row = await this.db.getFirstAsync<LocalSalawatEntry>(
        "SELECT * FROM local_salawat_entries WHERE id = ?",
        [id],
      );
      if (row) return row;
    }
    const found = this.entriesMap.get(id);
    return found ? { ...found } : null;
  }

  async getAllEntries(): Promise<LocalSalawatEntry[]> {
    if (this.db) {
      const rows = await this.db.getAllAsync<LocalSalawatEntry>(
        "SELECT * FROM local_salawat_entries ORDER BY entry_date DESC, created_at DESC",
      );
      if (rows && rows.length > 0) return rows;
    }
    return Array.from(this.entriesMap.values()).sort((a, b) => {
      if (a.entry_date !== b.entry_date) {
        return b.entry_date.localeCompare(a.entry_date);
      }
      return b.created_at.localeCompare(a.created_at);
    });
  }

  async deleteEntry(id: string): Promise<void> {
    if (this.db) {
      await this.db.runAsync("DELETE FROM local_salawat_entries WHERE id = ?", [id]);
    }
    this.entriesMap.delete(id);
  }

  async saveGoal(goal: LocalDailyGoalVersion): Promise<void> {
    if (this.db) {
      await this.db.runAsync(
        `INSERT INTO local_daily_goal_versions (id, effective_from, amount, created_at, updated_at, local_state)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET amount = excluded.amount, updated_at = excluded.updated_at`,
        [goal.id, goal.effective_from, goal.amount, goal.created_at, goal.updated_at, goal.local_state],
      );
    }
    this.goalsMap.set(goal.id, { ...goal });
  }

  async getGoalForDate(effectiveFrom: string): Promise<LocalDailyGoalVersion | null> {
    if (this.db) {
      const row = await this.db.getFirstAsync<LocalDailyGoalVersion>(
        "SELECT * FROM local_daily_goal_versions WHERE effective_from <= ? ORDER BY effective_from DESC LIMIT 1",
        [effectiveFrom],
      );
      if (row) return row;
    }
    const sorted = Array.from(this.goalsMap.values())
      .filter((g) => g.effective_from <= effectiveFrom)
      .sort((a, b) => b.effective_from.localeCompare(a.effective_from));
    return sorted[0] ? { ...sorted[0] } : null;
  }

  async getAllGoals(): Promise<LocalDailyGoalVersion[]> {
    if (this.db) {
      const rows = await this.db.getAllAsync<LocalDailyGoalVersion>(
        "SELECT * FROM local_daily_goal_versions ORDER BY effective_from DESC",
      );
      if (rows && rows.length > 0) return rows;
    }
    return Array.from(this.goalsMap.values()).sort((a, b) =>
      b.effective_from.localeCompare(a.effective_from),
    );
  }

  async enqueueSyncItem(item: SyncQueueItem): Promise<void> {
    if (this.db) {
      await this.db.runAsync(
        `INSERT INTO sync_queue (id, entity_type, entity_id, operation, payload, created_at, status, retry_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.entity_type,
          item.entity_id,
          item.operation,
          JSON.stringify(item.payload),
          item.created_at,
          item.status,
          item.retry_count,
        ],
      );
    }
    this.queueMap.set(item.id, { ...item });
  }

  async getPendingQueueItems(): Promise<SyncQueueItem[]> {
    if (this.db) {
      const rows = await this.db.getAllAsync<SyncQueueItem>(
        "SELECT * FROM sync_queue WHERE status != 'in_flight' ORDER BY created_at ASC",
      );
      if (rows && rows.length > 0) return rows;
    }
    return Array.from(this.queueMap.values())
      .filter((i) => i.status !== "in_flight")
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  async updateQueueItem(item: SyncQueueItem): Promise<void> {
    if (this.db) {
      await this.db.runAsync(
        "UPDATE sync_queue SET status = ?, retry_count = ?, last_attempt_at = ? WHERE id = ?",
        [item.status, item.retry_count, item.last_attempt_at ?? null, item.id],
      );
    }
    this.queueMap.set(item.id, { ...item });
  }

  async removeQueueItem(id: string): Promise<void> {
    if (this.db) {
      await this.db.runAsync("DELETE FROM sync_queue WHERE id = ?", [id]);
    }
    this.queueMap.delete(id);
  }

  async removeQueueItemsForEntity(entityId: string): Promise<void> {
    if (this.db) {
      await this.db.runAsync("DELETE FROM sync_queue WHERE entity_id = ?", [entityId]);
    }
    for (const [key, val] of this.queueMap.entries()) {
      if (val.entity_id === entityId) {
        this.queueMap.delete(key);
      }
    }
  }

  async clear(): Promise<void> {
    if (this.db) {
      await this.db.execAsync(`
        DELETE FROM local_salawat_entries;
        DELETE FROM local_daily_goal_versions;
        DELETE FROM sync_queue;
      `);
    }
    this.entriesMap.clear();
    this.goalsMap.clear();
    this.queueMap.clear();
  }
}

export const localDb = new LocalDatabaseService();
