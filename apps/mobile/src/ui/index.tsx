import { radius, typography, useAppTheme } from "@/theme";
import { space } from "@/design-system";
import type { PropsWithChildren } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  type ScrollViewProps,
  Text as NativeText,
  type StyleProp,
  TextInput,
  type TextInputProps,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation, type TranslationKey } from "@/localization";
import Svg, { Circle } from "react-native-svg";
import { Host, Icon as ExpoIcon } from "@expo/ui";

type IconName = "add" | "more" | "group" | "chart" | "account" | "chevron";

const icons = {
  add: ExpoIcon.select({
    ios: "plus",
    android: require("@expo/material-symbols/icons/add.xml"),
  }),
  more: ExpoIcon.select({
    ios: "ellipsis",
    android: require("@expo/material-symbols/icons/more_horiz.xml"),
  }),
  group: ExpoIcon.select({
    ios: "person.3",
    android: require("@expo/material-symbols/icons/groups.xml"),
  }),
  chart: ExpoIcon.select({
    ios: "chart.bar",
    android: require("@expo/material-symbols/icons/bar_chart.xml"),
  }),
  account: ExpoIcon.select({
    ios: "person.circle",
    android: require("@expo/material-symbols/icons/account_circle.xml"),
  }),
  chevron: ExpoIcon.select({
    ios: "chevron.right",
    android: require("@expo/material-symbols/icons/chevron_right.xml"),
  }),
} as const;

export function Icon({
  name,
  accessibilityLabel,
  size = 20,
}: {
  name: IconName;
  accessibilityLabel?: string;
  size?: 16 | 20 | 24;
}) {
  const { colors } = useAppTheme();
  return (
    <Host matchContents>
      <ExpoIcon
        accessibilityLabel={accessibilityLabel}
        color={colors.primary}
        name={icons[name]}
        size={size}
      />
    </Host>
  );
}

export function Screen({
  children,
  contentContainerStyle,
  ...props
}: PropsWithChildren<
  ScrollViewProps & { contentContainerStyle?: StyleProp<ViewStyle> }
>) {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      {...props}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        {
          flexGrow: 1,
          width: "100%",
          maxWidth: width > 760 ? 640 : undefined,
          alignSelf: "center",
          paddingHorizontal: space.lg,
          paddingVertical: space.xxl,
          gap: space.xxl,
        },
        contentContainerStyle,
      ]}
    >
      {children}
    </ScrollView>
  );
}

export function Text({
  variant = "body",
  style,
  ...props
}: PropsWithChildren<
  Omit<React.ComponentProps<typeof NativeText>, "style"> & {
    variant?: keyof typeof typography;
    style?: React.ComponentProps<typeof NativeText>["style"];
  }
>) {
  const { colors } = useAppTheme();
  const isSecondary = variant === "secondary" || variant === "caption";
  return (
    <NativeText
      selectable={props.selectable ?? true}
      {...props}
      style={[
        typography[variant],
        { color: isSecondary ? colors.textSecondary : colors.textPrimary },
        style,
      ]}
    />
  );
}

type ButtonVariant = "primary" | "secondary" | "tertiary" | "destructive";

export function Button({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary",
  style,
  accessibilityHint,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: ButtonVariant;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}) {
  const { colors } = useAppTheme();
  const palette = {
    primary: { background: colors.primary, foreground: colors.textOnAccent },
    secondary: { background: colors.primaryMuted, foreground: colors.primary },
    tertiary: { background: "transparent", foreground: colors.primary },
    destructive: { background: colors.error, foreground: colors.textOnAccent },
  }[variant];
  const unavailable = disabled || loading;
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      accessibilityState={{ disabled: unavailable, busy: loading }}
      disabled={unavailable}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 48,
          minWidth: 48,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radius.md,
          borderCurve: "continuous",
          paddingHorizontal: space.lg,
          backgroundColor: palette.background,
          opacity: unavailable ? 0.5 : pressed ? 0.78 : 1,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.foreground} />
      ) : (
        <NativeText
          style={[typography.label, { color: palette.foreground }]}
        >
          {label}
        </NativeText>
      )}
    </Pressable>
  );
}

