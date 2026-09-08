import {
  AppButton,
  AppCard,
  AppScreen,
  AppText,
  FormField,
  OfflineLoadErrorCard,
  OfflineRecoveryCard,
  StateFeedback,
} from "@/components";
import { CalendarDateField } from "@/components/calendar-date-field";
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

export function EntryEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const entries = useEntries();
  const { t } = useTranslation();
  const router = useRouter();
  const returnToToday = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/today");
  };

  if (entries.offlineLoadErrorCode === "INVALID_OFFLINE_STATE") {
    return (
      <AppScreen>
        <OfflineRecoveryCard
          busy={entries.busy}
          onReset={entries.resetOfflineState}
        />
        <AppButton label={t("commonBack")} variant="secondary" onPress={returnToToday} />
      </AppScreen>
    );
  }

  if (entries.offlineLoadErrorCode === "INTERNAL") {
    return (
      <AppScreen>
        <OfflineLoadErrorCard
          busy={entries.busy}
          onRetry={entries.retryOfflineLoad}
        />
        <AppButton label={t("commonBack")} variant="secondary" onPress={returnToToday} />
      </AppScreen>
    );
  }

  const entry = entries.entries.find((candidate) => candidate.id === id);

  if (!entry) {
    return (
      <AppScreen>
        <StateFeedback state="error" />
        <AppButton label={t("commonBack")} variant="secondary" onPress={returnToToday} />
      </AppScreen>
    );
  }

  return <EntryEditForm key={entry.id} entry={entry} />;
}

export function EntryEditForm({ entry, inline = false, onSaved, onCancel }: {
  entry: ReturnType<typeof useEntries>["entries"][number];
  inline?: boolean;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const entries = useEntries();
  const [baseRevision, setBaseRevision] = useState(entry.revision);
  const changed = entry.revision !== baseRevision;
  const [saving, setSaving] = useState(false);
  const locked = entries.busy || saving;
  const [amount, setAmount] = useState(entry.amount);
  const [entryDate, setEntryDate] = useState(entry.entryDate);
  const [error, setError] = useState<string | undefined>();
  const conflict = entries.conflicts.find(
    (candidate) => candidate.entryId === entry.id,
  ) ?? null;

  const today = getPersonalDate(new Date(), entries.timeZone);

  const save = async () => {
    if (locked || changed) return;
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
    setSaving(true);
    try {
      await entries.update(entry.id, parsedAmount, entryDate);
      if (onSaved) onSaved();
      else if (router.canGoBack()) router.back();
      else router.replace("/today");
    } catch {
      setError(
        entries.conflictEntryId === entry.id
          ? t("entryConflict")
          : t("entrySaveFailed"),
      );
    } finally {
      setSaving(false);
    }
  };

  const content = (
    <>
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
            disabled={locked}
            label={t("entryConflictKeepServer")}
            variant="secondary"
            onPress={() => void entries.keepServerVersion(entry.id)}
          />
          <AppButton
            disabled={locked}
            label={t("entryConflictReapply")}
            onPress={() => void entries.reapplyConflict(entry.id)}
          />
        </AppCard>
      ) : (
        <View style={{ gap: spacing.md }}>
          {changed ? <AppCard>
            <AppText accessibilityRole="alert">{t("entryChangedNotice")}</AppText>
            <AppButton label={t("entryUseLatest")} variant="secondary" disabled={locked} onPress={() => {
              setAmount(entry.amount); setEntryDate(entry.entryDate); setBaseRevision(entry.revision);
            }} />
            <AppButton label={t("entryKeepDraft")} variant="secondary" disabled={locked} onPress={() => setBaseRevision(entry.revision)} />
          </AppCard> : null}
          <FormField
            editable={!locked}
            keyboardType="number-pad"
            label={t("entryAmountLabel")}
            value={amount}
            error={error}
            onChangeText={setAmount}
          />
          <CalendarDateField
            disabled={locked}
            label={t("entryDateLabel")}
            value={entryDate}
            onChange={setEntryDate}
            minimumDate={new Date(new Date(`${today}T00:00:00Z`).getTime() - 365 * 86_400_000).toISOString().slice(0, 10)}
            maximumDate={today}
          />
          <AppButton
            disabled={changed || !amount.trim() || !entryDate.trim()}
            label={t("commonSave")}
            loading={locked}
            onPress={() => void save()}
          />
          {onCancel ? <AppButton label={t("commonCancel")} variant="secondary" disabled={locked} onPress={onCancel} /> : null}
        </View>
      )}
    </>
  );
  return inline ? content : <AppScreen><AppCard>{content}</AppCard></AppScreen>;
}
