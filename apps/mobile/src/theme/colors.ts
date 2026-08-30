import { Color } from "expo-router";
import { Platform } from "react-native";

export const colors = {
  background: Platform.select({
    android: Color.android.dynamic.surface,
    ios: Color.ios.systemBackground,
    default: "#ffffff",
  })!,
  error: Platform.select({
    android: Color.android.dynamic.error,
    ios: Color.ios.systemRed,
    default: "#b42318",
  })!,
  label: Platform.select({
    android: Color.android.dynamic.onSurface,
    ios: Color.ios.label,
    default: "#171717",
  })!,
  secondaryLabel: Platform.select({
    android: Color.android.dynamic.onSurfaceVariant,
    ios: Color.ios.secondaryLabel,
    default: "#525252",
  })!,
  success: Platform.select({
    android: Color.android.dynamic.primary,
    ios: Color.ios.systemGreen,
    default: "#18794e",
  })!,
} as const;
