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
import { useEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";

function AuthIntro({
  progress,
  title,
  body,
}: {
  progress: string;
  title: string;
  body: string;
}) {
  const { colors } = useAppTheme();
  return (
    <Surface style={{ gap: spacing.md }}>
      <SectionLabel tone="gold">{progress}</SectionLabel>
      <Text
        accessibilityRole="header"
        style={[typography.title, { color: colors.textPrimary }]}
      >
        {title}
      </Text>
      <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>
        {body}
      </Text>
    </Surface>
  );
}

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
          <Heart color={colors.textOnPrimary} fill={colors.textOnPrimary} size={36} />
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
  const submitting = useRef(false);
  const emailValid = useMemo(() => {
    try {
      parseEmail(email);
      return true;
    } catch {
      return false;
    }
  }, [email]);
  const handleSubmit = async () => {
    if (submitting.current) return;
    submitting.current = true;
    try {
      await auth.requestOtp(email);
      router.push("/auth/code");
    } catch {
      // The provider exposes only stable, non-enumerating error codes.
    } finally {
      submitting.current = false;
    }
  };
  return (
    <AppScreen>
      <AuthIntro
        body={t("authEmailIntroBody")}
        progress={t("authEmailProgress")}
        title={t("authEmailIntroTitle")}
      />
      <AppCard style={{ gap: spacing.lg }}>
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
      </AppCard>
    </AppScreen>
  );
}

export function CodeScreen() {
  const { t } = useTranslation();
  const auth = useAuth();
  const router = useRouter();
  const [code, setCode] = useState("");
  const submitting = useRef(false);
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
    if (submitting.current) return;
    submitting.current = true;
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
    } finally {
      submitting.current = false;
    }
  };
  const handleResend = async () => {
    if (submitting.current) return;
    submitting.current = true;
    try {
      await auth.requestOtp(auth.pendingEmail!);
      setSecondsRemaining(60);
    } catch {
      // The provider maps upstream failures to a stable generic error.
    } finally {
      submitting.current = false;
    }
  };
  return (
    <AppScreen>
      <AuthIntro
        body={t("authCodeSent")}
        progress={t("authCodeProgress")}
        title={t("authCodeIntroTitle")}
      />
      <AppCard style={{ gap: spacing.lg }}>
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
          disabled={secondsRemaining > 0 || auth.busy}
          onPress={() => void handleResend()}
        />
      </AppCard>
    </AppScreen>
  );
}

export function ProfileOnboardingScreen() {
  const { t, locale } = useTranslation();
  const auth = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const submitting = useRef(false);
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
    if (submitting.current) return;
    submitting.current = true;
    try {
      await auth.saveProfile(name, timeZone, locale);
      router.replace("/onboarding/consent");
    } catch {
      // A localized stable error is rendered from provider state.
    } finally {
      submitting.current = false;
    }
  };
  return (
    <AppScreen>
      <AuthIntro
        body={t("profileIntroBody")}
        progress={t("profileProgress")}
        title={t("profileIntroTitle")}
      />
      <AppCard style={{ gap: spacing.lg }}>
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
      </AppCard>
    </AppScreen>
  );
}

export function ConsentScreen() {
  const { t, locale } = useTranslation();
  const auth = useAuth();
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const submitting = useRef(false);
  if (auth.status !== "consent_required") return <Redirect href="/" />;
  const handleConsent = async () => {
    if (submitting.current) return;
    submitting.current = true;
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
    } finally {
      submitting.current = false;
    }
  };
  return (
    <AppScreen>
      <AuthIntro
        body={t("consentBody")}
        progress={t("consentProgress")}
        title={t("consentIntroTitle")}
      />
      <AppCard style={{ gap: spacing.lg }}>
        <Host matchContents>
          <Checkbox
            value={accepted}
            onValueChange={setAccepted}
            label={t("consentLabel")}
            testID="core-consent-checkbox"
          />
        </Host>
        <AppText variant="caption">{t("consentHint")}</AppText>
        {auth.errorCode === "CONSENT_SAVE_FAILED" ? (
          <AppText accessibilityLiveRegion="polite">{t("consentSaveFailed")}</AppText>
        ) : null}
        <AppButton
          disabled={!accepted}
          label={t("commonContinue")}
          loading={auth.busy}
          onPress={() => void handleConsent()}
        />
      </AppCard>
    </AppScreen>
  );
}
