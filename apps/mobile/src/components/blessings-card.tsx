import { Surface } from "./surface";
import { getDailyBlessing } from "@/lib/blessings/daily-blessing";
import { useSunsetLocation } from "@/lib/blessings/use-sunset-location";
import { useTranslation } from "@/localization";
import { radius, shadows, spacing, typography, useAppTheme } from "@/theme";
import Heart from "lucide-react-native/icons/heart";
import { useEffect, useState } from "react";
import { AppState, Text, View } from "react-native";

export function BlessingsCard({ timeZone }: { timeZone: string }) {
  const { t, localeTag } = useTranslation();
  const [now, setNow] = useState(() => new Date());
  const location = useSunsetLocation();
  const effectiveTimeZone = location.coordinates ? Intl.DateTimeFormat().resolvedOptions().timeZone : timeZone;
  const { isFriday, narration } = getDailyBlessing(now, effectiveTimeZone, location.coordinates);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    const subscription = AppState.addEventListener("change", state => { if (state === "active") setNow(new Date()); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []);
  const { colors } = useAppTheme();

  return (
    <>
    <Surface
      style={{
        backgroundColor: colors.primary,
        borderWidth: 0,
        flexDirection: "row",
        gap: spacing.lg,
        boxShadow: shadows.raised,
      }}
      tone="plain"
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: radius.pill,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.primaryPressed,
        }}
      >
        <Heart color={colors.textOnPrimary} fill={colors.textOnPrimary} size={18} />
      </View>
      <View style={{ flex: 1, gap: spacing.md }}>
        <Text style={[typography.cardTitle, { color: colors.textOnPrimary }]}>
          {t(isFriday ? "jumuahLabel" : "blessingsLabel")}
        </Text>
        <Text
          style={[
            typography.bodyMedium,
            { color: colors.textOnPrimary, fontStyle: "italic" },
          ]}
        >
          {narration[localeTag.startsWith("de") ? "de" : "en"]}
        </Text>
        <Text style={[typography.labelSmall, { color: colors.textOnPrimary }]}>
          {narration.source}
        </Text>
      </View>
    </Surface>
    </>
  );
}
