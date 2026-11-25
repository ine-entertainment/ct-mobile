import React from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Product } from "../types";
import { colors, font, radius, shadow, text } from "../theme";
import { RemoteImage } from "./RemoteImage";

export function ProductCard({
  product,
  liked,
  onPress,
  onToggleFavorite,
  columns = 2,
}: {
  product: Product;
  liked?: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
  columns?: number;
}) {
  const { width } = useWindowDimensions();
  const gap = 12;
  const horizontal = 20;
  const cardWidth = (width - horizontal * 2 - gap * (columns - 1)) / columns;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={product.title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { width: cardWidth, opacity: pressed ? 0.9 : 1 },
      ]}
    >
      <View style={[styles.imageWrap, { height: cardWidth * 1.22 }]}>
        <RemoteImage name={product.img} style={styles.image} accessibilityLabel={product.title} />
        <Pressable
          hitSlop={8}
          onPress={(event) => {
            event.stopPropagation();
            onToggleFavorite();
          }}
          style={[styles.fav, liked && styles.favActive]}
        >
          <Ionicons
            name={liked ? "heart" : "heart-outline"}
            size={15}
            color={liked ? colors.white : colors.ink}
          />
        </Pressable>
        {product.badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{product.badge}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.body}>
        <Text numberOfLines={2} style={styles.title}>
          {product.title}
        </Text>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={9} color={colors.gold} />
          <Text style={styles.rating}>
            {product.rating} · {product.reviews} 条
          </Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.price}>
            ¥{product.price}
            <Text style={styles.unit}>/3天</Text>
          </Text>
        </View>
        <Text style={styles.deposit}>押金 ¥{product.deposit} · 可信用免押</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    overflow: "hidden",
    ...shadow(1),
  },
  imageWrap: {
    width: "100%",
    backgroundColor: colors.cream2,
  },
  image: { width: "100%", height: "100%" },
  fav: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 29,
    height: 29,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.82)",
  },
  favActive: { backgroundColor: colors.coral },
  badge: {
    position: "absolute",
    left: 9,
    bottom: 9,
    backgroundColor: "rgba(32,38,43,0.72)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeText: { color: colors.white, fontSize: 7.5, fontWeight: "700" },
  body: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: 12 },
  title: {
    fontFamily: font.medium,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: "600",
    color: colors.ink,
    minHeight: 36,
  },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 5 },
  rating: { fontSize: 9, color: colors.muted },
  priceRow: { marginTop: 8, flexDirection: "row", alignItems: "flex-end" },
  price: { ...text.price, fontSize: 17 },
  unit: { fontSize: 9, color: colors.muted, fontWeight: "400" },
  deposit: { marginTop: 3, fontSize: 8, color: colors.muted2 },
});
