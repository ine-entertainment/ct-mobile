import React, { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAppNavigation } from "../lib/appNavigation";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { BottomSheet } from "../components/BottomSheet";
import { AppButton, Field } from "../components/ui";
import { RemoteImage } from "../components/RemoteImage";
import { colors, font, radius, shadow } from "../theme";

export function ProfileScreen() {
  const navigation = useAppNavigation();
  const { user, stats, orders, signOut, updateProfile } = useApp();
  const toast = useToast();
  const [addressVisible, setAddressVisible] = useState(false);
  const [addressDraft, setAddressDraft] = useState(user?.address || { name: "", phone: "", text: "" });
  const [addressError, setAddressError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const pendingShip = orders.filter((order) => order.statusCode === "paid").length;
  const inUse = orders.filter((order) => order.statusCode === "in_use").length;
  const toReturn = orders.filter((order) => order.statusCode === "return_pending").length;

  const shortcuts = [
    { label: "待付款", icon: "bag-outline", count: 0 },
    { label: "待发货", icon: "cube-outline", count: pendingShip },
    { label: "使用中", icon: "time-outline", count: inUse },
    { label: "待归还", icon: "calendar-outline", count: toReturn },
    { label: "售后", icon: "chatbubble-outline", count: 0 },
  ] as const;

  const saveAddress = async () => {
    const draft = {
      name: addressDraft.name.trim(),
      phone: addressDraft.phone.trim(),
      text: addressDraft.text.trim(),
    };
    if (!draft.name) return setAddressError("请填写收货人");
    if (!/^1[3-9]\d{9}$/.test(draft.phone)) return setAddressError("请填写正确的手机号");
    if (!draft.text) return setAddressError("请填写详细地址");
    setSaving(true);
    setAddressError("");
    try {
      await updateProfile({
        addressName: draft.name,
        addressPhone: draft.phone,
        addressText: draft.text,
      });
      setAddressVisible(false);
      toast("收货地址已保存");
    } catch (error) {
      setAddressError(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const openAddress = () => {
    setAddressDraft(user.address);
    setAddressError("");
    setAddressVisible(true);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.top}>
          <Text style={styles.pageTitle}>我的</Text>
          <Pressable style={styles.iconButton} onPress={() => navigation.navigate("Account")}>
            <Ionicons name="settings-outline" size={19} color={colors.ink} />
          </Pressable>
        </View>

        <View style={styles.userRow}>
          <RemoteImage name={user.avatar || "model-2"} style={styles.avatar} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user.nickname}</Text>
            <Text style={styles.userMeta}>
              {user.city || "三亚"} · {user.hasPhone ? user.phoneMasked : "微信登录"}
              {user.hasWechat ? " · 微信已绑定" : ""}
            </Text>
            <View style={styles.profileTag}>
              <Text style={styles.profileTagText}>
                {user.height || "—"}cm / {user.weight || "—"}kg · 常穿 {user.size || "M"}
              </Text>
            </View>
          </View>
        </View>

        <LinearGradient
          colors={["#1E262A", "#384347", "#5A4A43"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.member}
        >
          <Text style={styles.memberKicker}>TRAVEL MEMBER</Text>
          <Text style={styles.memberTitle}>
            {user.memberLevel || "旅行会员"} · 免押额度 ¥
            {(user.depositCredit || 0).toLocaleString("zh-CN")}
          </Text>
          <Text style={styles.memberText}>生日月 8 折 · 优先档期 · 专属客服</Text>
          <Pressable onPress={() => toast("会员中心将在下一版开放")} style={styles.memberBtn}>
            <Text style={styles.memberBtnText}>查看权益</Text>
          </Pressable>
        </LinearGradient>

        <View style={styles.stats}>
          <Stat value={stats.orders} label="订单" />
          <Stat value={stats.favorites} label="收藏" />
          <Stat value={`¥${(user.depositCredit || 0).toLocaleString("zh-CN")}`} label="免押额度" />
        </View>

        <View style={styles.shortcuts}>
          {shortcuts.map((item) => (
            <Pressable
              key={item.label}
              style={styles.shortcut}
              onPress={() => navigation.navigate("Orders", { filter: "all" })}
            >
              <View style={styles.shortcutIcon}>
                <Ionicons name={item.icon} size={18} color={colors.coral2} />
                {item.count ? (
                  <View style={styles.shortcutBadge}>
                    <Text style={styles.shortcutBadgeText}>{item.count}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.shortcutLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.menu}>
          <MenuItem icon="bag-outline" label="我的订单" onPress={() => navigation.navigate("Orders", { filter: "all" })} />
          <MenuItem icon="location-outline" label="收货地址" onPress={openAddress} />
          <MenuItem icon="shield-checkmark-outline" label="账号与安全" onPress={() => navigation.navigate("Account")} />
          <MenuItem icon="body-outline" label="身材档案" onPress={() => toast("身材档案将在下一版开放")} />
          <MenuItem icon="heart-outline" label="我的收藏" onPress={() => toast("收藏夹将在下一版开放")} />
          <MenuItem icon="chatbubble-ellipses-outline" label="客服与帮助" onPress={() => toast("客服将在 1 分钟内回复")} />
          <MenuItem
            icon="log-out-outline"
            label="退出登录"
            danger
            onPress={() =>
              Alert.alert("退出登录", "确认退出当前账号？", [
                { text: "取消", style: "cancel" },
                { text: "退出", style: "destructive", onPress: () => signOut() },
              ])
            }
          />
        </View>
      </ScrollView>

      <BottomSheet
        visible={addressVisible}
        onClose={() => setAddressVisible(false)}
        title="收货地址"
        subtitle="衣服会送到酒店 / 民宿前台，请填写可代收的地址。"
        footer={<AppButton title="保存地址" onPress={saveAddress} loading={saving} variant="dark" />}
      >
        <Field
          label="收货人"
          value={addressDraft.name}
          onChangeText={(name) => setAddressDraft((current) => ({ ...current, name }))}
          placeholder="姓名"
        />
        <Field
          label="手机号"
          value={addressDraft.phone}
          onChangeText={(phone) => setAddressDraft((current) => ({ ...current, phone }))}
          keyboardType="phone-pad"
          maxLength={11}
          placeholder="11 位手机号"
        />
        <Field
          label="详细地址"
          value={addressDraft.text}
          onChangeText={(value) => setAddressDraft((current) => ({ ...current, text: value }))}
          placeholder="例如：三亚亚龙湾云汀度假酒店 · 前台代收"
          multiline
        />
        {addressError ? <Text style={styles.error}>{addressError}</Text> : null}
      </BottomSheet>
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

function MenuItem({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.65 }]}
      onPress={onPress}
    >
      <View style={styles.menuIcon}>
        <Ionicons name={icon} size={17} color={danger ? colors.coral2 : colors.ink2} />
      </View>
      <Text style={[styles.menuLabel, danger && { color: colors.coral2 }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={15} color={colors.muted2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 108 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pageTitle: { fontFamily: font.medium, fontSize: 28, fontWeight: "800", letterSpacing: -1.1, color: colors.ink },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  userRow: { flexDirection: "row", alignItems: "center", gap: 13, marginTop: 18 },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  name: { fontFamily: font.medium, fontSize: 22, fontWeight: "800", letterSpacing: -0.6, color: colors.ink },
  userMeta: { fontSize: 9.5, color: colors.muted, marginTop: 4 },
  profileTag: {
    alignSelf: "flex-start",
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginTop: 6,
  },
  profileTagText: { fontSize: 8, color: colors.muted },
  member: {
    borderRadius: radius.xl,
    padding: 17,
    marginTop: 18,
    ...shadow(2),
  },
  memberKicker: { fontSize: 7.5, letterSpacing: 1.8, color: "rgba(255,255,255,0.42)" },
  memberTitle: { fontFamily: font.medium, fontSize: 17, fontWeight: "700", color: colors.white, marginTop: 8, letterSpacing: -0.3 },
  memberText: { fontSize: 8.5, color: "rgba(255,255,255,0.52)", marginTop: 5 },
  memberBtn: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 13,
  },
  memberBtnText: { fontSize: 8.5, color: colors.white },
  stats: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingVertical: 13,
    marginTop: 13,
    ...shadow(1),
  },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontFamily: font.medium, fontSize: 18, fontWeight: "800", color: colors.ink },
  statLabel: { fontSize: 8, color: colors.muted, marginTop: 3 },
  shortcuts: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingVertical: 12,
    marginTop: 13,
    ...shadow(1),
  },
  shortcut: { flex: 1, alignItems: "center", gap: 6 },
  shortcutIcon: { position: "relative" },
  shortcutBadge: {
    position: "absolute",
    right: -8,
    top: -5,
    backgroundColor: colors.coral,
    borderRadius: 7,
    minWidth: 14,
    height: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  shortcutBadgeText: { fontSize: 7, color: colors.white, fontWeight: "700" },
  shortcutLabel: { fontSize: 8.5, color: colors.ink2 },
  menu: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    marginTop: 13,
    ...shadow(1),
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  menuIcon: { width: 26, alignItems: "center" },
  menuLabel: { flex: 1, fontSize: 11.5, color: colors.ink2 },
  error: { color: colors.coral2, fontSize: 10, marginTop: 8 },
});
