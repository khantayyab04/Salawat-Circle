import type { TextStyle } from "react-native";

export const space = {
  none: 0,
  hairline: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  section: 32,
  display: 40,
  page: 48,
  hero: 64,
} as const;

export const radius = {
  small: 8,
  control: 12,
  card: 16,
  sheet: 28,
  pill: 9999,
} as const;

export const motion = {
  state: 120,
  component: 200,
  sheet: 320,
} as const;

export const typography = {
  display: {
    fontSize: 40,
    lineHeight: 48,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  largeTitle: { fontSize: 32, lineHeight: 39, fontWeight: "700" },
  title: { fontSize: 22, lineHeight: 28, fontWeight: "700" },
  headline: { fontSize: 17, lineHeight: 23, fontWeight: "600" },
  body: { fontSize: 17, lineHeight: 25, fontWeight: "400" },
  secondary: { fontSize: 15, lineHeight: 21, fontWeight: "400" },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: "400" },
  label: { fontSize: 15, lineHeight: 20, fontWeight: "600" },
} as const satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof typography;
