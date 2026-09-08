import { SectionLabel } from "@/components/section-label";
import { radius, spacing, useAppTheme } from "@/theme";
import { ScrollView, View } from "react-native";

export type ActivityBar = {
  /** Short axis caption, for example a weekday initial or a quarter. */
  label: string;
  /** Bucket total as a string so very large sums stay exact. */
  total: string;
  /** Sum of the historical goals in the elapsed part of this bucket. */
  goalTotal: string | null;
  /** Whether this bucket met its goal, or null when no goal applied. */
  goalReached: boolean | null;
  /** Marks the bucket the user is currently in. */
  current?: boolean;
  future?: boolean;
};

const TRACK_HEIGHT = 120;

/**
 * The activity chart on the Progress screen.
 *
 * Each track represents its bucket goal. Filling by the same goal ratio keeps
 * half-complete periods comparable even when the underlying goal amounts differ.
 * Goal-free periods retain an exact accessible amount without inventing a target.
 */
export function ActivityChart({
  bars,
  emptyLabel,
  statusLabels,
}: {
  bars: readonly ActivityBar[];
  emptyLabel: string;
  statusLabels: { reached: string; below: string; recorded: string; future: string; current: string };
}) {
  const { colors } = useAppTheme();

  if (bars.length === 0) {
    return <SectionLabel>{emptyLabel}</SectionLabel>;
  }

  return (
    <View style={{ gap: spacing.md }}>
    <ScrollView horizontal contentContainerStyle={{ flexGrow: 1 }} showsHorizontalScrollIndicator={bars.length > 7}>
    <View
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "flex-end",
        gap: spacing.sm,
      }}
    >
      {bars.map((bar, index) => {
        const value = BigInt(bar.total);
        const goal = bar.goalTotal === null ? null : BigInt(bar.goalTotal);
        const hasGoal = goal !== null && goal > 0n && !bar.future;
        const reached = hasGoal && value >= goal;
        const share = hasGoal ? Number((value >= goal ? 1000n : value * 1000n / goal)) / 1000 : 0;
        const height = Math.round(share * TRACK_HEIGHT);
        const fill = reached ? colors.gold : colors.primary;
        const status = bar.future ? statusLabels.future
          : !hasGoal ? statusLabels.recorded
          : reached ? statusLabels.reached : statusLabels.below;

        return (
          <View
            key={`${bar.label}-${index}`}
            accessible
            accessibilityLabel={`${bar.label}: ${bar.future ? "—" : bar.total}, ${status}${bar.current ? `, ${statusLabels.current}` : ""}`}
            style={{ flex: 1, minWidth: 32, alignItems: "center", gap: spacing.sm }}
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
                }}
              />
            </View>
            <SectionLabel size="small">
              {bar.label}
            </SectionLabel>
          </View>
        );
      })}
    </View>
    </ScrollView>
    </View>
  );
}
