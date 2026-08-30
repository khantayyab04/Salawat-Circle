import { AppButton, AppScreen, AppText } from "@/components";
import { useTranslation } from "@/localization";
import { useRouter } from "expo-router";
export function NotFoundScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <AppScreen contentContainerStyle={{ justifyContent: "center" }}>
      <AppText accessibilityRole="header" variant="title">
        {t("notFoundTitle")}
      </AppText>
      <AppText>{t("notFoundBody")}</AppText>
      <AppButton
        label={t("notFoundAction")}
        onPress={() => router.replace("/welcome")}
      />
    </AppScreen>
  );
}
