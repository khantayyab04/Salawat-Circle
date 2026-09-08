/**
 * Layout helpers that keep the design intact across phone sizes.
 *
 * The Figma mockup is drawn at a single fixed width. Real devices range from
 * roughly 320 to 440 points, so anything that is visually load bearing (the
 * goal ring, the very large numerals, the tile grids) is derived from the
 * available width instead of being hard coded.
 */

export type SizeClass = "compact" | "regular" | "wide";

const COMPACT_MAX_WIDTH = 380;
const WIDE_MIN_WIDTH = 430;

export function sizeClassFor(width: number): SizeClass {
  if (width < COMPACT_MAX_WIDTH) return "compact";
  if (width >= WIDE_MIN_WIDTH) return "wide";
  return "regular";
}

export function pickBySize<T>(
  sizeClass: SizeClass,
  options: { compact: T; regular: T; wide?: T },
): T {
  if (sizeClass === "compact") return options.compact;
  if (sizeClass === "wide") return options.wide ?? options.regular;
  return options.regular;
}

/**
 * Average glyph width relative to the font size for the display typeface.
 * Digits, separators and the surrounding padding are covered by this factor,
 * which is deliberately slightly generous so values never touch their edges.
 */
const GLYPH_WIDTH_RATIO = 0.62;

const DEFAULT_MIN_FONT_SIZE = 24;

/**
 * Returns the largest font size at which `value` still fits into `maxWidth`.
 *
 * Amounts in this product reach ten million, and group totals go higher still.
 * Shrinking the numeral keeps the whole value readable, which matters far more
 * than holding on to the mockup's exact type size for the rare long value.
 */
export function fitNumericFontSize(
  value: string,
  options: {
    maxWidth: number;
    fontSize: number;
    minFontSize?: number;
  },
): number {
  const { maxWidth, fontSize } = options;
  const minFontSize = options.minFontSize ?? DEFAULT_MIN_FONT_SIZE;

  if (maxWidth <= 0 || value.length === 0) return fontSize;

  const requiredWidth = value.length * fontSize * GLYPH_WIDTH_RATIO;
  if (requiredWidth <= maxWidth) return fontSize;

  const scaled = maxWidth / (value.length * GLYPH_WIDTH_RATIO);
  return Math.max(minFontSize, Math.floor(scaled));
}
