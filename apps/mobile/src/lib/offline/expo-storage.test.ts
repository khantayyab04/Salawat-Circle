import { beforeEach, describe, expect, it, vi } from "vitest";
import { createExpoOfflineStorage } from "./expo-storage";

const mocks = vi.hoisted(() => ({
  openDatabaseAsync: vi.fn(),
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));

vi.mock("expo-sqlite", () => ({
  openDatabaseAsync: mocks.openDatabaseAsync,
}));

vi.mock("expo-secure-store", () => ({
  getItemAsync: mocks.getItemAsync,
  setItemAsync: mocks.setItemAsync,
  deleteItemAsync: mocks.deleteItemAsync,
}));

vi.mock("expo-crypto", () => ({
  getRandomBytes: (length: number) => new Uint8Array(length).fill(7),
}));
describe("createExpoOfflineStorage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getItemAsync.mockResolvedValue(null);
    mocks.setItemAsync.mockResolvedValue(undefined);
    mocks.deleteItemAsync.mockResolvedValue(undefined);
  });

  it("retries transient initialization failure on the next load", async () => {
    const database = {
      execAsync: vi.fn().mockResolvedValue(undefined),
      getFirstAsync: vi.fn().mockResolvedValue(null),
      runAsync: vi.fn().mockResolvedValue(undefined),
    };
    mocks.openDatabaseAsync
      .mockRejectedValueOnce(new Error("INTERNAL"))
      .mockResolvedValue(database);
    const storage = createExpoOfflineStorage("account-a");

    await expect(storage.load()).rejects.toThrow("INTERNAL");
    await expect(storage.load()).resolves.toBeNull();

    expect(mocks.openDatabaseAsync).toHaveBeenCalledTimes(2);
  });
});
