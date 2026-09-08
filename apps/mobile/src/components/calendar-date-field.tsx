import NativeDateTimePicker from "@expo/ui/community/datetime-picker";
import { useTranslation } from "@/localization";
import { radius, spacing, useAppTheme } from "@/theme";
import { CalendarDays } from "lucide-react-native";
import { createElement, useState, type ChangeEvent } from "react";
import { Platform, Pressable, View } from "react-native";
import { AppText } from "./app-text";

export type CalendarDateFieldProps = {
  label: string;
  value: string;
  onChange(value: string): void;
  minimumDate?: string;
  maximumDate?: string;
  disabled?: boolean;
};

// These are calendar dates, not instants. Android's calendar uses UTC dates;
// fixing iOS to UTC keeps both platforms independent of the device time zone.
const pickerDate = (value: string) => new Date(`${value}T00:00:00.000Z`);

export function CalendarDateField({ label, value, onChange, minimumDate, maximumDate, disabled = false }: CalendarDateFieldProps) {
  const { localeTag, t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const [open, setOpen] = useState(false);
  if (Platform.OS === "web") {
    return <View style={{ gap: spacing.sm }}>
      <AppText variant="bodyStrong">{label}</AppText>
      {createElement("input", {
        type: "date", "aria-label": label, value, min: minimumDate, max: maximumDate, disabled,
        onChange: (event: ChangeEvent<HTMLInputElement>) => {
          const selected = event.currentTarget.value;
          const date = pickerDate(selected);
          if (!/^\d{4}-\d{2}-\d{2}$/u.test(selected) || !Number.isFinite(date.getTime()) ||
            date.toISOString().slice(0, 10) !== selected ||
            (minimumDate && selected < minimumDate) || (maximumDate && selected > maximumDate)) return;
          onChange(selected);
        },
        style: { minHeight: 56, minWidth: 0, boxSizing: "border-box", width: "100%", font: "inherit",
          fontSize: 16, padding: spacing.md, borderRadius: radius.xl, border: `1px solid ${colors.border}`,
          backgroundColor: colors.surface, color: colors.textPrimary, colorScheme: isDark ? "dark" : "light" },
      })}
    </View>;
  }
  const formatted = pickerDate(value).toLocaleDateString(localeTag, {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });
  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="bodyStrong">{label}</AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: formatted }}
        accessibilityState={{ disabled, expanded: open }}
        disabled={disabled}
        onPress={() => setOpen(value => !value)}
        style={{ minHeight: 56, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
          borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border,
          backgroundColor: colors.surface, flexDirection: "row", alignItems: "center", gap: spacing.md, opacity: disabled ? 0.5 : 1 }}
      >
        <AppText style={{ flex: 1 }}>{formatted}</AppText>
        <CalendarDays size={20} color={colors.textSecondary} strokeWidth={1.5} />
      </Pressable>
      {open && !disabled ? <NativeDateTimePicker
        testID="calendar-date-picker"
        value={pickerDate(value)}
        mode="date"
        display="inline"
        locale={localeTag}
        timeZoneName="UTC"
        themeVariant={isDark ? "dark" : "light"}
        accentColor={colors.primary}
        minimumDate={minimumDate ? pickerDate(minimumDate) : undefined}
        maximumDate={maximumDate ? pickerDate(maximumDate) : undefined}
        positiveButton={{ label: t("commonSave") }}
        negativeButton={{ label: t("commonCancel") }}
        onDismiss={() => setOpen(false)}
        onValueChange={(_event, selected) => {
          onChange(selected.toISOString().slice(0, 10));
          setOpen(false);
        }}
      /> : null}
    </View>
  );
}
