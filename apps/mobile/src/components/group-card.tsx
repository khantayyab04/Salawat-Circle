import { AmountText } from "@/components/amount-text";
import { SectionLabel } from "@/components/section-label";
import { Surface } from "@/components/surface";
import { radius, spacing, typography, useAppTheme } from "@/theme";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import Users from "lucide-react-native/icons/users";
import { Pressable, Text, View } from "react-native";

/**
 * One circle in the groups list.
 *
 * The row answers the important questions before it is opened: what the circle
 * is called, how many members are active, where the user ranks, and how much
 * they contributed this period.
 */
export function GroupCard({
  name,
  membersLabel,
  rankLabel,
  contributionLabel,
  contribution,
  onPress,
  openLabel,
  anonymityLabel,
  detailsLabel,
}: {
  name: string;
  membersLabel: string;
  /** The formatted rank, or null when the user has no rank yet. */
  rankLabel: string | null;
  contributionLabel: string;
  contribution: string;
  onPress: () => void;
  openLabel: string;
  /**
   * Whether the ranking shows display names or aliases. This is privacy
   * relevant, so it stays visible in the list rather than only in the detail.
   */
  anonymityLabel: string;
  /** Extra context for assistive technology, such as when data was updated. */
  detailsLabel?: string;
}) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      accessibilityHint={detailsLabel}
      accessibilityLabel={openLabel}
      accessibilityRole="button"
      onPress={onPress}
    >
      <Surface style={{ gap: spacing.lg }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            gap: spacing.md,
          }}
        >
          <View style={{ flex: 1, gap: spacing.sm }}>
            <Text
              numberOfLines={2}
              style={[typography.title, { color: colors.textPrimary }]}
            >
              {name}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.sm,
              }}
            >
              <Users color={colors.goldText} size={12} />
              <SectionLabel style={{ flex: 1 }} tone="gold">
                {membersLabel}
              </SectionLabel>
            </View>
          </View>

          <View
            style={{
              minWidth: 48,
              minHeight: 48,
              paddingHorizontal: spacing.sm,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: radius.lg,
              borderCurve: "continuous",
              borderColor: colors.border,
              borderWidth: 1,
              backgroundColor: colors.surfaceMuted,
            }}
          >
            <AmountText
              color={colors.primary}
              value={rankLabel ?? "–"}
              variant="amount"
            />
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.md,
            padding: spacing.lg,
            borderRadius: radius.xl,
            borderCurve: "continuous",
            borderColor: colors.border,
            borderWidth: 1,
            backgroundColor: colors.surfaceSubtle,
          }}
        >
          <View style={{ flex: 1, gap: spacing.xs }}>
            <SectionLabel size="small">{contributionLabel}</SectionLabel>
            <AmountText value={contribution} variant="amount" />
          </View>
          <View
            style={{
              width: 32,
              height: 32,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: radius.pill,
              backgroundColor: colors.surface,
            }}
          >
            <ChevronRight color={colors.textPrimary} size={16} />
          </View>
        </View>

        <SectionLabel size="small">{anonymityLabel}</SectionLabel>
      </Surface>
    </Pressable>
  );
}
