import { typography, useAppTheme } from "@/theme";
import { Text, type TextProps, type TextStyle } from "react-native";

type DisplayVariant = "display" | "displayNumber" | "statNumber" | "amount";

/**
 * A numeric display value.
 *
 * Amounts in this product reach ten million, and group totals go higher. The
 * design puts these numbers at very large sizes, so on narrow phones — or with
 * an enlarged system font — a long value would otherwise be cut off. This
 * component shrinks the glyphs to fit instead, because a smaller number that
 * can be read completely is always better than a large one that is clipped.
 */
export function AmountText({
  value,
  variant = "displayNumber",
  color,
  style,
  ...props
}: Omit<TextProps, "children"> & {
  value: string;
  variant?: DisplayVariant;
  color?: string;
}) {
  const { colors } = useAppTheme();
  return (
    <Text
      // Shrink rather than truncate, and clip instead of adding an ellipsis so
      // a partially rendered number can never be mistaken for a real value.
      adjustsFontSizeToFit
      numberOfLines={1}
      ellipsizeMode="clip"
      // Display sizes are already large; unbounded system scaling would break
      // the layout without improving readability.
      maxFontSizeMultiplier={1.3}
      style={[
        typography[variant] as TextStyle,
        { color: color ?? colors.textPrimary },
        style,
      ]}
      {...props}
    >
      {value}
    </Text>
  );
}
