import "react-native-url-polyfill/auto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { resolveBackendConfig } from "../backend";
import type { Database } from "@/types/database.types";
import { createSecureStorage } from "./secure-storage";

export const AUTH_STORAGE_KEY = "salawat-circle.auth-session";

let configuredClient: SupabaseClient<Database> | null = null;

function getEnvironment() {
  return {
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    EXPO_PUBLIC_SUPABASE_URL_ANDROID:
      process.env.EXPO_PUBLIC_SUPABASE_URL_ANDROID,
    EXPO_PUBLIC_SUPABASE_URL_IOS: process.env.EXPO_PUBLIC_SUPABASE_URL_IOS,
  };
}

export function getSupabaseClient() {
  if (configuredClient) return configuredClient;

  const platform = process.env.EXPO_OS === "android" ? "android" : "ios";
  const config = resolveBackendConfig(getEnvironment(), platform);
  configuredClient = createClient<Database>(config.url, config.anonKey, {
    auth: {
      storage: createSecureStorage(SecureStore),
      storageKey: AUTH_STORAGE_KEY,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return configuredClient;
}

export async function clearSecureAuthSession() {
  await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY);
}
