export type SecureStorageBackend = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
};

export function createSecureStorage(backend: SecureStorageBackend) {
  return {
    getItem: async (key: string) => {
      try {
        return await backend.getItemAsync(key);
      } catch {
        // Never fall back to insecure persistence when the keychain is unavailable.
        return null;
      }
    },
    setItem: (key: string, value: string) => backend.setItemAsync(key, value),
    removeItem: (key: string) => backend.deleteItemAsync(key),
  };
}
