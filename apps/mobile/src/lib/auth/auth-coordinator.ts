import {
  parseDisplayName,
  parseEmail,
  parseOtp,
  parseTimeZone,
} from "./validation";

export type AuthStatus =
  | "loading"
  | "signed_out"
  | "profile_required"
  | "consent_required"
  | "ready";

export type AuthGateway = {
  subscribeToAuthChanges?(listener: () => void): () => void;
  getCurrentUser(): Promise<{ id: string } | null>;
  requestOtp(email: string): Promise<void>;
  verifyOtp(email: string, token: string): Promise<{ id: string }>;
  getOnboardingState(): Promise<{
    profileComplete: boolean;
    consentGranted: boolean;
  }>;
  upsertProfile(
    displayName: string,
    timeZone: string,
    locale: "de" | "en",
  ): Promise<void>;
  grantConsent(locale: "de" | "en"): Promise<void>;
  signOut(): Promise<void>;
  signOutEverywhere(): Promise<void>;
  getCachedReadyUserId?(): Promise<string | null>;
  cacheReadyUserId?(userId: string): Promise<void>;
  clearCachedReadyUserId?(): Promise<void>;
};

export class AuthCoordinator {
  readonly snapshot = {
    status: "loading" as AuthStatus,
    userId: null as string | null,
    pendingEmail: null as string | null,
    nextOtpRequestAt: null as number | null,
  };

  constructor(
    private readonly gateway: AuthGateway,
    private readonly clearLocalData: () => Promise<void>,
    private readonly now: () => number = Date.now,
  ) {}

  private async refreshOnboardingStatus() {
    const onboarding = await this.gateway.getOnboardingState();
    this.snapshot.status = !onboarding.profileComplete
      ? "profile_required"
      : !onboarding.consentGranted
        ? "consent_required"
        : "ready";
    if (this.snapshot.status === "ready" && this.snapshot.userId) {
      await this.gateway.cacheReadyUserId?.(this.snapshot.userId);
    }
  }

  async bootstrap() {
    const user = await this.gateway.getCurrentUser();
    if (!user) {
      this.snapshot.userId = null;
      this.snapshot.status = "signed_out";
      return;
    }
    this.snapshot.userId = user.id;
    try {
      await this.refreshOnboardingStatus();
    } catch (error) {
      const cachedReadyUserId = await this.gateway.getCachedReadyUserId?.();
      if (cachedReadyUserId === user.id) {
        this.snapshot.status = "ready";
        return;
      }
      throw error;
    }
  }

  async requestOtp(email: string) {
    const normalizedEmail = parseEmail(email);
    if (
      this.snapshot.nextOtpRequestAt !== null &&
      this.now() < this.snapshot.nextOtpRequestAt
    ) {
      throw new Error("OTP_COOLDOWN");
    }
    try {
      await this.gateway.requestOtp(normalizedEmail);
    } catch {
      throw new Error("OTP_REQUEST_FAILED");
    }
    this.snapshot.pendingEmail = normalizedEmail;
    this.snapshot.nextOtpRequestAt = this.now() + 60_000;
  }

  async verifyOtp(token: string) {
    const email = this.snapshot.pendingEmail;
    if (!email) {
      throw new Error("OTP_EMAIL_REQUIRED");
    }
    try {
      const user = await this.gateway.verifyOtp(email, parseOtp(token));
      this.snapshot.userId = user.id;
      await this.refreshOnboardingStatus();
      return this.snapshot.status;
    } catch {
      throw new Error("OTP_INVALID");
    }
  }

  async saveProfile(
    displayName: string,
    timeZone: string,
    locale: "de" | "en",
  ) {
    await this.gateway.upsertProfile(
      parseDisplayName(displayName),
      parseTimeZone(timeZone),
      locale,
    );
    if (this.snapshot.status === "profile_required") {
      this.snapshot.status = "consent_required";
    }
  }

  async grantConsent(locale: "de" | "en") {
    await this.gateway.grantConsent(locale);
    this.snapshot.status = "ready";
    if (this.snapshot.userId) {
      await this.gateway.cacheReadyUserId?.(this.snapshot.userId);
    }
  }

  async signOut() {
    await this.signOutWith(() => this.gateway.signOut());
  }

  async signOutEverywhere() {
    await this.signOutWith(() => this.gateway.signOutEverywhere());
  }

  private async signOutWith(action: () => Promise<void>) {
    try {
      await action();
    } finally {
      try {
        await this.gateway.clearCachedReadyUserId?.();
      } finally {
        try {
          await this.clearLocalData();
        } finally {
          this.snapshot.userId = null;
          this.snapshot.pendingEmail = null;
          this.snapshot.nextOtpRequestAt = null;
          this.snapshot.status = "signed_out";
        }
      }
    }
  }
}
