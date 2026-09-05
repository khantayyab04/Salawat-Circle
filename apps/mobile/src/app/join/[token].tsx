import { AppButton, AppScreen, StateFeedback } from "@/ui";
import { useAuth } from "@/lib/auth";
import { normalizeTokenInvite } from "@/lib/groups";
import { useTranslation } from "@/localization";
import { JoinScreen } from "@/screens/groups";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { Stack } from "expo-router/stack";
import { useEffect, useState } from "react";

function readValidatedTokenParam(value: string | string[] | undefined) {
  if (typeof value === "string") return normalizeTokenInvite(value);
  if (Array.isArray(value) && value.length === 1 && typeof value[0] === "string") {
    return normalizeTokenInvite(value[0]);
  }
  return null;
}

export default function JoinRoute() {
  const { t } = useTranslation();
  const { replace } = useRouter();
  const { status, rememberInvite } = useAuth();
  const { token: tokenParam } = useLocalSearchParams<{ token?: string | string[] }>();
  const token = readValidatedTokenParam(tokenParam);
  const [stored, setStored] = useState(!token);
  const [storeFailed, setStoreFailed] = useState(false);
  const [storeRevision, setStoreRevision] = useState(0);

  useEffect(() => {
    let active = true;
    if (status === "loading" || !token) {
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
  }, [rememberInvite, status, storeRevision, token]);

  if (status === "loading") return null;
  if (status === "ready" && (stored || !token)) {
    return (
      <>
        <Stack.Screen options={{ title: t("joinTitle") }} />
        <JoinScreen
          initialSecret={token ? { kind: "token", secret: token } : null}
          invalidRouteSecret={!token}
        />
      </>
    );
  }
  if (storeFailed) {
    return (
      <AppScreen contentContainerStyle={{ justifyContent: "center" }}>
        <StateFeedback state="error" />
        <AppButton
          label={t("joinStorageRetry")}
          onPress={() => {
            setStoreFailed(false);
            setStoreRevision((current) => current + 1);
          }}
        />
        <AppButton
          label={t("joinExitAction")}
          variant="secondary"
          onPress={() => replace(status === "ready" ? "/today" : "/")}
        />
      </AppScreen>
    );
  }
  if (!stored && token) return null;
  return stored || !token ? <Redirect href="/" /> : null;
}
