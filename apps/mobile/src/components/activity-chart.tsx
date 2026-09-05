import { SectionLabel } from "@/components/section-label";
import { motion, radius, spacing, useAppTheme } from "@/theme";
import { View } from "react-native";

export type ActivityBar = {
  /** Short axis caption, for example a weekday initial or a quarter. */
  label: string;
  /** Bucket total as a string so very large sums stay exact. */
  total: string;
  /** Whether this bucket met its goal, or null when no goal applied. */
  goalReached: boolean | null;
  /** Marks the bucket the user is currently in. */
  current?: boolean;
};

const TRACK_HEIGHT = 120;

/**
 * The activity chart on the Progress screen.
 *
 * Bars are sized as a share of the tallest bucket rather than by an absolute
 * value, so the same component renders seven days, four or five weeks, four
 * quarters or a handful of years without any layout change. The track has a
 * fixed height but the bars share the width through `flex`.
 */
export function ActivityChart({
  bars,
  emptyLabel,
}: {
  bars: readonly ActivityBar[];
  emptyLabel: string;
}) {
  const { colors } = useAppTheme();

  const peak = bars.reduce((highest, bar) => {
    const value = BigInt(bar.total);
    return value > highest ? value : highest;
  }, 0n);

  if (bars.length === 0) {
    return <SectionLabel>{emptyLabel}</SectionLabel>;
  }

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-end",
        gap: spacing.sm,
      }}
    >
      {bars.map((bar, index) => {
        const value = BigInt(bar.total);
        // A bucket with any activity always shows a sliver, so "a little" is
        // never visually identical to "nothing".
        const share =
          peak === 0n
            ? 0
            : Number((value * 1000n) / peak) / 1000;
        const height =
          value === 0n ? 0 : Math.max(6, Math.round(share * TRACK_HEIGHT));

        const fill =
          bar.goalReached === false ? colors.gold : colors.primary;

        return (
          <View
            key={`${bar.label}-${index}`}
            style={{ flex: 1, alignItems: "center", gap: spacing.sm }}
          >
            <View
              style={{
                width: "100%",
                maxWidth: 22,
                height: TRACK_HEIGHT,
                borderRadius: radius.pill,
                backgroundColor: colors.surfaceMuted,
                justifyContent: "flex-end",
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  height,
                  borderRadius: radius.pill,
                  backgroundColor: fill,
                  opacity: bar.current ? 0.85 : 1,
                  transitionProperty: ["height"],
                  transitionDuration: motion.slow,
                }}
              />
            </View>
            <SectionLabel numberOfLines={1} size="small">
              {bar.label}
            </SectionLabel>
          </View>
        );
      })}
    </View>
  );
}
