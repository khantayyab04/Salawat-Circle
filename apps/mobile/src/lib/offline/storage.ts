import { decryptJson, encryptJson } from "./local-crypto";
import { migrateOfflineState, type OfflineAccountState } from "./types";

export type EncryptedRowBackend = {
  read(accountId: string): Promise<string | null>;
  write(accountId: string, encryptedPayload: string): Promise<void>;
  remove(accountId: string): Promise<void>;
};

export class EncryptedAccountStorage {
  constructor(
    private readonly accountId: string,
    private readonly key: Uint8Array,
    private readonly backend: EncryptedRowBackend,
    private readonly createNonce: () => Uint8Array,
  ) {}

  async load(): Promise<OfflineAccountState | null> {
    const encrypted = await this.backend.read(this.accountId);
    if (!encrypted) return null;
    try {
      return decryptJson<OfflineAccountState>(encrypted, this.key);
    } catch {
      throw new Error("INVALID_OFFLINE_STATE");
    }
  }

  async save(state: OfflineAccountState): Promise<void> {
    const normalized = migrateOfflineState(state);
    await this.backend.write(
      this.accountId,
      encryptJson(normalized, this.key, this.createNonce),
    );
  }

  clear(): Promise<void> {
    return this.backend.remove(this.accountId);
  }
}