export function Chip({
  label,
  onPress,
  selected = false,
}: {
  label: string;
  onPress: () => void;
  selected?: boolean;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        paddingHorizontal: space.lg,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radius.pill,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: selected ? colors.primary : colors.borderSubtle,
        backgroundColor: selected ? colors.primaryMuted : colors.surface,
        opacity: pressed ? 0.78 : 1,
      })}
    >
      <NativeText style={[typography.label, { color: colors.primary }]}>
        {label}
      </NativeText>
    </Pressable>
  );
}

export function Banner({
  title,
  body,
  tone = "info",
}: {
  title: string;
  body: string;
  tone?: "info" | "error" | "success";
}) {
  const { colors } = useAppTheme();
  const color =
    tone === "error"
      ? colors.error
      : tone === "success"
        ? colors.success
        : colors.info;
  return (
    <View
      accessibilityRole="alert"
      style={{
        gap: space.xs,
        borderLeftWidth: 3,
        borderLeftColor: color,
        backgroundColor: colors.surfaceRaised,
        padding: space.lg,
        borderRadius: radius.md,
        borderCurve: "continuous",
      }}
    >
      <Text variant="headline">{title}</Text>
      <Text variant="secondary">{body}</Text>
    </View>
  );
}

export function Section({
  title,
  children,
}: PropsWithChildren<{ title?: string }>) {
  return (
    <View style={{ gap: space.md }}>
      {title ? <Text variant="title">{title}</Text> : null}
      {children}
    </View>
  );
}

