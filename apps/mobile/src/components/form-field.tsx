import { radius, spacing, typography, useAppTheme } from "@/theme";
import { useId } from "react";
import { Text, TextInput, View, type TextInputProps } from "react-native";
export function FormField({
  label,
  hint,
  error,
  style,
  ...props
}: TextInputProps & { label: string; hint?: string; error?: string }) {
  const { colors } = useAppTheme();
  const id = useId();
  return (
    <View style={{ gap: spacing.sm }}>
      <Text
        nativeID={`${id}-label`}
        style={[typography.bodyStrong, { color: colors.textPrimary }]}
      >
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityLabelledBy={`${id}-label`}
        accessibilityHint={error ?? hint}
        placeholderTextColor={colors.textDisabled}
        style={[
          typography.body,
          {
            minHeight: 56,
            lineHeight: undefined,
            textAlignVertical: "center",
            includeFontPadding: false,
            color: colors.textPrimary,
            backgroundColor: colors.surface,
            borderColor: error ? colors.error : colors.border,
            borderWidth: 1,
            borderRadius: radius.xl,
            borderCurve: "continuous",
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm,
          },
          style,
        ]}
        {...props}
      />
      {(error ?? hint) ? (
        <Text
          accessibilityLiveRegion={error ? "polite" : "none"}
          style={[
            typography.caption,
            { color: error ? colors.error : colors.textSecondary },
          ]}
        >
          {error ?? hint}
        </Text>
      ) : null}
    </View>
  );
}
