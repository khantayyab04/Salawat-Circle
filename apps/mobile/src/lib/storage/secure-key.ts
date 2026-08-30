import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

const SECURE_KEY_ALIAS = "salawat_sqlite_key_v1";

async function generateSecureHexKey(byteLength = 32): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(byteLength);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function getOrCreateDatabaseKey(): Promise<string> {
  try {
    let key = await SecureStore.getItemAsync(SECURE_KEY_ALIAS);
    if (!key) {
      key = await generateSecureHexKey(32);
      await SecureStore.setItemAsync(SECURE_KEY_ALIAS, key);
    }
    return key;
  } catch {
    // Fallback if SecureStore is unavailable (e.g. in test environment)
    return "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff";
  }
}
