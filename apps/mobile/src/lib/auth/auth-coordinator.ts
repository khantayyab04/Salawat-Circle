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
};

export class AuthCoordinator {
  readonly snapshot = {
    status: "loading" as AuthStatus,
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
  }

  async bootstrap() {
    const user = await this.gateway.getCurrentUser();
    if (!user) {
      this.snapshot.status = "signed_out";
      return;
    }
    await this.refreshOnboardingStatus();
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
      await this.gateway.verifyOtp(email, parseOtp(token));
      await this.refreshOnboardingStatus();
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
    this.snapshot.status = "consent_required";
  }

  async grantConsent(locale: "de" | "en") {
    await this.gateway.grantConsent(locale);
    this.snapshot.status = "ready";
  }

  async signOut() {
    try {
      await this.gateway.signOut();
    } finally {
      try {
        await this.clearLocalData();
      } finally {
        this.snapshot.pendingEmail = null;
        this.snapshot.nextOtpRequestAt = null;
        this.snapshot.status = "signed_out";
      }
    }
  }
}
