import type { TextStyle } from "react-native";

/**
 * Spacing follows a 4 point grid. The design leans on generous gaps between
 * cards and tighter rhythm inside them.
 */
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  section: 40,
  page: 48,
} as const;

/**
 * The mockup uses noticeably round corners: inputs and chips are soft, cards
 * are very round, and sheets and the tab bar are fully rounded.
 */
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  card: 28,
  sheet: 32,
  pill: 9999,
} as const;

export const motion = {
  fast: 150,
  base: 250,
  slow: 400,
  ring: 900,
} as const;

export const shadows = {
  card: "0 1px 3px rgba(11, 92, 75, 0.06)",
  raised: "0 6px 18px rgba(11, 92, 75, 0.10)",
  floating: "0 10px 30px rgba(11, 92, 75, 0.22)",
} as const;

/**
 * Two families, as in the design: a serif for numerals and headings, and a
 * grotesque for everything else. `label` is the wide uppercase style the
 * mockup uses for almost every caption.
 */
export const fontFamily = {
  serif: "PlayfairDisplay_700Bold",
  sans: "Inter_400Regular",
  sansMedium: "Inter_500Medium",
  sansSemi: "Inter_600SemiBold",
  sansBold: "Inter_700Bold",
} as const;

export const typography = {
  // Display numerals
  display: {
    fontFamily: fontFamily.serif,
    fontSize: 48,
    lineHeight: 56,
    fontVariant: ["tabular-nums"],
  },
  displayNumber: {
    fontFamily: fontFamily.serif,
    fontSize: 40,
    lineHeight: 48,
    fontVariant: ["tabular-nums"],
  },
  statNumber: {
    fontFamily: fontFamily.serif,
    fontSize: 24,
    lineHeight: 30,
    fontVariant: ["tabular-nums"],
  },
  amount: {
    fontFamily: fontFamily.serif,
    fontSize: 18,
    lineHeight: 24,
    fontVariant: ["tabular-nums"],
  },

  // Headings
  screenTitle: { fontFamily: fontFamily.serif, fontSize: 26, lineHeight: 32 },
  title: { fontFamily: fontFamily.serif, fontSize: 22, lineHeight: 28 },
  cardTitle: { fontFamily: fontFamily.serif, fontSize: 18, lineHeight: 24 },

  // Body
  body: { fontFamily: fontFamily.sans, fontSize: 15, lineHeight: 22 },
  bodyMedium: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 15,
    lineHeight: 22,
  },
  bodyStrong: { fontFamily: fontFamily.sansSemi, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: fontFamily.sans, fontSize: 13, lineHeight: 18 },
  captionMedium: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 13,
    lineHeight: 18,
  },
  captionStrong: {
    fontFamily: fontFamily.sansSemi,
    fontSize: 13,
    lineHeight: 18,
  },

  // The wide uppercase caption that carries the whole design
  label: {
    fontFamily: fontFamily.sansBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  labelSmall: {
    fontFamily: fontFamily.sansBold,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },

  // Controls
  button: { fontFamily: fontFamily.sansBold, fontSize: 16, lineHeight: 22 },
  buttonSmall: {
    fontFamily: fontFamily.sansSemi,
    fontSize: 14,
    lineHeight: 20,
  },
} as const satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof typography;
