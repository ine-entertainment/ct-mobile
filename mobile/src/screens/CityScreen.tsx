import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useAppNavigation } from "../lib/appNavigation";
import { useApp } from "../context/AppContext";
import { ScreenHeader } from "../components/ScreenHeader";
import { RemoteImage } from "../components/RemoteImage";
import { AppButton } from "../components/ui";
import { colors, font, radius, shadow, text } from "../theme";

const spots = [
  { image: "beach", title: "亚龙湾 · 白沙滩", desc: "上午 8-10 点 · 逆光最柔" },
  { image: "hero-beach", title: "后海村 · 冲浪店", desc: "下午 4-6 点 · 胶片感" },
  { image: "amalfi", title: "天涯镇 · 蓝白小巷", desc: "上午 9 点 · 人少" },
  { image: "beach-2", title: "椰梦长廊 · 日落", desc: "18:20 · 金色时刻" },
];

export function CityScreen() {
  const navigation = useAppNavigation();
  const { cities } = useApp();
  const city = cities.find((item) => item.status === "open") || cities[0];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar style="dark" />
      <ScreenHeader title={city?.name || "三亚"} onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <RemoteImage name="hero-beach" style={styles.heroImage} />
          <View style={styles.heroShade} />
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>{city?.name || "三亚"}</Text>
            <Text style={styles.heroText}>{city?.weather || "28°C · 海风 3 级 · 适合白裙和浅色"}</Text>
          </View>
        </View>

        <View style={styles.stats}>
          <Stat value={city?.spots ?? 12} label="个旅拍机位" />
          <Stat value={city?.pieces ?? 0} label="件可租衣服" />
          <Stat value={city?.hotels ?? 8} label="家合作酒店" />
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>必拍机位</Text>
          <Text style={styles.sectionHint}>按光线排序</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.spotRow}
        >
          {spots.map((spot) => (
            <View key={spot.title} style={styles.spot}>
              <RemoteImage name={spot.image} style={styles.spotImage} />
              <Text style={styles.spotTitle}>{spot.title}</Text>
              <Text style={styles.spotDesc}>{spot.desc}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>住这里，衣服送到前台</Text>
          <Text style={styles.sectionHint}>合作酒店</Text>
        </View>
        {[
          {
            image: "hotel",
            title: "亚龙湾云汀度假酒店",
            desc: "步行到沙滩 5 分钟 · 前台代收",
            tag: "住客免配送费 · 延迟退房",
          },
          {
            image: "hotel-2",
            title: "后海 · 白房子民宿",
            desc: "步行到海边 3 分钟 · 冲浪友好",
            tag: "住客租衣 9 折 · 免费寄存",
          },
        ].map((hotel) => (
          <View key={hotel.title} style={styles.hotel}>
            <RemoteImage name={hotel.image} style={styles.hotelImage} />
            <View style={{ flex: 1 }}>
              <Text style={styles.hotelTitle}>{hotel.title}</Text>
              <Text style={styles.hotelDesc}>{hotel.desc}</Text>
              <Text style={styles.hotelTag}>{hotel.tag}</Text>
            </View>
          </View>
        ))}

        <View style={styles.guide}>
          <Text style={styles.guideKicker}>3 天 2 晚 · 穿搭路线</Text>
          <Text style={styles.guideTitle}>白裙、碎花和一件蓝风衣</Text>
          <Text style={styles.guideText}>
            按天气和拍摄时段排的轻量行程，不用带一箱衣服，也能每天出片。
          </Text>
          {[
            "Day 1 · 亚龙湾白裙 + 日落跟拍",
            "Day 2 · 后海碎花 + 冲浪店咖啡",
            "Day 3 · 天涯镇蓝风衣 + 返程",
          ].map((step, index) => (
            <View key={step} style={styles.guideStep}>
              <View style={styles.guideIndex}>
                <Text style={styles.guideIndexText}>{index + 1}</Text>
              </View>
              <Text style={styles.guideStepText}>{step}</Text>
            </View>
          ))}
        </View>

        <AppButton
          title="按目的地选衣"
          onPress={() => navigation.navigate("Main", { screen: "Rent" })}
          variant="dark"
          icon="arrow-forward"
          style={{ marginBottom: 30 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  scroll: { paddingHorizontal: 20, paddingBottom: 24 },
  hero: { height: 210, borderRadius: radius.xl, overflow: "hidden" },
  heroImage: { width: "100%", height: "100%" },
  heroShade: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(20,30,34,0.36)" },
  heroContent: { position: "absolute", left: 18, bottom: 18, right: 18 },
  heroTitle: { fontFamily: font.medium, fontSize: 30, fontWeight: "800", color: colors.white, letterSpacing: -1 },
  heroText: { fontSize: 9.5, color: "rgba(255,255,255,0.72)", marginTop: 5 },
  stats: { flexDirection: "row", backgroundColor: colors.card, borderRadius: radius.lg, marginTop: 12, paddingVertical: 13, ...shadow(1) },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontFamily: font.medium, fontSize: 18, fontWeight: "800", color: colors.ink },
  statLabel: { fontSize: 8, color: colors.muted, marginTop: 3 },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: 23, marginBottom: 10 },
  sectionTitle: { ...text.h3, fontSize: 14 },
  sectionHint: { fontSize: 8, color: colors.muted },
  spotRow: { gap: 10 },
  spot: { width: 190 },
  spotImage: { width: 190, height: 118, borderRadius: 11 },
  spotTitle: { fontSize: 10.5, fontWeight: "700", color: colors.ink, marginTop: 6 },
  spotDesc: { fontSize: 8.5, color: colors.muted, marginTop: 3 },
  hotel: { flexDirection: "row", gap: 11, backgroundColor: colors.card, borderRadius: radius.lg, padding: 9, marginBottom: 9, ...shadow(1) },
  hotelImage: { width: 86, height: 76, borderRadius: 9 },
  hotelTitle: { fontSize: 11, fontWeight: "700", color: colors.ink },
  hotelDesc: { fontSize: 8.5, color: colors.muted, marginTop: 4 },
  hotelTag: { fontSize: 8, color: colors.coral2, marginTop: 5 },
  guide: { backgroundColor: colors.ink, borderRadius: radius.xl, padding: 18, marginTop: 15, marginBottom: 18 },
  guideKicker: { fontSize: 7.5, color: "rgba(255,255,255,0.4)", letterSpacing: 1.2 },
  guideTitle: { fontFamily: font.medium, fontSize: 18, fontWeight: "700", color: colors.white, marginTop: 7 },
  guideText: { fontSize: 9, lineHeight: 16, color: "rgba(255,255,255,0.5)", marginTop: 7 },
  guideStep: { flexDirection: "row", alignItems: "center", gap: 9, marginTop: 10 },
  guideIndex: { width: 18, height: 18, borderRadius: 9, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  guideIndexText: { fontSize: 8, color: colors.white, fontWeight: "700" },
  guideStepText: { fontSize: 9, color: "rgba(255,255,255,0.75)" },
});
