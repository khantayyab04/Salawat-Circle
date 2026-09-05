import { useTranslation, type TranslationKey } from "@/localization";
import { spacing } from "@/theme";
import type { PropsWithChildren } from "react";
import { View } from "react-native";
import { StateCard } from "./state-card";
import { StatusBanner } from "./status-banner";
export type ViewState =
  | "loading"
  | "content"
  | "empty"
  | "offlineWithData"
  | "offlineEmpty"
  | "pending"
  | "partialError"
  | "error"
  | "forbidden"
  | "sessionExpired"
  | "maintenance"
  | "upgradeRequired";
const copy: Exclude<ViewState, "content">[] = [
  "loading",
  "empty",
  "offlineWithData",
  "offlineEmpty",
  "pending",
  "partialError",
  "error",
  "forbidden",
  "sessionExpired",
  "maintenance",
  "upgradeRequired",
];
const keys = Object.fromEntries(
  copy.map((state) => [
    state,
    [
      `state${state[0].toUpperCase()}${state.slice(1)}Title`,
      `state${state[0].toUpperCase()}${state.slice(1)}Body`,
    ],
  ]),
) as Record<Exclude<ViewState, "content">, [TranslationKey, TranslationKey]>;
export function StateFeedback({
  state,
  children,
}: PropsWithChildren<{ state: ViewState }>) {
  const { t } = useTranslation();
  if (state === "content") return <>{children}</>;
  const [title, body] = keys[state];
  if (
    state === "offlineWithData" ||
    state === "pending" ||
    state === "partialError"
  )
    return (
      <View style={{ gap: spacing.md }}>
        <StatusBanner
          title={t(title)}
          body={t(body)}
          tone={
            state === "pending"
              ? "pending"
              : state === "partialError"
                ? "error"
                : "offline"
          }
        />
        {children}
      </View>
    );
  return <StateCard body={t(body)} title={t(title)} />;
}
