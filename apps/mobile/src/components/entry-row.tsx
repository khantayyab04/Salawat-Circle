import type { ReactNode } from "react";
import type { Entry } from "@/lib/entries";
import { formatAppNumber, formatAppTime, useTranslation } from "@/localization";
import { spacing } from "@/theme";
import { Alert, View } from "react-native";
import { AppButton } from "./app-button";
import { AppCard } from "./app-card";
import { AppText } from "./app-text";

export function EntryRow({
  entry,
  showTime,
  onEdit,
  onDelete,
  disabled = false,
  editor,
}: {
  entry: Entry;
  editor?: ReactNode;
  disabled?: boolean;
  showTime: boolean;
  onEdit(id: string): void;
  onDelete(id: string): void;
}) {
  const { t, localeTag } = useTranslation();
  const hasConflict = entry.localState === "conflict";
  const syncLabel =
    entry.localState === "failed"
      ? t("entrySyncFailed")
      : entry.localState === "conflict"
        ? t("entrySyncConflict")
        : entry.localState?.startsWith("pending_")
          ? t("entrySyncPending")
          : null;
  const requestDelete = () =>
    Alert.alert(t("entryDeleteTitle"), t("entryDeleteBody"), [
      { text: t("commonCancel"), style: "cancel" },
      {
        text: t("entryDeleteConfirm"),
        style: "destructive",
        onPress: () => onDelete(entry.id),
      },
    ]);

  return (
    <AppCard>
      {editor ?? <View style={{ gap: spacing.md }}>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <AppText variant="bodyStrong">
            {formatAppNumber(BigInt(entry.amount), localeTag)}
          </AppText>
          <AppText variant="caption">
            {new Date(`${entry.entryDate}T12:00:00Z`).toLocaleDateString(localeTag, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}
            {showTime
              ? ` · ${formatAppTime(
                  new Date(entry.recordedAtClient),
                  localeTag,
                  entry.timezone,
                )}`
              : ""}
          </AppText>
          {syncLabel ? (
            <AppText accessibilityLiveRegion="polite" variant="caption">
              {syncLabel}
            </AppText>
          ) : null}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <AppButton
            disabled={disabled}
            style={{ flex: 1 }}
            label={hasConflict ? t("entryResolveConflict") : t("entryEdit")}
            variant="secondary"
            onPress={() => onEdit(entry.id)}
          />
          <AppButton
            disabled={disabled || hasConflict}
            style={{ flex: 1 }}
            label={t("entryDelete")}
            variant="destructive"
            onPress={requestDelete}
          />
        </View>
      </View>}
    </AppCard>
  );
}
