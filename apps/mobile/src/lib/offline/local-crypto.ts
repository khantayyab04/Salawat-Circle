import { gcm } from "@noble/ciphers/aes.js";
import {
  bytesToHex,
  bytesToUtf8,
  hexToBytes,
  utf8ToBytes,
} from "@noble/ciphers/utils.js";

function assertKey(key: Uint8Array) {
  if (key.length !== 32) throw new Error("INVALID_ENCRYPTION_KEY");
}

export function encryptJson(
  value: unknown,
  key: Uint8Array,
  createNonce: () => Uint8Array,
) {
  assertKey(key);
  const nonce = createNonce();
  if (nonce.length !== 12) throw new Error("INVALID_ENCRYPTION_NONCE");
  const plaintext = utf8ToBytes(JSON.stringify(value));
  const ciphertext = gcm(key, nonce).encrypt(plaintext);
  return `v1.${bytesToHex(nonce)}.${bytesToHex(ciphertext)}`;
}

export function decryptJson<T>(value: string, key: Uint8Array): T {
  assertKey(key);
  const [version, nonceHex, ciphertextHex, extra] = value.split(".");
  if (version !== "v1" || !nonceHex || !ciphertextHex || extra) {
    throw new Error("INVALID_ENCRYPTED_DATA");
  }
  const nonce = hexToBytes(nonceHex);
  if (nonce.length !== 12) throw new Error("INVALID_ENCRYPTED_DATA");
  const plaintext = gcm(key, nonce).decrypt(hexToBytes(ciphertextHex));
  return JSON.parse(bytesToUtf8(plaintext)) as T;
}
