import { describe, expect, it, vi } from "vitest";
import type { Database } from "@salawat-circle/shared-types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAuthGateway } from "./supabase-gateway";

describe("Supabase auth gateway", () => {
  it("uses passwordless email OTP and maps the onboarding RPC", async () => {
    const signInWithOtp = vi.fn().mockResolvedValue({ error: null });
    const verifyOtp = vi.fn().mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    const rpc = vi.fn().mockResolvedValue({
      data: { profile_complete: true, consent_granted: false },
      error: null,
    });
    const readyValues = new Map<string, string>();
    const readyBackend = {
      getItemAsync: vi.fn(async (key: string) => readyValues.get(key) ?? null),
      setItemAsync: vi.fn(async (key: string, value: string) => {
        readyValues.set(key, value);
      }),
      deleteItemAsync: vi.fn(async (key: string) => {
        readyValues.delete(key);
      }),
    };
    const getSession = vi.fn().mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
      error: null,
    });
    const client = {
      auth: {
        getSession,
        signInWithOtp,
        verifyOtp,
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
      rpc,
    } as unknown as SupabaseClient<Database>;
    const gateway = createSupabaseAuthGateway(client, readyBackend);

    await expect(gateway.getCurrentUser()).resolves.toEqual({ id: "user-1" });
    expect(getSession).toHaveBeenCalled();

    await gateway.requestOtp("person@example.com");
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: "person@example.com",
      options: { shouldCreateUser: true },
    });

    await expect(
      gateway.verifyOtp("person@example.com", "123456"),
    ).resolves.toEqual({ id: "user-1" });
    await expect(gateway.getOnboardingState()).resolves.toEqual({
      profileComplete: true,
      consentGranted: false,
    });
    await gateway.cacheReadyUserId?.("user-1");
    await expect(gateway.getCachedReadyUserId?.()).resolves.toBe("user-1");
    await gateway.clearCachedReadyUserId?.();
    await expect(gateway.getCachedReadyUserId?.()).resolves.toBeNull();
  });
});
