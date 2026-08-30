declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_OS?: "android" | "ios" | "web";
    EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
    EXPO_PUBLIC_SUPABASE_URL_ANDROID?: string;
    EXPO_PUBLIC_SUPABASE_URL_IOS?: string;
  }
}
