import { AmountText } from "@/components/amount-text";
import { SectionLabel } from "@/components/section-label";
import { StatCard } from "@/components/stat-card";
import { Surface } from "@/components/surface";
import { motion, radius, spacing, useAppTheme } from "@/theme";
import { View } from "react-native";

export type GroupInsightsCopy = {
  goalPrefix: string;
  remaining: string;
  noGoal: string;
  groupPerDay: string;
  youPerDay: string;
  activeMembers: string;
  updated: string;
};

/**
 * The collective panel on the group detail screen: how far the circle is
 * towards its goal, and what that means per day for the group and for the
 * individual member.
 *
 * Every figure comes from the server. Nothing here identifies what a single
 * other member contributed.
 */
export function GroupInsightsPanel({
  copy,
  goalAmount,
  periodTotal,
  remaining,
  groupPerDay,
  perPersonPerDay,
  activeMembers,
  totalMembers,
  updatedLabel,
  updatedHint,
  goalPercent,
}: {
  copy: GroupInsightsCopy;
  /** Formatted goal, or null when the circle has not set one. */
  goalAmount: string | null;
  periodTotal: string;
  remaining: string | null;
  groupPerDay: string | null;
  perPersonPerDay: string | null;
  activeMembers: string;
  totalMembers: string | null;
  updatedLabel: string;
  /** The exact timestamp, kept available for assistive technology. */
  updatedHint?: string;
  /**
   * Progress towards the goal from 0 to 100, or null when there is no goal.
   * It is passed in rather than derived here because every value this
   * component receives is already formatted for display and can no longer be
   * used for arithmetic.
   */
  goalPercent: number | null;
}) {
  const { colors } = useAppTheme();

  const percent =
    goalPercent === null
      ? null
      : Math.min(100, Math.max(0, Math.round(goalPercent)));

  return (
    <View style={{ gap: spacing.md }}>
      <Surface style={{ alignItems: "center", gap: spacing.lg }}>
        <SectionLabel style={{ textAlign: "center" }}>
          {goalAmount === null
            ? copy.noGoal
            : `${copy.goalPrefix} ${goalAmount}`}
        </SectionLabel>

        <AmountText value={periodTotal} variant="displayNumber" />

        {percent === null ? null : (
          <View
            accessible
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: percent }}
            style={{
              width: "100%",
              height: 12,
              borderRadius: radius.pill,
              backgroundColor: colors.surfaceMuted,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: `${percent}%`,
                height: "100%",
                borderRadius: radius.pill,
                backgroundColor: colors.primary,
                transitionProperty: ["width"],
                transitionDuration: motion.slow,
              }}
            />
          </View>
        )}

        {remaining === null ? null : (
          <SectionLabel style={{ textAlign: "center" }} tone="gold">
            {`${remaining} ${copy.remaining}`}
          </SectionLabel>
        )}
      </Surface>

      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <StatCard
          align="center"
          caption={copy.groupPerDay}
          value={groupPerDay ?? "—"}
        />
        <StatCard
          align="center"
          caption={copy.youPerDay}
          tone="gold"
          value={perPersonPerDay ?? "—"}
        />
      </View>

      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <StatCard
          align="center"
          caption={copy.activeMembers}
          value={
            totalMembers === null
              ? activeMembers
              : `${activeMembers} / ${totalMembers}`
          }
        />
        <StatCard
          accessibilityLabel={`${copy.updated}: ${updatedHint ?? updatedLabel}`}
          align="center"
          caption={copy.updated}
          value={updatedLabel}
        />
      </View>
    </View>
  );
}
