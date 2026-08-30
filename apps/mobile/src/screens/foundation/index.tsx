import { checkConfiguredBackend } from "@/lib/backend";
import { foundationCopy } from "@/content/foundation";
import { colors } from "@/theme/colors";
import { useEffect, useState } from "react";
import { ScrollView, Text, useColorScheme } from "react-native";

export function FoundationScreen() {
  useColorScheme();
  const [status, setStatus] = useState<"checking" | "error" | "ready">(
    "checking",
  );

  useEffect(() => {
    let isMounted = true;

    void checkConfiguredBackend()
      .then(() => {
        if (isMounted) {
          setStatus("ready");
        }
      })
      .catch(() => {
        if (isMounted) {
          setStatus("error");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        flexGrow: 1,
        gap: 12,
        justifyContent: "center",
        padding: 24,
        backgroundColor: colors.background,
      }}
    >
      <Text
        accessibilityRole="header"
        selectable
        style={{ color: colors.label, fontSize: 28, fontWeight: "600" }}
      >
        {foundationCopy.title}
      </Text>
      <Text
        accessibilityLiveRegion="polite"
        selectable
        style={{
          color:
            status === "error"
              ? colors.error
              : status === "ready"
                ? colors.success
                : colors.secondaryLabel,
          fontSize: 16,
        }}
      >
        {foundationCopy[status]}
      </Text>
    </ScrollView>
  );
}
