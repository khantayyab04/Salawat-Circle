/**
 * Colour tokens derived from the Figma Make design.
 *
 * The design uses a warm off-white page, white cards, a deep Medina green as
 * the primary colour and a muted gold as the accent. The dark palette keeps
 * the same relationships: the green becomes a light mint so it stays legible
 * on dark surfaces, and the gold is lifted for the same reason.
 *
 * Legacy aliases (`accent`, `surfaceElevated`, `textInverse`, `borderSubtle`)
 * are kept so existing screens continue to compile while they are migrated.
 */

export const lightColors = {
  // Surfaces
  background: "#F8F6F0",
  surface: "#FFFFFF",
  surfaceMuted: "#E6E2D6",
  surfaceSubtle: "#EFEBE1",

  // Text
  textPrimary: "#0B5C4B",
  textSecondary: "#55655F",
  textDisabled: "#6B7A74",
  textOnPrimary: "#FFFFFF",
  textOnGold: "#3A2B08",

  // Brand
  primary: "#0B5C4B",
  primaryPressed: "#084537",
  primarySoft: "#DDEAE4",

  // Accent
  gold: "#C5A059",
  goldPressed: "#A98442",
  goldSoft: "#F1E7D4",
  goldText: "#7A5B14",

  // Feedback
  success: "#0F6B4B",
  warning: "#7A5B14",
  error: "#B3261E",
  offline: "#55655F",
  pending: "#7A5B14",

  // Lines
  border: "#DCD7C9",
  borderStrong: "#6E7B75",
  focusRing: "#0B5C4B",

  // Legacy aliases
  accent: "#0B5C4B",
  accentPressed: "#084537",
  accentMuted: "#DDEAE4",
  surfaceElevated: "#E6E2D6",
  textInverse: "#FFFFFF",
  borderSubtle: "#DCD7C9",
} as const;

export const darkColors = {
  // Surfaces
  background: "#0E1512",
  surface: "#161E1A",
  surfaceMuted: "#212B26",
  surfaceSubtle: "#1B2420",

  // Text
  textPrimary: "#EDF3F0",
  textSecondary: "#AFBAB4",
  textDisabled: "#8A958F",
  textOnPrimary: "#04241A",
  textOnGold: "#2A1E05",

  // Brand
  primary: "#6ED3A3",
  primaryPressed: "#8FE0BA",
  primarySoft: "#183A2C",

  // Accent
  gold: "#E0BE79",
  goldPressed: "#EED4A0",
  goldSoft: "#33290F",
  goldText: "#E0BE79",

  // Feedback
  success: "#6ED3A3",
  warning: "#E0BE79",
  error: "#FFB4AB",
  offline: "#AFBAB4",
  pending: "#E0BE79",

  // Lines
  border: "#2C3833",
  borderStrong: "#7C8983",
  focusRing: "#6ED3A3",

  // Legacy aliases
  accent: "#6ED3A3",
  accentPressed: "#8FE0BA",
  accentMuted: "#183A2C",
  surfaceElevated: "#212B26",
  textInverse: "#04241A",
  borderSubtle: "#2C3833",
} as const;

export type ColorTokens = { [Key in keyof typeof lightColors]: string };
