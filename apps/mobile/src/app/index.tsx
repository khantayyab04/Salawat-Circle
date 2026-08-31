import { AppScreen, StateFeedback } from "@/components";
import { useAuth } from "@/lib/auth";
import { Redirect } from "expo-router";

export default function IndexRoute() {
  const { status } = useAuth();
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
  return <Redirect href="/today" />;
}
