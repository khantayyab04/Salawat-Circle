import {
  AppButton,
  AppCard,
  AppScreen,
  AppText,
  FormField,
} from "@/components";
import { useTranslation } from "@/localization";
import { spacing, useAppTheme } from "@/theme";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";

export function WelcomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <AppScreen contentContainerStyle={{ justifyContent: "center" }}>
      <AppText variant="bodyStrong" style={{ textTransform: "uppercase" }}>
        {t("welcomeEyebrow")}
      </AppText>
      <AppText accessibilityRole="header" variant="title">
        {t("welcomeTitle")}
      </AppText>
      <AppText>{t("welcomeBody")}</AppText>
      <AppButton
        label={t("welcomeAction")}
        onPress={() => router.push("/auth/email")}
      />
    </AppScreen>
  );
}

export function EmailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState("");
  return (
    <AppScreen>
      <FormField
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        label={t("authEmailLabel")}
        hint={t("authEmailHint")}
        value={email}
        onChangeText={setEmail}
      />
      <AppButton
        label={t("authEmailAction")}
        onPress={() => router.push("/auth/code")}
      />
    </AppScreen>
  );
}

export function CodeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [code, setCode] = useState("");
  return (
    <AppScreen>
      <FormField
        keyboardType="number-pad"
        maxLength={6}
        label={t("authCodeLabel")}
        hint={t("authCodeHint")}
        value={code}
        onChangeText={setCode}
      />
      <AppButton
        label={t("commonContinue")}
        onPress={() => router.push("/onboarding/profile")}
      />
      <AppButton label={t("authCodeResend")} variant="ghost" disabled />
    </AppScreen>
  );
}

export function ProfileOnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [name, setName] = useState("");
  return (
    <AppScreen>
      <FormField
        label={t("profileNameLabel")}
        value={name}
        onChangeText={setName}
      />
      <FormField
        editable={false}
        label={t("profileTimezoneLabel")}
        value={Intl.DateTimeFormat().resolvedOptions().timeZone}
      />
      <AppButton
        label={t("commonContinue")}
        onPress={() => router.push("/onboarding/consent")}
      />
    </AppScreen>
  );
}

export function ConsentScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useAppTheme();
  const [accepted, setAccepted] = useState(false);
  return (
    <AppScreen>
      <AppCard>
        <Pressable
          accessibilityHint={t("consentHint")}
          accessibilityLabel={t("consentLabel")}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: accepted }}
          onPress={() => setAccepted((value) => !value)}
          style={{
            minHeight: 48,
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.md,
          }}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderWidth: 2,
              borderColor: colors.accent,
              backgroundColor: accepted ? colors.accent : "transparent",
            }}
          />
          <AppText style={{ flex: 1 }}>{t("consentLabel")}</AppText>
        </Pressable>
        <AppText variant="caption">{t("consentHint")}</AppText>
      </AppCard>
      <AppButton
        disabled={!accepted}
        label={t("commonContinue")}
        onPress={() => router.replace("/today")}
      />
    </AppScreen>
  );
}
