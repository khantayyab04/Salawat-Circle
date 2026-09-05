import { space } from "@/design-system";
import { parseEntryAmount } from "@/lib/entries";
import { useGroups } from "@/lib/groups";
import { useTranslation } from "@/localization";
import { Button, NumberField, Screen, SegmentedControl, Text } from "@/ui";
import { BottomSheet, Column, Host } from "@expo/ui";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

export function GroupManageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { groups, mutation, setGroupGoal } = useGroups();
  const group = groups.items.find((candidate) => candidate.id === id);
  const [goalSheetOpen, setGoalSheetOpen] = useState(false);
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string>();
  const saveGoal = async () => {
    if (!group) return;
    try {
      const parsedAmount = parseEntryAmount(amount);
      await setGroupGoal(group.id, period, parsedAmount, group.revision);
      setGoalSheetOpen(false);
      setAmount("");
      setError(undefined);
    } catch {
      try {
        parseEntryAmount(amount);
        setError(t("groupGoalSaveFailed"));
      } catch {
        setError(t("entryAmountInvalid"));
      }
    }
  };
  return (
    <Screen>
      <Text accessibilityRole="header" variant="largeTitle">
        {t("groupManage")}
      </Text>
      <Text variant="secondary">
        {t("groupTitle")}
      </Text>
      <View style={{ gap: space.sm }}>
        {group?.role === "owner" ? (
          <Button
            label={t("groupGoalSet")}
            onPress={() => setGoalSheetOpen(true)}
          />
        ) : null}
        <Button
          label={t("groupMembers")}
          onPress={() =>
            router.push({ pathname: "/groups/[id]/members", params: { id } })
          }
          variant="secondary"
        />
        <Button
          label={t("groupInvites")}
          onPress={() =>
            router.push({ pathname: "/groups/[id]/invites", params: { id } })
          }
          variant="secondary"
        />
      </View>
      <Host matchContents>
        <BottomSheet
          isPresented={goalSheetOpen}
          onDismiss={() => setGoalSheetOpen(false)}
          snapPoints={["half"]}
        >
          <Column spacing={16}>
            <Text variant="title">{t("groupGoalSet")}</Text>
            <SegmentedControl
              onChange={setPeriod}
              options={[
                { label: t("groupGoalWeek"), value: "week" },
                { label: t("groupGoalMonth"), value: "month" },
              ]}
              value={period}
            />
            <NumberField
              error={error}
              label={t("groupGoalAmount")}
              onChangeText={setAmount}
              value={amount}
            />
            <Button
              disabled={!amount.trim()}
              label={t("groupGoalSave")}
              loading={mutation.pending}
              onPress={() => void saveGoal()}
            />
          </Column>
        </BottomSheet>
      </Host>
    </Screen>
  );
}
