import type { Database } from "@salawat-circle/shared-types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SettingsProfile = {
  displayName: string;
  timeZone: string;
};

export function createSupabaseSettingsGateway(client: SupabaseClient<Database>) {
  return {
    async loadProfile(): Promise<SettingsProfile> {
      const [profile, settings] = await Promise.all([
        client.from("profiles").select("display_name").single(),
        client.from("user_settings").select("timezone").single(),
      ]);
      if (
        profile.error ||
        settings.error ||
        !profile.data?.display_name ||
        !settings.data?.timezone
      ) {
        throw new Error("SETTINGS_LOAD_FAILED");
      }
      return {
        displayName: profile.data.display_name,
        timeZone: settings.data.timezone,
      };
    },
  };
}