export function Card({
  children,
  style,
  ...props
}: PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}> &
  React.ComponentProps<typeof View>) {
  const { colors } = useAppTheme();
  return (
    <View
      style={[
        {
        gap: space.sm,
        padding: space.lg,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

export function NumberField({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={{ gap: space.sm }}>
      <Text variant="label">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error}
        keyboardType="number-pad"
        placeholderTextColor={colors.textDisabled}
        style={[
          typography.body,
          {
            minHeight: 52,
            borderWidth: 1,
            borderColor: error ? colors.error : colors.borderStrong,
            borderRadius: radius.md,
            borderCurve: "continuous",
            paddingHorizontal: space.lg,
            color: colors.textPrimary,
            backgroundColor: colors.surface,
          },
        ]}
        {...props}
      />
      {error ? (
        <Text accessibilityLiveRegion="polite" style={{ color: colors.error }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function TextField({
  label,
  hint,
  error,
  ...props
}: TextInputProps & { label: string; hint?: string; error?: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={{ gap: space.sm }}>
      <Text variant="label">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error}
        placeholderTextColor={colors.textDisabled}
        style={[
          typography.body,
          {
            minHeight: 52,
            borderWidth: 1,
            borderColor: error ? colors.error : colors.borderStrong,
            borderRadius: radius.md,
            borderCurve: "continuous",
            paddingHorizontal: space.lg,
            color: colors.textPrimary,
            backgroundColor: colors.surface,
          },
        ]}
        {...props}
      />
      {error || hint ? (
        <Text
          accessibilityLiveRegion={error ? "polite" : "none"}
          variant="caption"
          style={{ color: error ? colors.error : colors.textSecondary }}
        >
          {error ?? hint}
        </Text>
      ) : null}
    </View>
  );
}

export function AppButton({
  variant = "primary",
  ...props
}: Omit<React.ComponentProps<typeof Button>, "variant"> & {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
}) {
  return <Button {...props} variant={variant === "ghost" ? "tertiary" : variant} />;
}

export const AppCard = Card;
export const AppScreen = Screen;
export const AppText = Text;
export const FormField = TextField;

export function StatusBanner({
  tone,
  ...props
}: Omit<React.ComponentProps<typeof Banner>, "tone"> & {
  tone: "offline" | "pending" | "error" | "success";
}) {
  return (
    <Banner
      {...props}
      tone={tone === "error" ? "error" : tone === "success" ? "success" : "info"}
    />
  );
}

export function ProgressRing({
  current,
  display,
  goal,
  staged,
  label,
}: {
  current: number;
  display: string;
  goal: string | null;
  staged: number;
  label: string;
}) {
  const { colors } = useAppTheme();
  const parsedGoal = goal ? Number(goal) : null;
  const progress = parsedGoal
    ? Math.min(1, (current + staged) / parsedGoal)
    : 0;
  const ringSize = 232;
  const strokeWidth = 10;
  const ringRadius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * ringRadius;
  const progressColor =
    parsedGoal && progress >= 1 ? colors.award : colors.primary;
  return (
    <View
      accessible
      accessibilityRole="summary"
      accessibilityLabel={label}
      style={{
        width: 232,
        height: 232,
        alignSelf: "center",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radius.pill,
        backgroundColor: colors.surface,
        overflow: "hidden",
      }}
    >
      <Svg
        height={ringSize}
        style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}
        width={ringSize}
      >
        <Circle
          cx={ringSize / 2}
          cy={ringSize / 2}
          fill="transparent"
          r={ringRadius}
          stroke={colors.surfaceMuted}
          strokeWidth={strokeWidth}
        />
        <Circle
          cx={ringSize / 2}
          cy={ringSize / 2}
          fill="transparent"
          r={ringRadius}
          stroke={progressColor}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - progress)}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
        />
      </Svg>
      <Text variant="caption">{staged > 0 ? `+${staged}` : label}</Text>
      <Text variant="display">{display}</Text>
      <Text variant="secondary">
        {parsedGoal ? `${display} / ${goal}` : label}
      </Text>
    </View>
  );
}

export function AccountButton({ label }: { label: string }) {
  const { colors } = useAppTheme();
  const router = useRouter();
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={() => router.push("/account")}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radius.pill,
        backgroundColor: colors.primaryMuted,
        opacity: pressed ? 0.78 : 1,
      })}
    >
      <Icon name="account" />
    </Pressable>
  );
}

export function ListRow({
  label,
  supporting,
  value,
  onPress,
}: {
  label: string;
  supporting?: string;
  value?: string;
  onPress?: () => void;
}) {
  const { colors } = useAppTheme();
  const content = (
    <>
      <View style={{ flex: 1, gap: space.xs }}>
        <Text variant="headline">{label}</Text>
        {supporting ? <Text variant="secondary">{supporting}</Text> : null}
      </View>
      {value ? (
        <Text
          variant="secondary"
          style={{ color: colors.textSecondary, fontVariant: ["tabular-nums"] }}
        >
          {value}
        </Text>
      ) : null}
      {onPress ? <Icon name="chevron" /> : null}
    </>
  );
  const style = {
    minHeight: 56,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  };
  if (!onPress) return <View style={style}>{content}</View>;
  return (
    <Pressable
      accessibilityLabel={[label, supporting, value].filter(Boolean).join(". ")}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [style, { opacity: pressed ? 0.72 : 1 }]}
    >
      {content}
    </Pressable>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { colors } = useAppTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: "row",
        gap: space.xs,
        padding: space.hairline,
        backgroundColor: colors.surfaceMuted,
        borderRadius: radius.pill,
      }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => ({
              minHeight: 44,
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              paddingHorizontal: space.sm,
              backgroundColor: selected ? colors.surface : "transparent",
              borderRadius: radius.pill,
              opacity: pressed ? 0.72 : 1,
            })}
          >
            <Text variant={selected ? "label" : "secondary"}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function QuoteCard({
  label,
  quote,
  source,
}: {
  label: string;
  quote: string;
  source: string;
}) {
  const { colors } = useAppTheme();
  return (
    <View
      accessibilityLabel={`${label}. ${quote}. ${source}`}
      style={{
        gap: space.md,
        padding: space.lg,
        backgroundColor: colors.primaryMuted,
        borderRadius: radius.lg,
        borderCurve: "continuous",
        borderLeftColor: colors.award,
        borderLeftWidth: 3,
      }}
    >
      <Text variant="label" style={{ color: colors.primary }}>
        {label}
      </Text>
      <Text variant="body" style={{ fontStyle: "italic" }}>
        {quote}
      </Text>
      <Text variant="caption">{source}</Text>
    </View>
  );
}

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

