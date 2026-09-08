import { AppButton, AppText, EntryRow, OfflineLoadErrorCard, OfflineRecoveryCard, StateFeedback } from "@/components";
import { AppHeader } from "@/components/app-header";
import { EntryEditForm } from "@/screens/entry";
import { useEntries } from "@/lib/entries";
import { useTranslation } from "@/localization";
import { spacing, useAppTheme } from "@/theme";
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function HistoryScreen() {
  const entries = useEntries();
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const goBackToProgress = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/progress");
  };
  const remove = async (id: string) => {
    setDeleteFailed(false);
    try { await entries.delete(id); } catch { setDeleteFailed(true); }
  };
  const refresh = async () => {
    setRefreshing(true);
    try { await entries.refresh(); } finally { setRefreshing(false); }
  };
  const dates = new Map<string, number>();
  for (const entry of entries.entries) dates.set(entry.entryDate, (dates.get(entry.entryDate) ?? 0) + 1);
  const recovery = entries.offlineLoadErrorCode === "INVALID_OFFLINE_STATE"
    ? <OfflineRecoveryCard busy={entries.busy} onReset={entries.resetOfflineState} />
    : entries.offlineLoadErrorCode === "INTERNAL"
      ? <OfflineLoadErrorCard busy={entries.busy} onRetry={entries.retryOfflineLoad} /> : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader title={t("todayHistory")} subtitle={t("historySubtitle")} onBack={goBackToProgress} backLabel={t("commonBack")} />
      <FlatList
        data={entries.viewState === "error" || recovery ? [] : entries.entries}
        keyExtractor={entry => entry.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 + insets.bottom, gap: spacing.md, maxWidth: 720, width: "100%", alignSelf: "center" }}
        refreshing={refreshing}
        onRefresh={() => void refresh()}
        ListHeaderComponent={deleteFailed ? <AppText accessibilityRole="alert">{t("entryDeleteFailed")}</AppText> : null}
        renderItem={({ item }) => (
          <EntryRow entry={item} showTime={(dates.get(item.entryDate) ?? 0) > 1}
            disabled={entries.busy}
            editor={editingId === item.id ? <EntryEditForm entry={item} inline onSaved={() => setEditingId(null)} onCancel={() => setEditingId(null)} /> : undefined}
            onEdit={id => item.localState === "conflict" ? router.push({ pathname: "/entry/[id]/edit", params: { id } }) : setEditingId(id)}
            onDelete={id => void remove(id)} />
        )}
        ListEmptyComponent={recovery ?? (entries.viewState === "loading" ? <StateFeedback state="loading" /> : entries.viewState === "error" ? (
          <View style={{ gap: spacing.md }}><StateFeedback state="error" /><AppButton label={t("commonRetry")} onPress={() => void refresh()} loading={refreshing} /></View>
        ) : <AppText>{t("todayHistoryEmpty")}</AppText>)}
        ListFooterComponent={entries.entries.length > 0 && !recovery && entries.viewState !== "error" ? (
          <View style={{ gap: spacing.md }}>
            {entries.paginationError ? <AppText accessibilityRole="alert">{t("historyLoadFailed")}</AppText> : null}
            {entries.hasMore ? <AppButton label={t("historyLoadMore")} loading={entries.loadingMore} disabled={entries.busy} variant="secondary" onPress={() => void entries.loadMore()} /> : <AppText variant="caption">{t("historyEnd")}</AppText>}
          </View>
        ) : null}
      />
    </View>
  );
}
