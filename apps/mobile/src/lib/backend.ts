export type BackendEnvironment = {
  EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
  EXPO_PUBLIC_SUPABASE_URL_ANDROID?: string;
  EXPO_PUBLIC_SUPABASE_URL_IOS?: string;
};

type MobilePlatform = "android" | "ios";

export type BackendConfig = {
  anonKey: string;
  url: string;
};

export function resolveBackendConfig(
  environment: BackendEnvironment,
  platform: MobilePlatform,
) {
  const anonKey = environment.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const url =
    platform === "android"
      ? environment.EXPO_PUBLIC_SUPABASE_URL_ANDROID
      : environment.EXPO_PUBLIC_SUPABASE_URL_IOS;

  if (
    !anonKey ||
    anonKey === "replace-with-local-publishable-key" ||
    !url
  ) {
    throw new Error("Backend-Konfiguration fehlt.");
  }

  return {
    anonKey,
    url,
  };
}

export async function checkBackendHealth(config: BackendConfig) {
  const response = await fetch(`${config.url}/rest/v1/`, {
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
    },
  });

  if (!response.ok) {
    throw new Error("Backend ist nicht erreichbar.");
  }
}

export async function checkConfiguredBackend() {
  const platform = process.env.EXPO_OS === "android" ? "android" : "ios";
  const config = resolveBackendConfig(
    {
      EXPO_PUBLIC_SUPABASE_ANON_KEY:
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      EXPO_PUBLIC_SUPABASE_URL_ANDROID:
        process.env.EXPO_PUBLIC_SUPABASE_URL_ANDROID,
      EXPO_PUBLIC_SUPABASE_URL_IOS:
        process.env.EXPO_PUBLIC_SUPABASE_URL_IOS,
    },
    platform,
  );

  return checkBackendHealth(config);
}
