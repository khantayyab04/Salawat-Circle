import { SectionLabel } from "@/components/section-label";
import { radius, spacing, useAppTheme } from "@/theme";
import { Pressable, View, type ViewProps } from "react-native";

export type SegmentedOption<T extends string> = { value: T; label: string };

/**
 * The pill segmented control used for the Progress and Group detail periods.
 *
 * Every option takes an equal share of the row via `flex`, so four options fit
 * on a narrow phone just as well as three do on a wide one, and none of the
 * labels are ever cut off.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
  ...props
}: Omit<ViewProps, "children"> & {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { colors } = useAppTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={[
        {
          flexDirection: "row",
          backgroundColor: colors.surfaceMuted,
          borderRadius: radius.pill,
          borderCurve: "continuous",
          padding: spacing.xs,
          gap: spacing.xxs,
        },
        style,
      ]}
      {...props}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={{
              flex: 1,
              minHeight: 44,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: spacing.sm,
              borderRadius: radius.pill,
              borderCurve: "continuous",
              backgroundColor: selected ? colors.surface : "transparent",
            }}
          >
            <SectionLabel
              numberOfLines={1}
              tone={selected ? "primary" : "muted"}
            >
              {option.label}
            </SectionLabel>
          </Pressable>
        );
      })}
    </View>
  );
}
