import { useAppTheme, typography, type TextVariant } from "@/theme";
import { Text, type TextProps } from "react-native";

export function AppText({
  variant = "body",
  style,
  ...props
}: TextProps & { variant?: TextVariant }) {
  const { colors } = useAppTheme();
  return (
    <Text
      selectable={props.selectable ?? true}
      style={[typography[variant], { color: colors.textPrimary }, style]}
      {...props}
    />
  );
}
