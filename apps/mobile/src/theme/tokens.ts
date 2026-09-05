import {
  motion as designMotion,
  radius as designRadius,
  space,
  typography as designTypography,
} from "@/design-system";

export const spacing = {
  xs: space.xs,
  sm: space.sm,
  md: space.md,
  lg: space.lg,
  xl: space.xxl,
  xxl: space.section,
  xxxl: space.page,
} as const;

export const radius = {
  sm: designRadius.small,
  md: designRadius.control,
  lg: designRadius.card,
  pill: designRadius.pill,
} as const;

export const motion = { fast: designMotion.state, base: designMotion.component } as const;

export const typography = {
  ...designTypography,
  bodyStrong: designTypography.headline,
  displayNumber: designTypography.display,
} as const;

export type TextVariant = keyof typeof typography;
