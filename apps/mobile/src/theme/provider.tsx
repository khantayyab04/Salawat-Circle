import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import { createContext, type PropsWithChildren, use, useMemo } from "react";
import { useColorScheme } from "react-native";
import { darkColors, lightColors, type ColorTokens } from "./colors";

export type AppTheme = { colors: ColorTokens; isDark: boolean };
const AppThemeContext = createContext<AppTheme>({
  colors: lightColors,
  isDark: false,
});

export function AppThemeProvider({ children }: PropsWithChildren) {
  const isDark = useColorScheme() === "dark";
  const colors = isDark ? darkColors : lightColors;
  const appTheme = useMemo(() => ({ colors, isDark }), [colors, isDark]);
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
