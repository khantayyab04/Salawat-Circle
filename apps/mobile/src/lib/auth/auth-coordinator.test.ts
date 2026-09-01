import { describe, expect, it, vi } from "vitest";
import {
  AuthCoordinator,
  type AuthGateway,
} from "./auth-coordinator";

function createGateway(overrides: Partial<AuthGateway> = {}): AuthGateway {
  return {
    getCurrentUser: vi.fn().mockResolvedValue(null),
    requestOtp: vi.fn().mockResolvedValue(undefined),
    verifyOtp: vi.fn().mockResolvedValue({ id: "user-1" }),
    getOnboardingState: vi
      .fn()
      .mockResolvedValue({ profileComplete: false, consentGranted: false }),
    upsertProfile: vi.fn().mockResolvedValue(undefined),
    grantConsent: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    getCachedReadyUserId: vi.fn().mockResolvedValue(null),
    cacheReadyUserId: vi.fn().mockResolvedValue(undefined),
    clearCachedReadyUserId: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("AuthCoordinator", () => {
  it("moves through OTP, profile and consent while enforcing cooldown and cleanup", async () => {
    let now = 1_000;
    const gateway = createGateway();
    const clearLocalData = vi.fn().mockResolvedValue(undefined);
    const coordinator = new AuthCoordinator(gateway, clearLocalData, () => now);

    await coordinator.bootstrap();
    expect(coordinator.snapshot.status).toBe("signed_out");

    await coordinator.requestOtp(" Person@Example.com ");
    expect(coordinator.snapshot.pendingEmail).toBe("person@example.com");
    await expect(coordinator.requestOtp("person@example.com")).rejects.toThrow(
      "OTP_COOLDOWN",
    );

    now += 60_000;
    await coordinator.requestOtp("person@example.com");
    await coordinator.verifyOtp("123456");
    expect(coordinator.snapshot.status).toBe("profile_required");
    expect(coordinator.snapshot.userId).toBe("user-1");

    await coordinator.saveProfile(" Jules   Example ", "Europe/Berlin", "de");
    expect(coordinator.snapshot.status).toBe("consent_required");

    await coordinator.grantConsent("de");
    expect(coordinator.snapshot.status).toBe("ready");

    await coordinator.signOut();
    expect(coordinator.snapshot.status).toBe("signed_out");
    expect(coordinator.snapshot.userId).toBeNull();
    expect(clearLocalData).toHaveBeenCalledOnce();
  });

  it("does not reveal why OTP verification failed", async () => {
    const gateway = createGateway({
      verifyOtp: vi.fn().mockRejectedValue(new Error("expired upstream token")),
    });
    const coordinator = new AuthCoordinator(gateway, async () => undefined);
    await coordinator.requestOtp("person@example.com");

    await expect(coordinator.verifyOtp("123456")).rejects.toThrow(
      "OTP_INVALID",
    );
  });

  it("maps upstream resend and rate-limit failures to one neutral error", async () => {
    const coordinator = new AuthCoordinator(
      createGateway({
        requestOtp: vi.fn().mockRejectedValue(new Error("rate limit exceeded")),
      }),
      async () => undefined,
    );

    await expect(coordinator.requestOtp("person@example.com")).rejects.toThrow(
      "OTP_REQUEST_FAILED",
    );
    expect(coordinator.snapshot.pendingEmail).toBeNull();
  });

  it("restores a ready session on restart", async () => {
    const coordinator = new AuthCoordinator(
      createGateway({
        getCurrentUser: vi.fn().mockResolvedValue({ id: "user-1" }),
        getOnboardingState: vi
          .fn()
          .mockResolvedValue({ profileComplete: true, consentGranted: true }),
      }),
      async () => undefined,
    );

    await coordinator.bootstrap();

    expect(coordinator.snapshot.status).toBe("ready");
    expect(coordinator.snapshot.userId).toBe("user-1");
  });

  it("restores a previously ready local session when onboarding is unreachable", async () => {
    const gateway = createGateway({
      getCurrentUser: vi.fn().mockResolvedValue({ id: "user-1" }),
      getOnboardingState: vi
        .fn()
        .mockRejectedValue(new Error("SUPABASE_REQUEST_FAILED")),
      getCachedReadyUserId: vi.fn().mockResolvedValue("user-1"),
    });
    const coordinator = new AuthCoordinator(gateway, async () => undefined);

    await coordinator.bootstrap();

    expect(coordinator.snapshot).toMatchObject({
      status: "ready",
      userId: "user-1",
    });
  });

  it("clears transient state even when secure cleanup reports a failure", async () => {
    const coordinator = new AuthCoordinator(
      createGateway(),
      vi.fn().mockRejectedValue(new Error("keychain unavailable")),
    );
    await coordinator.requestOtp("person@example.com");

    await expect(coordinator.signOut()).rejects.toThrow("keychain unavailable");
    expect(coordinator.snapshot).toEqual({
      status: "signed_out",
      userId: null,
      pendingEmail: null,
      nextOtpRequestAt: null,
    });
  });
});
