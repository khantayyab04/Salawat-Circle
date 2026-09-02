import type { Database } from "@salawat-circle/shared-types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthGateway } from "./auth-coordinator";

type GatewayError = { message?: string } | null;
type ReadySessionBackend = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
};
const READY_USER_KEY = "salawat.auth.ready-user";

function ensureSuccess(error: GatewayError) {
  if (error) {
    throw new Error("SUPABASE_REQUEST_FAILED");
  }
}

export function createSupabaseAuthGateway(
  client: SupabaseClient<Database>,
  readySessionBackend: ReadySessionBackend,
): AuthGateway {
  return {
    subscribeToAuthChanges(listener) {
      const { data } = client.auth.onAuthStateChange(() => {
        queueMicrotask(listener);
      });
      return () => data.subscription.unsubscribe();
    },

    async getCurrentUser() {
      const { data, error } = await client.auth.getSession();
      ensureSuccess(error);
      return data.session?.user ?? null;
    },

    async requestOtp(email) {
      const { error } = await client.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      ensureSuccess(error);
    },

    async verifyOtp(email, token) {
      const { data, error } = await client.auth.verifyOtp({
        email,
        token,
        type: "email",
      });
      ensureSuccess(error);
      if (!data.user) {
        throw new Error("SUPABASE_REQUEST_FAILED");
      }
      return data.user;
    },

    async getOnboardingState() {
      const { data, error } = await client.rpc("get_onboarding_state");
      ensureSuccess(error);
      const state = data as {
        profile_complete?: boolean;
        consent_granted?: boolean;
      } | null;
      if (!state) {
        throw new Error("SUPABASE_REQUEST_FAILED");
      }
      return {
        profileComplete: state.profile_complete === true,
        consentGranted: state.consent_granted === true,
      };
    },

    async upsertProfile(displayName, timeZone, locale) {
      const { error } = await client.rpc("upsert_my_profile", {
        p_display_name: displayName,
        p_timezone: timeZone,
        p_locale: locale,
      });
      ensureSuccess(error);
    },

    async grantConsent(locale) {
      const { error } = await client.rpc("grant_core_consent", {
        p_locale: locale,
      });
      ensureSuccess(error);
    },

    async signOut() {
      const { error } = await client.auth.signOut({ scope: "local" });
      ensureSuccess(error);
    },

    async signOutEverywhere() {
      const { error } = await client.auth.signOut({ scope: "global" });
      ensureSuccess(error);
    },

    getCachedReadyUserId() {
      return readySessionBackend.getItemAsync(READY_USER_KEY);
    },

    cacheReadyUserId(userId) {
      return readySessionBackend.setItemAsync(READY_USER_KEY, userId);
    },

    clearCachedReadyUserId() {
      return readySessionBackend.deleteItemAsync(READY_USER_KEY);
    },
  };
}
