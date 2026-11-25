import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, font, money, radius, shadow, text } from "../theme";
import { RemoteImage } from "./RemoteImage";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

export function AppButton({
  title,
  onPress,
  variant = "primary",
  size = "md",
  disabled,
  loading,
  icon,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "dark" | "ghost" | "soft" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const palette = {
    primary: { background: colors.coral, color: colors.white, border: colors.coral },
    dark: { background: colors.ink, color: colors.white, border: colors.ink },
    ghost: { background: "transparent", color: colors.ink2, border: colors.line },
    soft: { background: colors.coralSoft, color: colors.coral2, border: colors.coralSoft },
    danger: { background: colors.coral2, color: colors.white, border: colors.coral2 },
  }[variant];
  const heights = { sm: 36, md: 46, lg: 52 }[size];
  const fontSizes = { sm: 11, md: 13, lg: 14 }[size];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          height: heights,
          backgroundColor: palette.background,
          borderColor: palette.border,
          opacity: disabled ? 0.45 : pressed ? 0.82 : 1,
        },
        variant === "primary" && shadow(2),
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.color} size="small" />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={fontSizes + 4} color={palette.color} /> : null}
          <Text style={[styles.buttonText, { color: palette.color, fontSize: fontSizes }]}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  active,
  size = 18,
  accessibilityLabel,
  style,
}: {
  icon: IconName;
  onPress: () => void;
  active?: boolean;
  size?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.iconButton,
        active && { backgroundColor: colors.coralSoft },
        pressed && { opacity: 0.65 },
        style,
      ]}
    >
      <Ionicons name={icon} size={size} color={active ? colors.coral2 : colors.ink} />
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  style,
  right,
  ...props
}: TextInputProps & {
  label?: string;
  hint?: string;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.field, style]}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <View style={styles.fieldRow}>
        <TextInput
          placeholderTextColor={colors.muted2}
          {...props}
          style={[styles.input, props.multiline && styles.inputMultiline]}
        />
        {right}
      </View>
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && { backgroundColor: colors.ink, borderColor: colors.ink },
        pressed && { opacity: 0.78 },
      ]}
    >
      <Text style={[styles.chipText, active && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

export function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{action} ›</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const statusTone: Record<string, { bg: string; fg: string }> = {
  paid: { bg: "#FFF1D8", fg: "#A8752B" },
  shipped: { bg: "#E3EDF2", fg: "#52758C" },
  in_use: { bg: "#E3EDF2", fg: "#52758C" },
  return_pending: { bg: colors.coralSoft, fg: colors.coral2 },
  completed: { bg: colors.greenSoft, fg: colors.green },
  cancelled: { bg: "#EEE8DF", fg: colors.muted },
  refund_requested: { bg: "#F6E0DC", fg: "#B84F46" },
  refunded: { bg: "#EEE8DF", fg: colors.muted },
  deposit_paid: { bg: "#FFF1D8", fg: "#A8752B" },
  confirmed: { bg: "#E3EDF2", fg: "#52758C" },
  shooting: { bg: "#E3EDF2", fg: "#52758C" },
  selecting: { bg: "#FFF1D8", fg: "#A8752B" },
  delivering: { bg: "#FFF1D8", fg: "#A8752B" },
  held: { bg: "#FFF1D8", fg: "#A8752B" },
  deducted: { bg: "#F6E0DC", fg: "#B84F46" },
};

export function StatusBadge({ code, label }: { code: string; label: string }) {
  const tone = statusTone[code] || { bg: colors.cream2, fg: colors.muted };
  return (
    <View style={[styles.badge, { backgroundColor: tone.bg }]}>
      <Text style={[styles.badgeText, { color: tone.fg }]}>{label}</Text>
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.divider, style]} />;
}

export function LoadingView({ label = "正在加载…" }: { label?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.coral} />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}

export function EmptyView({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {hint ? <Text style={styles.emptyHint}>{hint}</Text> : null}
    </View>
  );
}

export function Price({ value, suffix }: { value: number | string; suffix?: string }) {
  return (
    <Text style={text.price}>
      {typeof value === "number" ? money(value) : value}
      {suffix ? <Text style={styles.priceSuffix}>{suffix}</Text> : null}
    </Text>
  );
}

export function Avatar({ uri, size = 44 }: { uri?: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.cream2,
        overflow: "hidden",
      }}
    >
      <RemoteImage name={uri} style={{ width: size, height: size }} />
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  buttonText: {
    fontFamily: font.medium,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.84)",
  },
  field: { marginBottom: 13 },
  fieldLabel: {
    ...text.label,
    marginBottom: 7,
  },
  fieldRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "#FFFDF9",
    borderRadius: radius.md,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.ink,
    minHeight: 46,
  },
  inputMultiline: { minHeight: 90, textAlignVertical: "top" },
  fieldHint: {
    ...text.tiny,
    marginTop: 5,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "#FFFFFFB8",
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: {
    fontFamily: font.medium,
    fontSize: 11,
    color: colors.ink2,
    fontWeight: "600",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    ...text.h3,
  },
  sectionAction: {
    ...text.bodySmall,
    color: colors.muted,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  badgeText: {
    fontFamily: font.medium,
    fontSize: 9,
    fontWeight: "700",
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line },
  loading: { paddingVertical: 60, alignItems: "center", gap: 12 },
  loadingText: { ...text.bodySmall },
  empty: { paddingVertical: 54, paddingHorizontal: 28, alignItems: "center" },
  emptyTitle: { ...text.h3, textAlign: "center" },
  emptyHint: { ...text.bodySmall, textAlign: "center", marginTop: 7, lineHeight: 19 },
  priceSuffix: { fontSize: 10, color: colors.muted, fontWeight: "400" },
});
