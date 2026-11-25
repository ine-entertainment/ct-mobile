import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useAppNavigation } from "../lib/appNavigation";
import { useApp } from "../context/AppContext";
import { Chip } from "../components/ui";
import { RemoteImage } from "../components/RemoteImage";
import { colors, font, radius, shadow, text } from "../theme";

export function PhotoScreen() {
  const navigation = useAppNavigation();
  const { photographers, cities } = useApp();
  const [style, setStyle] = useState("全部");
  const city = cities.find((item) => item.status === "open")?.name || "三亚";
  const list = photographers.filter(
    (item) => style === "全部" || item.tags.includes(style)
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>找摄影</Text>
            <Text style={styles.subtitle}>
              {city} · {photographers.length} 位摄影师 · 档期实时更新
            </Text>
          </View>
          <Pressable style={styles.pin} onPress={() => navigation.navigate("City")}>
            <Ionicons name="location-outline" size={18} color={colors.ink} />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <RemoteImage name="photographer-2" style={styles.heroImage} />
          <View style={styles.heroShade} />
          <View style={styles.heroContent}>
            <Text style={styles.eyebrow}>TRAVEL PORTRAIT</Text>
            <Text style={styles.heroTitle}>把旅途拍成电影</Text>
            <Text style={styles.heroText}>看作品 · 选档期 · 行前沟通 · 平台担保</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {["全部", "海岛", "新中式", "夜景", "胶片"].map((item) => (
            <Chip key={item} label={item} active={style === item} onPress={() => setStyle(item)} />
          ))}
        </ScrollView>

        {list.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => navigation.navigate("Photographer", { photographerId: item.id })}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
          >
            <View style={styles.coverWrap}>
              <RemoteImage name={item.cover} style={styles.cover} />
              <View style={styles.coverTag}>
                <Text style={styles.coverTagText}>{item.tags[0] || "旅拍"} · 三亚</Text>
              </View>
              <View style={styles.coverPrice}>
                <Text style={styles.coverPriceText}>¥{item.price} 起</Text>
              </View>
            </View>
            <View style={styles.info}>
              <RemoteImage name={item.avatar} style={styles.avatar} />
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.styleTitle}>{item.title}</Text>
                </View>
                <Text style={styles.meta}>
                  {item.tags.join(" · ")} · 已拍 {item.ordersCount || item.orders} 组
                </Text>
              </View>
              <View style={styles.rating}>
                <Text style={styles.ratingValue}>{item.rating}</Text>
                <Ionicons name="star" size={9} color={colors.gold} />
              </View>
            </View>
            <View style={styles.tags}>
              {item.tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </Pressable>
        ))}
        {list.length === 0 ? <Text style={styles.empty}>这个风格暂时没有摄影师</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  scroll: { paddingBottom: 104 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontFamily: font.medium, fontSize: 28, fontWeight: "800", letterSpacing: -1.1, color: colors.ink },
  subtitle: { ...text.bodySmall, fontSize: 9, marginTop: 4 },
  pin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: { marginHorizontal: 20, marginTop: 16, height: 158, borderRadius: radius.xl, overflow: "hidden" },
  heroImage: { width: "100%", height: "100%" },
  heroShade: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(30,40,44,0.36)" },
  heroContent: { position: "absolute", left: 16, right: 16, bottom: 16 },
  eyebrow: { fontSize: 7.5, letterSpacing: 1.8, color: "rgba(255,255,255,0.65)" },
  heroTitle: { fontFamily: font.medium, fontSize: 21, fontWeight: "800", color: colors.white, marginTop: 5, letterSpacing: -0.5 },
  heroText: { fontSize: 8.5, color: "rgba(255,255,255,0.72)", marginTop: 4 },
  chips: { paddingHorizontal: 20, gap: 8, paddingTop: 15, paddingBottom: 14 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    marginHorizontal: 20,
    marginBottom: 14,
    overflow: "hidden",
    ...shadow(1),
  },
  coverWrap: { height: 188, backgroundColor: colors.cream2 },
  cover: { width: "100%", height: "100%" },
  coverTag: {
    position: "absolute",
    left: 12,
    top: 12,
    backgroundColor: "rgba(32,38,43,0.66)",
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  coverTagText: { fontSize: 8, color: colors.white },
  coverPrice: {
    position: "absolute",
    right: 12,
    bottom: 12,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  coverPriceText: { fontSize: 8.5, color: colors.ink, fontWeight: "700" },
  info: { flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 13, paddingTop: 12 },
  avatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: colors.cream },
  nameRow: { flexDirection: "row", alignItems: "baseline", gap: 7 },
  name: { fontFamily: font.medium, fontSize: 13, fontWeight: "700", color: colors.ink },
  styleTitle: { fontSize: 8.5, color: colors.muted },
  meta: { fontSize: 8.5, color: colors.muted, marginTop: 3 },
  rating: { flexDirection: "row", alignItems: "center", gap: 2 },
  ratingValue: { fontSize: 12, fontWeight: "700", color: colors.ink },
  tags: { flexDirection: "row", gap: 5, paddingHorizontal: 13, paddingTop: 10, paddingBottom: 13 },
  tag: { backgroundColor: colors.cream, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 4 },
  tagText: { fontSize: 8, color: colors.muted },
  empty: { ...text.bodySmall, textAlign: "center", paddingVertical: 40 },
});
