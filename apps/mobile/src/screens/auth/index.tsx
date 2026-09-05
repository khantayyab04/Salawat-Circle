import {
  AppButton,
  AppCard,
  AppScreen,
  AppText,
  FormField,
  SectionLabel,
  Surface,
} from "@/components";
import { useAuth } from "@/lib/auth";
import {
  parseDisplayName,
  parseEmail,
  parseOtp,
  parseTimeZone,
} from "@/lib/auth/validation";
import { useTranslation } from "@/localization";
import { radius, spacing, typography, useAppTheme } from "@/theme";
import { Host, Checkbox } from "@expo/ui";
import { Redirect, useRouter } from "expo-router";
import Heart from "lucide-react-native/icons/heart";
import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";

export function WelcomeScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const router = useRouter();

  return (
    <AppScreen contentContainerStyle={{ justifyContent: "center" }}>
      <View style={{ alignItems: "center", gap: spacing.xl }}>
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: radius.pill,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.primary,
          }}
        >
          <Heart color={colors.gold} fill={colors.gold} size={36} />
        </View>
        <Text
          accessibilityRole="header"
          style={[
            typography.screenTitle,
            { color: colors.textPrimary, textAlign: "center" },
          ]}
        >
          {t("appName")}
        </Text>
      </View>

      <Surface style={{ gap: spacing.lg, marginTop: spacing.section }}>
        <SectionLabel tone="gold">{t("welcomeEyebrow")}</SectionLabel>
        <Text style={[typography.title, { color: colors.textPrimary }]}>
          {t("welcomeTitle")}
        </Text>
        <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>
          {t("welcomeBody")}
        </Text>
      </Surface>

      <AppButton
        label={t("welcomeAction")}
        onPress={() => router.push("/auth/email")}
      />
    </AppScreen>
  );
}

export function EmailScreen() {
  const { t } = useTranslation();
  const auth = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const emailValid = useMemo(() => {
    try {
      parseEmail(email);
      return true;
    } catch {
      return false;
    }
  }, [email]);
  const handleSubmit = async () => {
    try {
      await auth.requestOtp(email);
      router.push("/auth/code");
    } catch {
      // The provider exposes only stable, non-enumerating error codes.
    }
  };
  return (
    <AppScreen>
      <FormField
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        label={t("authEmailLabel")}
        hint={t("authEmailHint")}
        error={email.length > 0 && !emailValid ? t("authEmailInvalid") : undefined}
        value={email}
        onChangeText={(value) => {
          auth.clearError();
          setEmail(value);
        }}
      />
      {auth.errorCode === "OTP_REQUEST_FAILED" ? (
        <AppText accessibilityLiveRegion="polite">
          {t("authRequestFailed")}
        </AppText>
      ) : null}
      <AppButton
        disabled={!emailValid}
        label={t("authEmailAction")}
        loading={auth.busy}
        onPress={() => void handleSubmit()}
      />
    </AppScreen>
  );
}

