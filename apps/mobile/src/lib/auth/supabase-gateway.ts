import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthGateway } from "./auth-coordinator";

type GatewayError = { message?: string } | null;

function ensureSuccess(error: GatewayError) {
  if (error) {
    throw new Error("SUPABASE_REQUEST_FAILED");
  }
}

export function createSupabaseAuthGateway(
  client: SupabaseClient<Database>,
): AuthGateway {
  return {
    subscribeToAuthChanges(listener) {
      const { data } = client.auth.onAuthStateChange(() => {
        queueMicrotask(listener);
      });
      return () => data.subscription.unsubscribe();
    },

    async getCurrentUser() {
      const { data, error } = await client.auth.getUser();
      ensureSuccess(error);
      return data.user;
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
  };
}
