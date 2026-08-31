export type DatabaseKeyBackend = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
};

function storageKey(accountId: string) {
  if (!accountId) throw new Error("ACCOUNT_REQUIRED");
  return `salawat.offline.key.${accountId}`;
}

function toHex(value: Uint8Array) {
  return Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function fromHex(value: string) {
  if (value.length !== 64 || !/^[0-9a-f]+$/u.test(value)) {
    throw new Error("INVALID_ENCRYPTION_KEY");
  }
  return Uint8Array.from(
    value.match(/.{2}/gu)!.map((byte) => Number.parseInt(byte, 16)),
  );
}

export function createDatabaseKeyStore(
  backend: DatabaseKeyBackend,
  randomBytes: (length: number) => Uint8Array,
) {
  return {
    async getOrCreate(accountId: string) {
      const key = storageKey(accountId);
      const stored = await backend.getItemAsync(key);
      if (stored) return fromHex(stored);
      const created = randomBytes(32);
      if (created.length !== 32) throw new Error("INVALID_ENCRYPTION_KEY");
      await backend.setItemAsync(key, toHex(created));
      return created;
    },
    remove: (accountId: string) => backend.deleteItemAsync(storageKey(accountId)),
  };
}
