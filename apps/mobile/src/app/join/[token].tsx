import { AppScreen, StateFeedback } from "@/components";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/localization";
import { JoinScreen } from "@/screens/main";
import { Redirect, useLocalSearchParams } from "expo-router";
import { Stack } from "expo-router/stack";
import { useEffect, useState } from "react";

export default function JoinRoute() {
  const { t } = useTranslation();
  const { status, rememberInvite } = useAuth();
  const { token: tokenParam } = useLocalSearchParams<{ token?: string | string[] }>();
  const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;
  const [stored, setStored] = useState(status === "ready");
  const [storeFailed, setStoreFailed] = useState(false);

  useEffect(() => {
    let active = true;
    if (status === "loading" || status === "ready" || !token) {
      return () => {
        active = false;
      };
    }
    void rememberInvite(token)
      .then(() => {
        if (active) setStored(true);
      })
      .catch(() => {
        if (active) setStoreFailed(true);
      });
    return () => {
      active = false;
    };
  }, [rememberInvite, status, token]);

  if (status === "loading") return null;
  if (status !== "ready") {
    if (storeFailed) {
      return (
        <AppScreen contentContainerStyle={{ justifyContent: "center" }}>
          <StateFeedback state="error" />
        </AppScreen>
      );
    }
    return stored || !token ? <Redirect href="/" /> : null;
  }
  return (
    <>
      <Stack.Screen options={{ title: t("joinTitle") }} />
      <JoinScreen />
    </>
  );
}
