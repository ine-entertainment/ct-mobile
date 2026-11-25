import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useAppNavigation } from "../lib/appNavigation";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { BottomSheet } from "../components/BottomSheet";
import { AppButton, LoadingView } from "../components/ui";
import { RemoteImage } from "../components/RemoteImage";
import { photoSlots } from "../lib/date";
import { colors, font, radius, shadow, text } from "../theme";

export function PhotographerScreen() {
  const navigation = useAppNavigation();
  const params = useLocalSearchParams<{ photographerId: string; slot?: string }>();
  const insets = useSafeAreaInsets();
  const { photographers, createPhoto } = useApp();
  const toast = useToast();
  const photographerId = params.photographerId;
  const photographer = photographers.find((item) => item.id === photographerId);
  const [slot, setSlot] = useState(params.slot || photoSlots()[0]);
  const [payVisible, setPayVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!photographer) {
      // Product data is already loaded; a missing photographer is treated as offline.
      setError("摄影师不存在或已下架");
    }
  }, [photographer]);

  const slots = useMemo(() => photoSlots(), []);

  if (!photographer) {
    return (
      <View style={[styles.loading, { paddingTop: insets.top }]}>
        <StatusBar style="dark" />
        <LoadingView label={error || "正在读取摄影师…"} />
      </View>
    );
  }

  const submit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const order = await createPhoto({ photographerId: photographer.id, slot });
      setPayVisible(false);
      navigation.reset({
        index: 2,
        routes: [
          { name: "Main", params: { screen: "Profile" } },
          { name: "Orders", params: { filter: "photo" } },
          { name: "Success", params: { orderId: order.id } },
        ],
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "预约失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 108 + insets.bottom }}
      >
        <View style={styles.hero}>
          <RemoteImage name={photographer.cover} style={styles.cover} />
          <View style={styles.heroShade} />
          <View style={[styles.topActions, { paddingTop: insets.top + 8 }]}>
            <Pressable style={styles.glass} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={19} color={colors.white} />
            </Pressable>
            <Pressable style={styles.glass} onPress={() => toast("分享链接已复制")}>
              <Ionicons name="share-outline" size={17} color={colors.white} />
            </Pressable>
          </View>
          <View style={styles.profile}>
            <RemoteImage name={photographer.avatar} style={styles.avatar} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{photographer.name}</Text>
              <Text style={styles.title}>
                {photographer.title} · 三亚
              </Text>
            </View>
            <View style={styles.ratingBlock}>
              <Text style={styles.rating}>{photographer.rating}</Text>
              <Text style={styles.ratingHint}>{photographer.ordersCount || photographer.orders} 组拍摄</Text>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.bio}>{photographer.bio}</Text>

          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>作品集</Text>
            <Text style={styles.sectionHint}>近期客片</Text>
          </View>
          <View style={styles.works}>
            {photographer.works.map((image, index) => (
              <RemoteImage key={`${image}-${index}`} name={image} style={styles.work} />
            ))}
          </View>

          <View style={styles.packageCard}>
            <View style={styles.packageHead}>
              <View style={{ flex: 1 }}>
                <Text style={styles.packageTitle}>{photographer.package.title}</Text>
                <Text style={styles.packageDesc}>{photographer.package.desc}</Text>
              </View>
              <Text style={styles.packagePrice}>¥{photographer.package.price}</Text>
            </View>
            <View style={styles.includes}>
              {photographer.package.includes.map((item) => (
                <View key={item} style={styles.include}>
                  <Text style={styles.includeText}>{item}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.slotLabel}>选择档期</Text>
            <View style={styles.slots}>
              {slots.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setSlot(item)}
                  style={[styles.slot, slot === item && styles.slotActive]}
                >
                  <Text style={[styles.slotText, slot === item && styles.slotTextActive]}>
                    {item}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.rules}>
            {[
              ["定金", "30% · 拍摄前付尾款"],
              ["改期", "提前 48 小时免费一次"],
              ["交付", "7 天选片 · 15 天精修"],
            ].map(([label, value]) => (
              <View key={label} style={styles.rule}>
                <Text style={styles.ruleLabel}>{label}</Text>
                <Text style={styles.ruleValue}>{value}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bottomPrice}>¥{photographer.package.price}</Text>
          <Text style={styles.bottomNote}>定金 ¥{photographer.package.deposit} · 锁定档期</Text>
        </View>
        <AppButton
          title="付定金预约"
          onPress={() => {
            setError("");
            setPayVisible(true);
          }}
          style={{ paddingHorizontal: 24 }}
        />
      </View>

      <BottomSheet
        visible={payVisible}
        onClose={() => setPayVisible(false)}
        title="支付定金 · 锁定档期"
        subtitle={`${slot} · ${photographer.name} · 提前 48 小时可免费改期一次`}
        footer={
          <AppButton
            title={`确认支付 ¥${photographer.package.deposit}`}
            onPress={submit}
            loading={submitting}
          />
        }
      >
        <View style={styles.payAmount}>
          <Text style={styles.payCurrency}>¥</Text>
          <Text style={styles.payValue}>{photographer.package.deposit}</Text>
        </View>
        <View style={styles.payMethod}>
          <View style={styles.wechatIcon}>
            <Text style={styles.wechatText}>微</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.payTitle}>微信支付</Text>
            <Text style={styles.paySub}>
              尾款 ¥{photographer.package.price - photographer.package.deposit} 拍摄前支付
            </Text>
          </View>
          <Ionicons name="checkmark-circle" size={19} color={colors.green} />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  loading: { flex: 1, backgroundColor: colors.cream },
  hero: { height: 380, backgroundColor: colors.ink },
  cover: { width: "100%", height: "100%" },
  heroShade: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(24,30,34,0.32)" },
  topActions: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  glass: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(30,30,30,0.25)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  profile: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  avatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: "rgba(255,255,255,0.4)" },
  name: { fontFamily: font.medium, fontSize: 22, fontWeight: "800", color: colors.white, letterSpacing: -0.6 },
  title: { fontSize: 8.5, color: "rgba(255,255,255,0.7)", marginTop: 3 },
  ratingBlock: { alignItems: "flex-end" },
  rating: { fontSize: 20, fontWeight: "800", color: colors.white },
  ratingHint: { fontSize: 7.5, color: "rgba(255,255,255,0.6)" },
  body: { paddingHorizontal: 20, paddingTop: 18 },
  bio: { ...text.bodySmall, fontSize: 10.5, lineHeight: 18 },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: 18, marginBottom: 9 },
  sectionTitle: { ...text.h3, fontSize: 13 },
  sectionHint: { fontSize: 8, color: colors.muted },
  works: { flexDirection: "row", gap: 6 },
  work: { flex: 1, height: 118, borderRadius: 9 },
  packageCard: {
    marginTop: 20,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 15,
    ...shadow(1),
  },
  packageHead: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  packageTitle: { fontFamily: font.medium, fontSize: 14, fontWeight: "700", color: colors.ink },
  packageDesc: { fontSize: 8.5, color: colors.muted, marginTop: 4, lineHeight: 14 },
  packagePrice: { ...text.price, fontSize: 18 },
  includes: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 12 },
  include: { backgroundColor: colors.cream, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 4 },
  includeText: { fontSize: 8, color: colors.muted },
  slotLabel: { ...text.label, marginTop: 15, marginBottom: 8 },
  slots: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  slot: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: colors.card,
  },
  slotActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  slotText: { fontSize: 9, color: colors.ink2, fontWeight: "600" },
  slotTextActive: { color: colors.white },
  rules: { backgroundColor: colors.card, borderRadius: radius.lg, paddingHorizontal: 14, marginTop: 14 },
  rule: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  ruleLabel: { fontSize: 9.5, color: colors.ink2, fontWeight: "600" },
  ruleValue: { fontSize: 8.5, color: colors.muted },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(250,245,238,0.98)",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    ...shadow(2),
  },
  bottomPrice: { fontFamily: font.medium, fontSize: 22, fontWeight: "800", color: colors.ink },
  bottomNote: { fontSize: 7.5, color: colors.muted, marginTop: 2 },
  payAmount: { flexDirection: "row", alignItems: "flex-start", justifyContent: "center", paddingVertical: 12 },
  payCurrency: { fontSize: 17, fontWeight: "700", marginTop: 5, color: colors.ink },
  payValue: { fontFamily: font.medium, fontSize: 44, lineHeight: 52, fontWeight: "800", letterSpacing: -2, color: colors.ink },
  payMethod: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.cream, borderRadius: radius.md, padding: 12 },
  wechatIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.green, alignItems: "center", justifyContent: "center" },
  wechatText: { color: colors.white, fontSize: 14, fontWeight: "700" },
  payTitle: { fontSize: 11.5, fontWeight: "700", color: colors.ink },
  paySub: { fontSize: 8.5, color: colors.muted, marginTop: 3 },
  error: { marginTop: 10, color: colors.coral2, fontSize: 10, lineHeight: 16 },
});
