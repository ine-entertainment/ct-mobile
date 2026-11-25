import { Platform, TextStyle, ViewStyle } from "react-native";

export const colors = {
  cream: "#FAF5EE",
  cream2: "#F4ECE1",
  card: "#FFFFFF",
  ink: "#20262B",
  ink2: "#3B4248",
  muted: "#8A8F94",
  muted2: "#A8A29A",
  line: "#ECE2D6",
  coral: "#FF6B5A",
  coral2: "#E85545",
  coralSoft: "#FFE9E4",
  sea: "#2E6F8E",
  sea2: "#245A74",
  seaSoft: "#E4F0F5",
  sand: "#F1E2CF",
  gold: "#C99A5B",
  green: "#2E9E6B",
  greenSoft: "#E4F4EC",
  white: "#FFFFFF",
  black: "#000000",
  overlay: "rgba(20, 18, 16, 0.42)",
  transparent: "transparent",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 26,
  pill: 999,
};

export const font = {
  regular: Platform.select({ ios: "System", android: "sans-serif" }),
  medium: Platform.select({ ios: "System", android: "sans-serif-medium" }),
  serif: Platform.select({ ios: "Georgia", android: "serif" }),
};

export const text = {
  h1: {
    fontFamily: font.medium,
    fontSize: 30,
    lineHeight: 37,
    letterSpacing: -1.1,
    color: colors.ink,
    fontWeight: "700",
  } as TextStyle,
  h2: {
    fontFamily: font.medium,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.6,
    color: colors.ink,
    fontWeight: "700",
  } as TextStyle,
  h3: {
    fontFamily: font.medium,
    fontSize: 17,
    lineHeight: 23,
    letterSpacing: -0.3,
    color: colors.ink,
    fontWeight: "600",
  } as TextStyle,
  body: {
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 21,
    color: colors.ink2,
  } as TextStyle,
  bodySmall: {
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.muted,
  } as TextStyle,
  label: {
    fontFamily: font.medium,
    fontSize: 11,
    lineHeight: 15,
    color: colors.ink2,
    fontWeight: "600",
  } as TextStyle,
  tiny: {
    fontFamily: font.regular,
    fontSize: 9,
    lineHeight: 13,
    color: colors.muted,
  } as TextStyle,
  price: {
    fontFamily: font.medium,
    fontSize: 19,
    lineHeight: 24,
    letterSpacing: -0.4,
    color: colors.ink,
    fontWeight: "700",
  } as TextStyle,
};

export function shadow(level: 1 | 2 | 3 = 1): ViewStyle {
  if (Platform.OS === "android") {
    return { elevation: level === 1 ? 3 : level === 2 ? 6 : 10 };
  }
  return {
    shadowColor: "#473020",
    shadowOpacity: level === 1 ? 0.08 : level === 2 ? 0.11 : 0.15,
    shadowRadius: level === 1 ? 12 : level === 2 ? 20 : 30,
    shadowOffset: { width: 0, height: level === 1 ? 4 : level === 2 ? 8 : 14 },
  };
}

export function money(value: number | string | undefined | null) {
  const n = Number(value || 0);
  return `¥${n.toLocaleString("zh-CN")}`;
}
