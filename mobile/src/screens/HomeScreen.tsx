import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAppNavigation } from "../lib/appNavigation";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { ProductCard } from "../components/ProductCard";
import { Chip, SectionHeader } from "../components/ui";
import { RemoteImage } from "../components/RemoteImage";
import { colors, font, radius, shadow, text } from "../theme";

const stories = [
  { productId: "white", image: "white-dress", title: "白裙 + 海风", place: "三亚 · 阿岚作品" },
  { productId: "floral", image: "floral-dress", title: "碎花和日落", place: "后海村 · 小野作品" },
  { productId: "blue", image: "blue-coat", title: "蓝白小巷", place: "天涯镇 · 陈一作品" },
  { productId: "desert", image: "desert-set", title: "沙丘电影感", place: "亚龙湾 · 阿岚作品" },
];

const quickActions = [
  { label: "租衣", icon: "shirt-outline", tab: "Rent" },
  { label: "找摄影", icon: "camera-outline", screen: "Photo" },
  { label: "找化妆", icon: "sparkles-outline", root: "Makeup" },
  { label: "城市", icon: "map-outline", root: "City" },
] as const;

export function HomeScreen() {
  const navigation = useAppNavigation();
  const { products, favorites, toggleFavorite, stats } = useApp();
  const toast = useToast();
  const [style, setStyle] = useState("全部");
  const { width } = useWindowDimensions();
  const available = products.reduce((sum, item) => sum + (item.stockAvailable || 0), 0);
  const styleOptions = ["全部", "海岛", "法式", "城市", "复古"];

  const visibleProducts = useMemo(() => {
    const list = style === "全部" ? products : products.filter((item) => item.styles.includes(style));
    return list.slice(0, 4);
  }, [products, style]);

  const storyWidth = Math.min(154, width * 0.42);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.header}>
          <Pressable style={styles.location} onPress={() => navigation.navigate("City")}>
            <Ionicons name="location-outline" size={17} color={colors.coral2} />
            <Text style={styles.locationText}>三亚</Text>
            <Ionicons name="chevron-down" size={12} color={colors.muted} />
          </Pressable>
          <View style={styles.headerActions}>
            <Pressable
              accessibilityLabel="搜索"
              style={styles.iconButton}
              onPress={() => navigation.navigate("Rent")}
            >
              <Ionicons name="search-outline" size={19} color={colors.ink} />
            </Pressable>
            <Pressable
              accessibilityLabel="消息"
              style={styles.iconButton}
              onPress={() => toast("暂时没有新消息")}
            >
              <Ionicons name="notifications-outline" size={19} color={colors.ink} />
            </Pressable>
          </View>
        </View>

        <View style={styles.weather}>
          <Text style={styles.weatherStrong}>28° 晴</Text>
          <View style={styles.weatherDot} />
          <Text style={styles.weatherText}>海风 3 级</Text>
          <View style={styles.weatherDot} />
          <Text style={styles.weatherText}>适合白色 / 浅色</Text>
          <Pressable onPress={() => navigation.navigate("City")} style={{ marginLeft: "auto" }}>
            <Text style={styles.weatherLink}>穿搭攻略 →</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => navigation.navigate("Product", { productId: products[0]?.id || "white" })}
          style={({ pressed }) => [styles.hero, pressed && { opacity: 0.94 }]}
        >
          <RemoteImage name="hero-beach" style={styles.heroImage} />
          <LinearGradient
            colors={["rgba(20,30,34,0.05)", "rgba(20,30,34,0.68)"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>今日可约 {available} 件</Text>
          </View>
          <View style={styles.heroContent}>
            <Text style={styles.heroEyebrow}>SANYA · 海岛限定</Text>
            <Text style={styles.heroTitle}>海风白裙计划</Text>
            <Text style={styles.heroCopy}>
              租一套白裙 + 2 小时跟拍{"\n"}送到酒店，离店归还
            </Text>
            <View style={styles.heroButton}>
              <Text style={styles.heroButtonText}>¥1,199 起 · 查看套装</Text>
              <Ionicons name="arrow-forward" size={12} color={colors.ink} />
            </View>
          </View>
        </Pressable>

        <View style={styles.quickGrid}>
          {quickActions.map((action) => (
            <Pressable
              key={action.label}
              style={({ pressed }) => [styles.quick, pressed && { opacity: 0.75 }]}
              onPress={() => {
                if ("tab" in action) navigation.navigate(action.tab);
                else if ("screen" in action) navigation.navigate(action.screen);
                else navigation.navigate(action.root);
              }}
            >
              <View style={styles.quickIcon}>
                <Ionicons name={action.icon} size={20} color={colors.coral2} />
              </View>
              <Text style={styles.quickLabel}>{action.label}</Text>
            </Pressable>
          ))}
        </View>

        <SectionHeader
          title="精选客片"
          action="看社区"
          onAction={() => navigation.navigate("Community")}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.storyRow}
        >
          {stories.map((story) => (
            <Pressable
              key={story.title}
              onPress={() => navigation.navigate("Product", { productId: story.productId })}
              style={[styles.story, { width: storyWidth }]}
            >
              <RemoteImage name={story.image} style={styles.storyImage} />
              <LinearGradient
                colors={["transparent", "rgba(20,25,28,0.7)"]}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.storyInfo}>
                <Text style={styles.storyTitle}>{story.title}</Text>
                <Text style={styles.storyPlace}>{story.place}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        <SectionHeader title="按风格选" action="全部" onAction={() => navigation.navigate("Rent")} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {styleOptions.map((item) => (
            <Chip key={item} label={item} active={style === item} onPress={() => setStyle(item)} />
          ))}
        </ScrollView>

        <SectionHeader
          title="热门可租"
          action="查看全部"
          onAction={() => navigation.navigate("Rent")}
        />
        <View style={styles.grid}>
          {visibleProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              liked={!!favorites[product.id]}
              onPress={() => navigation.navigate("Product", { productId: product.id })}
              onToggleFavorite={async () => {
                try {
                  const liked = await toggleFavorite(product.id);
                  toast(liked ? "已收藏，行前记得回来看档期" : "已取消收藏");
                } catch (error) {
                  toast(error instanceof Error ? error.message : "收藏失败");
                }
              }}
            />
          ))}
        </View>
        {visibleProducts.length === 0 ? (
          <Text style={styles.empty}>这个风格暂时没有可租款</Text>
        ) : null}

        <View style={styles.package}>
          <View style={styles.packageTag}>
            <Text style={styles.packageTagText}>闺蜜旅拍 · 2 人同行</Text>
          </View>
          <Text style={styles.packageTitle}>租衣 + 妆造 + 摄影，¥1,199 起</Text>
          <Text style={styles.packageText}>白裙/碎花任选 · 2 小时跟拍 · 9 张精修 · 酒店送达</Text>
          <Pressable onPress={() => navigation.navigate("Photo")} style={styles.packageBtn}>
            <Text style={styles.packageBtnText}>看看套餐</Text>
            <Ionicons name="arrow-forward" size={12} color={colors.ink} />
          </Pressable>
        </View>

        <View style={styles.statsLine}>
          <Text style={styles.statsText}>
            {stats.orders} 笔订单 · {stats.favorites} 个收藏 · 三亚首发
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  scroll: { paddingBottom: 104 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  location: { flexDirection: "row", alignItems: "center", gap: 4 },
  locationText: { fontFamily: font.medium, fontSize: 15, fontWeight: "700", color: colors.ink },
  headerActions: { flexDirection: "row", gap: 8 },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.8)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
  },
  weather: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  weatherStrong: { fontFamily: font.medium, fontSize: 10.5, fontWeight: "700", color: colors.ink },
  weatherText: { fontSize: 9, color: colors.muted },
  weatherDot: { width: 2, height: 2, borderRadius: 1, backgroundColor: colors.muted2 },
  weatherLink: { fontSize: 9, color: colors.sea2 },
  hero: {
    marginHorizontal: 20,
    height: 286,
    borderRadius: radius.xl,
    overflow: "hidden",
    ...shadow(2),
  },
  heroImage: { ...StyleSheet.absoluteFill, width: "100%", height: "100%" },
  heroBadge: {
    position: "absolute",
    right: 12,
    top: 12,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  heroBadgeText: { fontSize: 8, color: colors.ink2, fontWeight: "600" },
  heroContent: { position: "absolute", left: 18, right: 18, bottom: 17 },
  heroEyebrow: { fontSize: 8, color: "rgba(255,255,255,0.72)", letterSpacing: 1.5 },
  heroTitle: {
    fontFamily: font.medium,
    marginTop: 6,
    fontSize: 26,
    fontWeight: "800",
    color: colors.white,
    letterSpacing: -0.9,
  },
  heroCopy: { marginTop: 6, fontSize: 10.5, lineHeight: 17, color: "rgba(255,255,255,0.82)" },
  heroButton: {
    marginTop: 12,
    alignSelf: "flex-start",
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingHorizontal: 13,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroButtonText: { fontSize: 9.5, fontWeight: "700", color: colors.ink },
  quickGrid: { flexDirection: "row", gap: 9, paddingHorizontal: 20, marginTop: 16 },
  quick: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingVertical: 12,
    alignItems: "center",
    gap: 7,
    ...shadow(1),
  },
  quickIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.coralSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: { fontSize: 9, color: colors.ink2, fontWeight: "600" },
  storyRow: { paddingHorizontal: 20, gap: 10, paddingBottom: 18 },
  story: {
    height: 178,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.sand,
  },
  storyImage: { width: "100%", height: "100%" },
  storyInfo: { position: "absolute", left: 10, right: 10, bottom: 10 },
  storyTitle: { color: colors.white, fontSize: 11, fontWeight: "700" },
  storyPlace: { color: "rgba(255,255,255,0.7)", fontSize: 8, marginTop: 3 },
  chipRow: { paddingHorizontal: 20, gap: 8, paddingBottom: 17 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingHorizontal: 20,
  },
  empty: { ...text.bodySmall, textAlign: "center", paddingVertical: 26 },
  package: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: radius.xl,
    backgroundColor: colors.ink,
    padding: 18,
    ...shadow(2),
  },
  packageTag: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  packageTagText: { fontSize: 8, color: "rgba(255,255,255,0.8)" },
  packageTitle: {
    fontFamily: font.medium,
    color: colors.white,
    fontSize: 18,
    fontWeight: "700",
    marginTop: 12,
    letterSpacing: -0.4,
  },
  packageText: { color: "rgba(255,255,255,0.55)", fontSize: 9.5, lineHeight: 16, marginTop: 6 },
  packageBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.cream,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 14,
  },
  packageBtnText: { fontSize: 9, color: colors.ink, fontWeight: "700" },
  statsLine: { paddingHorizontal: 20, paddingTop: 20, alignItems: "center" },
  statsText: { fontSize: 8, color: colors.muted2 },
});
