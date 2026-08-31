import { decryptJson, encryptJson } from "./local-crypto";
import type { OfflineAccountState } from "./types";

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
    return encrypted
      ? decryptJson<OfflineAccountState>(encrypted, this.key)
      : null;
  }

  async save(state: OfflineAccountState): Promise<void> {
    await this.backend.write(
      this.accountId,
      encryptJson(state, this.key, this.createNonce),
    );
  }

  clear(): Promise<void> {
    return this.backend.remove(this.accountId);
  }
}
