/**
 * Font families used by the type scale.
 *
 * The list is kept free of asset imports so it can be checked against
 * `typography` without pulling binary font files into a unit test. The actual
 * asset map lives in `fonts.assets.ts` and is only loaded by the app.
 */
export const FONT_FAMILIES = [
  "PlayfairDisplay_700Bold",
  "Inter_400Regular",
  "Inter_500Medium",
  "Inter_600SemiBold",
  "Inter_700Bold",
] as const;

export type FontFamilyName = (typeof FONT_FAMILIES)[number];

export type FontGate = { ready: boolean; usedFallback: boolean };

/**
 * Decides whether the app may render.
 *
 * A failed font load must never trap the user behind a splash screen, so the
 * app renders with system fonts instead. The caller is told so it can report
 * the problem.
 */
export function resolveFontGate(
  state: { loaded: boolean; error: Error | null },
  onError?: (error: Error) => void,
): FontGate {
  if (state.error) {
    onError?.(state.error);
    return { ready: true, usedFallback: true };
  }
  return { ready: state.loaded, usedFallback: false };
}
