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
}: {
  entry: Entry;
  showTime: boolean;
  onEdit(id: string): void;
  onDelete(id: string): void;
}) {
  const { t, localeTag } = useTranslation();
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
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <AppText variant="bodyStrong">
            {formatAppNumber(BigInt(entry.amount), localeTag)}
          </AppText>
          <AppText variant="caption">
            {entry.entryDate}
            {showTime
              ? ` · ${formatAppTime(
                  new Date(entry.recordedAtClient),
                  localeTag,
                  entry.timezone,
                )}`
              : ""}
          </AppText>
        </View>
        <View style={{ gap: spacing.sm }}>
          <AppButton
            label={t("entryEdit")}
            variant="secondary"
            onPress={() => onEdit(entry.id)}
          />
          <AppButton
            label={t("entryDelete")}
            variant="destructive"
            onPress={requestDelete}
          />
        </View>
      </View>
    </AppCard>
  );
}
