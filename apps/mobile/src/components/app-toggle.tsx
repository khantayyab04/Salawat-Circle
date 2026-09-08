import { motion, useAppTheme } from "@/theme";
import { Pressable, View } from "react-native";

const TRACK_WIDTH = 50;
const TRACK_HEIGHT = 30;
const KNOB_SIZE = 24;
const KNOB_INSET = 3;

/**
 * The pill switch from the design.
 *
 * The visible track is 30 points tall, which is smaller than a comfortable
 * touch target, so the pressable itself is padded out to 44 points while the
 * track keeps its drawn size.
 */
export function AppToggle({
  value,
  onChange,
  accessibilityLabel,
  disabled = false,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onChange(!value)}
      style={{
        minHeight: 44,
        minWidth: 44,
        alignItems: "flex-end",
        justifyContent: "center",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <View
        style={{
          width: TRACK_WIDTH,
          height: TRACK_HEIGHT,
          borderRadius: TRACK_HEIGHT / 2,
          backgroundColor: value ? colors.primary : colors.surfaceMuted,
          justifyContent: "center",
          transitionProperty: ["backgroundColor"],
          transitionDuration: motion.fast,
        }}
      >
        <View
          style={{
            width: KNOB_SIZE,
            height: KNOB_SIZE,
            borderRadius: KNOB_SIZE / 2,
            backgroundColor: colors.surface,
            boxShadow: "0 1px 2px rgba(0,0,0,0.18)",
            transform: [
              {
                translateX: value
                  ? TRACK_WIDTH - KNOB_SIZE - KNOB_INSET
                  : KNOB_INSET,
              },
            ],
            transitionProperty: ["transform"],
            transitionDuration: motion.fast,
          }}
        />
      </View>
    </Pressable>
  );
}
