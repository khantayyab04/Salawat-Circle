import {
  AppButton,
  AppCard,
  AppScreen,
  AppText,
  FormField,
  StateFeedback,
} from "@/components";
import {
  getPersonalDate,
  isEntryDateAllowed,
  parseEntryAmount,
  useEntries,
} from "@/lib/entries";
import { useTranslation } from "@/localization";
import { spacing } from "@/theme";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

function previousDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function EntryEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const entries = useEntries();
  const entry = entries.entries.find((candidate) => candidate.id === id);

  if (!entry) {
    return (
      <AppScreen>
        <StateFeedback state="error" />
      </AppScreen>
    );
  }

  return <EntryEditForm key={`${entry.id}:${entry.revision}`} entry={entry} />;
}

function EntryEditForm({ entry }: { entry: ReturnType<typeof useEntries>["entries"][number] }) {
  const { t } = useTranslation();
  const router = useRouter();
  const entries = useEntries();
  const [amount, setAmount] = useState(entry.amount);
  const [entryDate, setEntryDate] = useState(entry.entryDate);
  const [error, setError] = useState<string | undefined>();
  const conflict =
    entries.conflict?.entryId === entry.id ? entries.conflict : null;

  const today = getPersonalDate(new Date(), entries.timeZone);

  const save = async () => {
    let parsedAmount: number;
    try {
      parsedAmount = parseEntryAmount(amount);
    } catch {
      setError(t("entryAmountInvalid"));
      return;
    }
    if (!isEntryDateAllowed(entryDate, today)) {
      setError(t("entryDateInvalid"));
      return;
    }
    setError(undefined);
    try {
      await entries.update(entry.id, parsedAmount, entryDate);
      router.back();
    } catch {
      setError(
        entries.conflictEntryId === entry.id
          ? t("entryConflict")
          : t("entrySaveFailed"),
      );
    }
  };

  return (
    <AppScreen>
      <FormField
        keyboardType="number-pad"
        label={t("entryAmountLabel")}
        value={amount}
        error={error}
        onChangeText={setAmount}
      />
      <FormField
        autoCapitalize="none"
        label={t("entryDateLabel")}
        value={entryDate}
        onChangeText={setEntryDate}
      />
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <AppButton
          label={t("entryToday")}
          variant="secondary"
          onPress={() => setEntryDate(today)}
          style={{ flex: 1 }}
        />
        <AppButton
          label={t("entryYesterday")}
          variant="secondary"
          onPress={() => setEntryDate(previousDate(today))}
          style={{ flex: 1 }}
        />
      </View>
      {conflict ? (
        <AppCard>
          <AppText accessibilityLiveRegion="polite" variant="bodyStrong">
            {conflict.operation === "delete"
              ? t("entryDeleteConflict")
              : t("entryConflict")}
          </AppText>
          <AppText>
            {`${t("entryConflictServer")}: ${conflict.serverEntry.amount} · ${
              conflict.serverEntry.entryDate
            }`}
          </AppText>
          <AppText>
            {`${t("entryConflictLocal")}: ${conflict.localAmount} · ${
              conflict.localEntryDate
            }`}
          </AppText>
          <AppButton
            label={t("entryConflictKeepServer")}
            variant="secondary"
            onPress={() => void entries.keepServerVersion()}
          />
          <AppButton
            label={t("entryConflictReapply")}
            onPress={() => void entries.reapplyConflict()}
          />
        </AppCard>
      ) : (
        <AppButton
          disabled={!amount.trim() || !entryDate.trim()}
          label={t("commonSave")}
          loading={entries.busy}
          onPress={() => void save()}
        />
      )}
    </AppScreen>
  );
}
