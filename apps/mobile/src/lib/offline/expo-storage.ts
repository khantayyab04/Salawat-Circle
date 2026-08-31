import * as SecureStore from "expo-secure-store";
import { getRandomBytes } from "expo-crypto";
import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";
import { createDatabaseKeyStore } from "./database-key";
import { EncryptedAccountStorage, type EncryptedRowBackend } from "./storage";

const DATABASE_NAME = "salawat-offline.db";
const ACTIVE_ACCOUNT_KEY = "salawat.offline.active-account";
let databaseWriteChain = Promise.resolve();
let accountTransition = Promise.resolve();
let storageGeneration = 0;

async function openOfflineDatabase() {
  const database = await openDatabaseAsync(DATABASE_NAME);
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS encrypted_account_state (
      account_id TEXT PRIMARY KEY NOT NULL,
      encrypted_payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  return database;
}

function createRowBackend(database: SQLiteDatabase): EncryptedRowBackend {
  return {
    async read(accountId) {
      const row = await database.getFirstAsync<{ encrypted_payload: string }>(
        "SELECT encrypted_payload FROM encrypted_account_state WHERE account_id = ?",
        accountId,
      );
      return row?.encrypted_payload ?? null;
    },
    write(accountId, encryptedPayload) {
      databaseWriteChain = databaseWriteChain.then(async () => {
        await database.runAsync(
          `INSERT INTO encrypted_account_state (account_id, encrypted_payload, updated_at)
           VALUES (?, ?, ?)
           ON CONFLICT(account_id) DO UPDATE SET
             encrypted_payload = excluded.encrypted_payload,
             updated_at = excluded.updated_at`,
          accountId,
          encryptedPayload,
          new Date().toISOString(),
        );
      });
      return databaseWriteChain;
    },
    remove(accountId) {
      databaseWriteChain = databaseWriteChain.then(async () => {
        await database.runAsync(
          "DELETE FROM encrypted_account_state WHERE account_id = ?",
          accountId,
        );
      });
      return databaseWriteChain;
    },
  };
}

export function createExpoOfflineStorage(accountId: string) {
  let instanceGeneration = storageGeneration;
  const initialize = accountTransition.then(async () => {
    const database = await openOfflineDatabase();
    const backend = createRowBackend(database);
    const keys = createDatabaseKeyStore(SecureStore, getRandomBytes);
    const previousAccountId = await SecureStore.getItemAsync(ACTIVE_ACCOUNT_KEY);
    if (previousAccountId && previousAccountId !== accountId) {
      storageGeneration += 1;
      await Promise.all([
        backend.remove(previousAccountId),
        keys.remove(previousAccountId),
      ]);
    }
    await SecureStore.setItemAsync(ACTIVE_ACCOUNT_KEY, accountId);
    const key = await keys.getOrCreate(accountId);
    instanceGeneration = storageGeneration;
    return {
      storage: new EncryptedAccountStorage(
        accountId,
        key,
        backend,
        () => getRandomBytes(12),
      ),
      generation: instanceGeneration,
    };
  });
  accountTransition = initialize.then(
    () => undefined,
    () => undefined,
  );

  return {
    async load() {
      const ready = await initialize;
      if (ready.generation !== storageGeneration) return null;
      return ready.storage.load();
    },
    async save(state: Parameters<EncryptedAccountStorage["save"]>[0]) {
      const ready = await initialize;
      if (ready.generation !== storageGeneration) {
        throw new Error("OFFLINE_STORAGE_CLEARED");
      }
      return ready.storage.save(state);
    },
    async clear() {
      const ready = await initialize;
      if (ready.generation !== storageGeneration) return;
      return ready.storage.clear();
    },
  };
}

export async function clearAllOfflineData() {
  storageGeneration += 1;
  await accountTransition;
  storageGeneration += 1;
  const database = await openOfflineDatabase();
  const accountId = await SecureStore.getItemAsync(ACTIVE_ACCOUNT_KEY);
  await SecureStore.deleteItemAsync(ACTIVE_ACCOUNT_KEY);
  databaseWriteChain = databaseWriteChain.then(async () => {
    await database.runAsync("DELETE FROM encrypted_account_state");
  });
  await databaseWriteChain;
  if (accountId) {
    const keys = createDatabaseKeyStore(SecureStore, getRandomBytes);
    await keys.remove(accountId);
  }
}
