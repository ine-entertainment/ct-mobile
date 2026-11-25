import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useAppNavigation } from "../lib/appNavigation";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { ScreenHeader } from "../components/ScreenHeader";
import { RemoteImage } from "../components/RemoteImage";
import { colors, font, radius, shadow, text } from "../theme";

export function MakeupScreen() {
  const navigation = useAppNavigation();
  const { makeup } = useApp();
  const toast = useToast();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar style="dark" />
      <ScreenHeader title="找化妆" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <RemoteImage name="model-3" style={styles.heroImage} />
          <View style={styles.heroShade} />
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>妆造跟着衣服走</Text>
            <Text style={styles.heroText}>到店 / 上门 · 和租衣摄影打包更省心</Text>
          </View>
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>三亚人气妆造师</Text>
          <Text style={styles.sectionHint}>可约本周</Text>
        </View>

        {makeup.map((artist) => (
          <View key={artist.id} style={styles.card}>
            <RemoteImage name={artist.avatar} style={styles.avatar} />
            <View style={styles.info}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{artist.name}</Text>
                <Text style={styles.title}>{artist.title}</Text>
              </View>
              <Text style={styles.desc}>{artist.desc}</Text>
              <View style={styles.tags}>
                {artist.tags.map((tag) => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.bottom}>
                <Text style={styles.price}>¥{artist.price} 起</Text>
                <Pressable
                  onPress={() => toast("妆造预约将在下一版开放，可先联系客服")}
                  style={styles.book}
                >
                  <Text style={styles.bookText}>预约</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ))}

        <View style={styles.guide}>
          <Text style={styles.guideKicker}>打包更省心</Text>
          <Text style={styles.guideTitle}>租衣 + 妆造 + 摄影</Text>
          <Text style={styles.guideText}>
            同一行程一次约好，妆造师按你的服装和拍摄场景出妆，省去反复沟通。
          </Text>
          {[
            "先选衣服，确认拍摄风格",
            "再约妆造，上传参考图",
            "摄影师按妆造和光线排档期",
          ].map((step, index) => (
            <View key={step} style={styles.guideStep}>
              <View style={styles.guideIndex}>
                <Text style={styles.guideIndexText}>{index + 1}</Text>
              </View>
              <Text style={styles.guideStepText}>{step}</Text>
            </View>
          ))}
        </View>

        <Pressable
          onPress={() => navigation.navigate("Main", { screen: "Photo" })}
          style={styles.link}
        >
          <Text style={styles.linkText}>去找摄影师</Text>
          <Ionicons name="arrow-forward" size={13} color={colors.ink} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  scroll: { paddingHorizontal: 20, paddingBottom: 34 },
  hero: { height: 166, borderRadius: radius.xl, overflow: "hidden" },
  heroImage: { width: "100%", height: "100%" },
  heroShade: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(20,30,34,0.32)" },
  heroContent: { position: "absolute", left: 16, right: 16, bottom: 15 },
  heroTitle: { fontFamily: font.medium, fontSize: 22, fontWeight: "800", color: colors.white, letterSpacing: -0.6 },
  heroText: { fontSize: 8.5, color: "rgba(255,255,255,0.7)", marginTop: 4 },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: 20, marginBottom: 10 },
  sectionTitle: { ...text.h3, fontSize: 14 },
  sectionHint: { fontSize: 8, color: colors.muted },
  card: { flexDirection: "row", gap: 11, backgroundColor: colors.card, borderRadius: radius.lg, padding: 11, marginBottom: 11, ...shadow(1) },
  avatar: { width: 78, height: 96, borderRadius: 10 },
  info: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  name: { fontFamily: font.medium, fontSize: 13, fontWeight: "700", color: colors.ink },
  title: { fontSize: 8.5, color: colors.muted },
  desc: { fontSize: 8.5, lineHeight: 14, color: colors.muted, marginTop: 5 },
  tags: { flexDirection: "row", gap: 4, marginTop: 7 },
  tag: { backgroundColor: colors.cream, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 3 },
  tagText: { fontSize: 7.5, color: colors.muted },
  bottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  price: { fontSize: 12, fontWeight: "700", color: colors.ink },
  book: { backgroundColor: colors.ink, borderRadius: radius.pill, paddingHorizontal: 13, paddingVertical: 6 },
  bookText: { fontSize: 8.5, color: colors.white, fontWeight: "700" },
  guide: { backgroundColor: colors.ink, borderRadius: radius.xl, padding: 17, marginTop: 9 },
  guideKicker: { fontSize: 7.5, letterSpacing: 1.2, color: "rgba(255,255,255,0.4)" },
  guideTitle: { fontFamily: font.medium, fontSize: 17, fontWeight: "700", color: colors.white, marginTop: 6 },
  guideText: { fontSize: 8.8, lineHeight: 16, color: "rgba(255,255,255,0.5)", marginTop: 6 },
  guideStep: { flexDirection: "row", alignItems: "center", gap: 9, marginTop: 9 },
  guideIndex: { width: 17, height: 17, borderRadius: 9, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  guideIndexText: { fontSize: 7.5, color: colors.white, fontWeight: "700" },
  guideStepText: { fontSize: 8.8, color: "rgba(255,255,255,0.74)" },
  link: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, paddingVertical: 18 },
  linkText: { fontSize: 10, fontWeight: "700", color: colors.ink },
});
