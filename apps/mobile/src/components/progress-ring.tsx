import { useAppTheme } from "@/theme";
import type { PropsWithChildren } from "react";
import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";

const STROKE_RATIO = 0.075;

/**
 * The goal ring on the Today screen.
 *
 * `size` is passed in by the screen from the measured width rather than being
 * hard coded, so the ring keeps its proportions on every phone. Progress is
 * clamped: a day far past its goal still draws a full ring, and a day with no
 * goal at all is shown as complete rather than empty.
 */
export function ProgressRing({
  progress,
  size,
  accessibilityLabel,
  testID,
  children,
}: PropsWithChildren<{
  progress: number | null;
  size: number;
  accessibilityLabel?: string;
  testID?: string;
}>) {
  const { colors } = useAppTheme();

  const ratio = progress === null ? 1 : Math.min(1, Math.max(0, progress));
  const percent = Math.round(ratio * 100);

  const strokeWidth = Math.max(6, Math.round(size * STROKE_RATIO));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
      testID={testID}
    >
      <Svg
        height={size}
        style={{ position: "absolute" }}
        width={size}
        // Start the arc at the top rather than at three o'clock.
        viewBox={`0 0 ${size} ${size}`}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          stroke={colors.surfaceMuted}
          strokeWidth={strokeWidth}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          origin={`${size / 2}, ${size / 2}`}
          r={radius}
          rotation={-90}
          stroke={colors.gold}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
        />
      </Svg>
      {children}
    </View>
  );
}
