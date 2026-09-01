import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/localization";
import { JoinScreen } from "@/screens/groups";
import { Redirect } from "expo-router";
import { Stack } from "expo-router/stack";

export default function JoinManualRoute() {
  const { status } = useAuth();
  const { t } = useTranslation();

  if (status === "loading") return null;
  if (status !== "ready") return <Redirect href="/" />;

  return (
    <>
      <Stack.Screen options={{ title: t("joinManualCodeTitle") }} />
      <JoinScreen allowManualCode />
    </>
  );
}