const feedbackKeys: Record<
  Exclude<ViewState, "content">,
  [TranslationKey, TranslationKey]
> = {
  loading: ["stateLoadingTitle", "stateLoadingBody"],
  empty: ["stateEmptyTitle", "stateEmptyBody"],
  offlineWithData: ["stateOfflineWithDataTitle", "stateOfflineWithDataBody"],
  offlineEmpty: ["stateOfflineEmptyTitle", "stateOfflineEmptyBody"],
  pending: ["statePendingTitle", "statePendingBody"],
  partialError: ["statePartialErrorTitle", "statePartialErrorBody"],
  error: ["stateErrorTitle", "stateErrorBody"],
  forbidden: ["stateForbiddenTitle", "stateForbiddenBody"],
  sessionExpired: ["stateSessionExpiredTitle", "stateSessionExpiredBody"],
  maintenance: ["stateMaintenanceTitle", "stateMaintenanceBody"],
  upgradeRequired: ["stateUpgradeRequiredTitle", "stateUpgradeRequiredBody"],
};

export function StateFeedback({
  state,
  children,
}: PropsWithChildren<{ state: ViewState }>) {
  const { t } = useTranslation();
  if (state === "content") return <>{children}</>;
  const [titleKey, bodyKey] = feedbackKeys[state];
  if (state === "offlineWithData" || state === "pending" || state === "partialError") {
    return (
      <View style={{ gap: space.md }}>
        <Banner
          body={t(bodyKey)}
          title={t(titleKey)}
          tone={state === "partialError" ? "error" : "info"}
        />
        {children}
      </View>
    );
  }
  return (
    <Card accessible accessibilityRole="alert" style={{ minHeight: 160, justifyContent: "center" }}>
      <Text variant="title">{t(titleKey)}</Text>
      <Text>{t(bodyKey)}</Text>
    </Card>
  );
}

export function OfflineLoadErrorCard({
  busy,
  onRetry,
}: {
  busy: boolean;
  onRetry(): Promise<void>;
}) {
  const { t } = useTranslation();
  return (
    <Card>
      <Text accessibilityLiveRegion="polite" variant="headline">
        {t("offlineLoadRetryTitle")}
      </Text>
      <Text>{t("offlineLoadRetryBody")}</Text>
      <Button label={t("offlineLoadRetryAction")} loading={busy} onPress={() => void onRetry()} />
    </Card>
  );
}

export function OfflineRecoveryCard({
  busy,
  onReset,
}: {
  busy: boolean;
  onReset(): Promise<void>;
}) {
  const { t } = useTranslation();
  return (
    <Card>
      <Text accessibilityLiveRegion="polite" variant="headline">
        {t("offlineRecoveryTitle")}
      </Text>
      <Text>{t("offlineRecoveryBody")}</Text>
      <Button
        label={t("offlineRecoveryAction")}
        loading={busy}
        onPress={() =>
          Alert.alert(
            t("offlineRecoveryConfirmTitle"),
            t("offlineRecoveryConfirmBody"),
            [
              { text: t("commonCancel"), style: "cancel" },
              {
                text: t("offlineRecoveryConfirmAction"),
                style: "destructive",
                onPress: () => void onReset(),
              },
            ],
          )
        }
      />
    </Card>
  );
}
