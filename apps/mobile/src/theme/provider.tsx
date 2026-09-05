import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import { createContext, type PropsWithChildren, use, useMemo } from "react";
import { useColorScheme } from "react-native";
import { isJumuahWindow } from "@/lib/jumuah/window";
import { getSunsetMinutes } from "@/lib/jumuah/sunset";
import {
  darkColors,
  jumuahDarkColors,
  jumuahLightColors,
  lightColors,
  type ColorTokens,
} from "./colors";

export type AppTheme = { colors: ColorTokens; isDark: boolean; isJumuah: boolean };
const AppThemeContext = createContext<AppTheme>({
  colors: lightColors,
  isDark: false,
  isJumuah: false,
});

export function AppThemeProvider({ children }: PropsWithChildren) {
  const isDark = useColorScheme() === "dark";
  const localTime = new Date();
  const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const localDate = [
    localTime.getFullYear(),
    String(localTime.getMonth() + 1).padStart(2, "0"),
    String(localTime.getDate()).padStart(2, "0"),
  ].join("-");
  const isJumuah = isJumuahWindow(localTime, {
    day: localTime.getDay(),
    sunsetMinutes: getSunsetMinutes(localDate, localTimezone),
  });
  const colors = isJumuah
    ? isDark
      ? jumuahDarkColors
      : jumuahLightColors
    : isDark
      ? darkColors
      : lightColors;
  const appTheme = useMemo(
    () => ({ colors, isDark, isJumuah }),
    [colors, isDark, isJumuah],
  );
  const base = isDark ? DarkTheme : DefaultTheme;
  const navigationTheme = useMemo(
    () => ({
      ...base,
      colors: {
        ...base.colors,
        background: colors.background,
        border: colors.borderSubtle,
        card: colors.surface,
        notification: colors.error,
        primary: colors.accent,
        text: colors.textPrimary,
      },
    }),
    [base, colors],
  );
  return (
    <AppThemeContext value={appTheme}>
      <ThemeProvider value={navigationTheme}>{children}</ThemeProvider>
    </AppThemeContext>
  );
}

export function useAppTheme() {
  return use(AppThemeContext);
}
