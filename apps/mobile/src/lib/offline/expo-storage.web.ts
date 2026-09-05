import type { OfflineAccountState } from "./types";

const states = new Map<string, OfflineAccountState>();

export function createExpoOfflineStorage(accountId: string) {
  return {
    async load() {
      return states.get(accountId) ?? null;
    },
    async save(state: OfflineAccountState) {
      states.set(accountId, state);
    },
    async clear() {
      states.delete(accountId);
    },
  };
}

export async function clearAllOfflineData() {
  states.clear();
}
