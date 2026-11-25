import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Image, ImageStyle } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { resolveImage } from "../api/client";
import { colors } from "../theme";

export function RemoteImage({
  name,
  style,
  contentFit = "cover",
  accessibilityLabel,
}: {
  name?: string | null;
  style?: StyleProp<ImageStyle>;
  contentFit?: "cover" | "contain";
  accessibilityLabel?: string;
}) {
  const uri = resolveImage(name);
  if (!uri) {
    return (
      <View style={[styles.placeholder, style as StyleProp<ViewStyle>]}>
        <Ionicons name="image-outline" size={26} color={colors.muted2} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={[{ backgroundColor: colors.cream2 }, style]}
      contentFit={contentFit}
      transition={180}
      cachePolicy="memory-disk"
      accessibilityLabel={accessibilityLabel}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: colors.cream2,
    alignItems: "center",
    justifyContent: "center",
  },
});