export function CodeScreen() {
  const { t } = useTranslation();
  const auth = useAuth();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [secondsRemaining, setSecondsRemaining] = useState(
    auth.nextOtpRequestAt ? 60 : 0,
  );
  useEffect(() => {
    if (!auth.nextOtpRequestAt) return;
    const timer = setInterval(
      () =>
        setSecondsRemaining(
          Math.max(
            0,
            Math.ceil((auth.nextOtpRequestAt! - Date.now()) / 1_000),
          ),
        ),
      1_000,
    );
    return () => clearInterval(timer);
  }, [auth.nextOtpRequestAt]);
  if (!auth.pendingEmail) return <Redirect href="/auth/email" />;
  const codeValid = (() => {
    try {
      parseOtp(code);
      return true;
    } catch {
      return false;
    }
  })();
  const handleVerify = async () => {
    try {
      const nextStatus = await auth.verifyOtp(code);
      if (nextStatus === "ready") {
        const inviteToken = await auth.peekPendingInvite().catch(() => null);
        router.replace(
          inviteToken
            ? { pathname: "/join/[token]", params: { token: inviteToken } }
            : "/",
        );
        return;
      }
      router.replace("/");
    } catch {
      // The same visible error is used for invalid, expired and reused codes.
    }
  };
  const handleResend = async () => {
    try {
      await auth.requestOtp(auth.pendingEmail!);
      setSecondsRemaining(60);
    } catch {
      // The provider maps upstream failures to a stable generic error.
    }
  };
  return (
    <AppScreen>
      <AppText>{t("authCodeSent")}</AppText>
      <FormField
        keyboardType="number-pad"
        maxLength={6}
        label={t("authCodeLabel")}
        hint={t("authCodeHint")}
        value={code}
        onChangeText={(value) => {
          auth.clearError();
          setCode(value.replace(/\D/gu, ""));
        }}
      />
      {auth.errorCode === "OTP_INVALID" ? (
        <AppText accessibilityLiveRegion="polite">{t("authCodeInvalid")}</AppText>
      ) : auth.errorCode === "OTP_REQUEST_FAILED" ? (
        <AppText accessibilityLiveRegion="polite">{t("authRequestFailed")}</AppText>
      ) : null}
      <AppButton
        disabled={!codeValid}
        label={t("authCodeAction")}
        loading={auth.busy}
        onPress={() => void handleVerify()}
      />
      <AppButton
        label={
          secondsRemaining > 0
            ? `${t("authCodeResendIn")} ${secondsRemaining} s`
            : t("authCodeResend")
        }
        variant="ghost"
        disabled={secondsRemaining > 0}
        onPress={() => void handleResend()}
      />
    </AppScreen>
  );
}

export function ProfileOnboardingScreen() {
  const { t, locale } = useTranslation();
  const auth = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const timeZone = useMemo(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    try {
      return parseTimeZone(detected);
    } catch {
      return "UTC";
    }
  }, []);
  if (auth.status !== "profile_required") return <Redirect href="/" />;
  const nameValid = (() => {
    try {
      parseDisplayName(name);
      return true;
    } catch {
      return false;
    }
  })();
  const handleSave = async () => {
    try {
      await auth.saveProfile(name, timeZone, locale);
      router.replace("/onboarding/consent");
    } catch {
      // A localized stable error is rendered from provider state.
    }
  };
  return (
    <AppScreen>
      <FormField
        label={t("profileNameLabel")}
        hint={t("profileNameHint")}
        error={name.length > 0 && !nameValid ? t("profileNameInvalid") : undefined}
        value={name}
        onChangeText={(value) => {
          auth.clearError();
          setName(value);
        }}
      />
      <FormField
        editable={false}
        label={t("profileTimezoneLabel")}
        hint={t("profileTimezoneHint")}
        value={timeZone}
      />
      {auth.errorCode === "PROFILE_SAVE_FAILED" ? (
        <AppText accessibilityLiveRegion="polite">{t("profileSaveFailed")}</AppText>
      ) : null}
      <AppButton
        disabled={!nameValid}
        label={t("commonContinue")}
        loading={auth.busy}
        onPress={() => void handleSave()}
      />
    </AppScreen>
  );
}

export function ConsentScreen() {
  const { t, locale } = useTranslation();
  const auth = useAuth();
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  if (auth.status !== "consent_required") return <Redirect href="/" />;
  const handleConsent = async () => {
    try {
      await auth.grantConsent(locale);
      const inviteToken = await auth.peekPendingInvite().catch(() => null);
      router.replace(
        inviteToken
          ? { pathname: "/join/[token]", params: { token: inviteToken } }
          : "/today",
      );
    } catch {
      // A localized stable error is rendered from provider state.
    }
  };
  return (
    <AppScreen>
      <AppText>{t("consentBody")}</AppText>
      <AppCard>
        <Host matchContents>
          <Checkbox
            value={accepted}
            onValueChange={setAccepted}
            label={t("consentLabel")}
            testID="core-consent-checkbox"
          />
        </Host>
        <AppText variant="caption">{t("consentHint")}</AppText>
      </AppCard>
      {auth.errorCode === "CONSENT_SAVE_FAILED" ? (
        <AppText accessibilityLiveRegion="polite">{t("consentSaveFailed")}</AppText>
      ) : null}
      <AppButton
        disabled={!accepted}
        label={t("commonContinue")}
        loading={auth.busy}
        onPress={() => void handleConsent()}
      />
    </AppScreen>
  );
}
