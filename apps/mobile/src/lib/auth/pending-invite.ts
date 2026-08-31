import type { SecureStorageBackend } from "./secure-storage";

const PENDING_INVITE_KEY = "salawat-circle.pending-invite";

export function createPendingInviteStore(backend: SecureStorageBackend) {
  return {
    save: async (token: string) => {
      const normalized = token.trim();
      if (!normalized || normalized.length > 512) {
        throw new Error("INVALID_INVITE_TOKEN");
      }
      await backend.setItemAsync(PENDING_INVITE_KEY, normalized);
    },
    consume: async () => {
      const token = await backend.getItemAsync(PENDING_INVITE_KEY);
      if (token !== null) {
        await backend.deleteItemAsync(PENDING_INVITE_KEY);
      }
      return token;
    },
    clear: () => backend.deleteItemAsync(PENDING_INVITE_KEY),
  };
}
