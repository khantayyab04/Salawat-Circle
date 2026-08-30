import type { TextStyle } from "react-native";

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 9999 } as const;
export const motion = { fast: 150, base: 250 } as const;
export const typography = {
  caption: { fontSize: 13, lineHeight: 18, fontWeight: "400" },
  body: { fontSize: 17, lineHeight: 24, fontWeight: "400" },
  bodyStrong: { fontSize: 17, lineHeight: 24, fontWeight: "600" },
  title: { fontSize: 22, lineHeight: 28, fontWeight: "600" },
  displayNumber: {
    fontSize: 40,
    lineHeight: 48,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
} as const satisfies Record<string, TextStyle>;
export type TextVariant = keyof typeof typography;
