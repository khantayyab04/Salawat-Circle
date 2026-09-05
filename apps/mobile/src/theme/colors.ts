import {
  darkColors as darkSystemColors,
  jumuahDarkColors as jumuahDarkSystemColors,
  jumuahLightColors as jumuahLightSystemColors,
  lightColors as lightSystemColors,
} from "@/design-system";

function legacyColors<
  T extends {
    background: string;
    surface: string;
    surfaceRaised: string;
    textPrimary: string;
    textSecondary: string;
    textDisabled: string;
    textOnAccent: string;
    primary: string;
    primaryPressed: string;
    primaryMuted: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    borderSubtle: string;
    borderStrong: string;
    focus: string;
  },
>(colors: T) {
  return {
    ...colors,
    surfaceElevated: colors.surfaceRaised,
    textInverse: colors.textOnAccent,
    accent: colors.primary,
    accentPressed: colors.primaryPressed,
    accentMuted: colors.primaryMuted,
    offline: colors.info,
    pending: colors.info,
    focusRing: colors.focus,
  };
}

export const lightColors = legacyColors(lightSystemColors);
export const darkColors = legacyColors(darkSystemColors);
export const jumuahLightColors = legacyColors(jumuahLightSystemColors);
export const jumuahDarkColors = legacyColors(jumuahDarkSystemColors);
export type ColorTokens = { [Key in keyof typeof lightColors]: string };
