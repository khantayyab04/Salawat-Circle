import { AppButton, AppScreen, StateFeedback } from "@/components";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/localization";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";

type PendingInviteLookup =
  | {
      userId: string | null;
      revision: number;
      status: "ready";
      token: string | null;
    }
  | {
      userId: string | null;
      revision: number;
      status: "error";
    };

export default function IndexRoute() {
  const { t } = useTranslation();
  const { status, userId, peekPendingInvite } = useAuth();
  const [inviteLookup, setInviteLookup] = useState<PendingInviteLookup | null>(
    null,
  );
  const [inviteStorageRevision, setInviteStorageRevision] = useState(0);

  useEffect(() => {
    if (status !== "ready") return;
    let active = true;
    const requestUserId = userId;
    const requestRevision = inviteStorageRevision;
    void peekPendingInvite()
      .then((token) => {
        if (active) {
          setInviteLookup({
            userId: requestUserId,
            revision: requestRevision,
            status: "ready",
            token,
          });
        }
      })
      .catch(() => {
        if (active) {
          setInviteLookup({
            userId: requestUserId,
            revision: requestRevision,
            status: "error",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [inviteStorageRevision, peekPendingInvite, status, userId]);

  const currentInviteLookup =
    inviteLookup &&
    inviteLookup.userId === userId &&
    inviteLookup.revision === inviteStorageRevision
      ? inviteLookup
      : null;

  if (status === "loading") {
    return (
      <AppScreen contentContainerStyle={{ justifyContent: "center" }}>
        <StateFeedback state="loading" />
      </AppScreen>
    );
  }
  if (status === "signed_out") return <Redirect href="/welcome" />;
  if (status === "profile_required") {
    return <Redirect href="/onboarding/profile" />;
  }
  if (status === "consent_required") {
    return <Redirect href="/onboarding/consent" />;
  }
  if (currentInviteLookup?.status === "error") {
    return (
      <AppScreen contentContainerStyle={{ justifyContent: "center" }}>
        <StateFeedback state="error" />
        <AppButton
          label={t("joinStorageRetry")}
          onPress={() => {
            setInviteStorageRevision((current) => current + 1);
          }}
        />
      </AppScreen>
    );
  }
  if (!currentInviteLookup) {
    return (
      <AppScreen contentContainerStyle={{ justifyContent: "center" }}>
        <StateFeedback state="loading" />
      </AppScreen>
    );
  }
  if (currentInviteLookup.token) {
    return (
      <Redirect
        href={{
          pathname: "/join/[token]",
          params: { token: currentInviteLookup.token },
        }}
      />
    );
  }
  return <Redirect href="/today" />;
}
