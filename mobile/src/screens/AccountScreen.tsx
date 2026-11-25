import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useAppNavigation } from "../lib/appNavigation";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { ScreenHeader } from "../components/ScreenHeader";
import { BottomSheet } from "../components/BottomSheet";
import { ApiSettingsSheet } from "../components/ApiSettingsSheet";
import { AppButton, Field } from "../components/ui";
import { RemoteImage } from "../components/RemoteImage";
import { api } from "../api/client";
import { BindConflict } from "../types";
import { colors, font, radius, shadow, text } from "../theme";

export function AccountScreen() {
  const navigation = useAppNavigation();
  const insets = useSafeAreaInsets();
  const {
    user,
    bindPhone,
    bindWechat,
    mergeAccounts,
    unbindIdentity,
    updateProfile,
    signOut,
    apiBase,
  } = useApp();
  const toast = useToast();
  const [nicknameVisible, setNicknameVisible] = useState(false);
  const [nickname, setNickname] = useState(user?.nickname || "");
  const [phoneVisible, setPhoneVisible] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [wechatVisible, setWechatVisible] = useState(false);
  const [wechatCode, setWechatCode] = useState("");
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [merge, setMerge] = useState<BindConflict | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const identityCount = useMemo(
    () => (user?.hasPhone ? 1 : 0) + (user?.hasWechat ? 1 : 0),
    [user?.hasPhone, user?.hasWechat]
  );

  if (!user) return null;

  const saveNickname = async () => {
    if (!nickname.trim()) return setError("昵称不能为空");
    setBusy(true);
    setError("");
    try {
      await updateProfile({ nickname: nickname.trim() });
      setNicknameVisible(false);
      toast("昵称已更新");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "保存失败");
    } finally {
      setBusy(false);
    }
  };

  const sendPhoneCode = async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) return setError("请输入正确的手机号");
    setSendingCode(true);
    setError("");
    try {
      const result = await api.sendCode(phone);
      if (result.devCode) {
        setPhoneCode(result.devCode);
        toast(`验证码 ${result.devCode}（本地演示）`);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "发送失败");
    } finally {
      setSendingCode(false);
    }
  };

  const submitPhone = async () => {
    if (!phone || !phoneCode) return setError("请填写手机号和验证码");
    setBusy(true);
    setError("");
    try {
      const result = await bindPhone(phone, phoneCode);
      if (result.kind === "conflict") {
        setPhoneVisible(false);
        setMerge(result.conflict);
        return;
      }
      setPhoneVisible(false);
      toast("手机号已绑定");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "绑定失败");
    } finally {
      setBusy(false);
    }
  };

  const submitWechat = async () => {
    if (!wechatCode.trim()) return setError("请输入微信授权码");
    setBusy(true);
    setError("");
    try {
      const result = await bindWechat(wechatCode.trim());
      if (result.kind === "conflict") {
        setWechatVisible(false);
        setMerge(result.conflict);
        return;
      }
      setWechatVisible(false);
      toast("微信已绑定");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "绑定失败");
    } finally {
      setBusy(false);
    }
  };

  const doMerge = async (keep: "current" | "target") => {
    if (!merge) return;
    setBusy(true);
    try {
      await mergeAccounts(merge.ticketId, keep);
      setMerge(null);
      toast("账号已合并，登录身份已更新");
    } catch (nextError) {
      toast(nextError instanceof Error ? nextError.message : "合并失败");
    } finally {
      setBusy(false);
    }
  };

  const unbind = (type: "phone" | "wechat") => {
    if (identityCount <= 1) {
      toast("至少保留一种登录方式，请先绑定另一种身份");
      return;
    }
    Alert.alert(
      type === "phone" ? "解绑手机号" : "解绑微信",
      "解绑后该身份不能用于登录，确认继续？",
      [
        { text: "取消", style: "cancel" },
        {
          text: "解绑",
          style: "destructive",
          onPress: async () => {
            try {
              await unbindIdentity(type);
              toast("已解绑");
            } catch (nextError) {
              toast(nextError instanceof Error ? nextError.message : "解绑失败");
            }
          },
        },
      ]
    );
  };

  const openPhone = () => {
    setPhone("");
    setPhoneCode("");
    setError("");
    setPhoneVisible(true);
  };
  const openWechat = () => {
    setWechatCode("");
    setError("");
    setWechatVisible(true);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar style="dark" />
      <ScreenHeader title="账号与安全" onBack={() => navigation.goBack()} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: 40 + insets.bottom }]}
      >
        <View style={styles.profile}>
          <RemoteImage name={user.avatar || "model-2"} style={styles.avatar} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user.nickname}</Text>
            <Text style={styles.uid}>{user.id}</Text>
            <Text style={styles.contact}>
              {user.hasPhone ? `手机 ${user.phoneMasked}` : "微信账号"}
              {user.hasWechat ? " · 微信已绑定" : ""}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              setNickname(user.nickname);
              setError("");
              setNicknameVisible(true);
            }}
            style={styles.editButton}
          >
            <Text style={styles.editButtonText}>修改昵称</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>登录方式</Text>
            <Text style={styles.cardHint}>一个账号最多绑定一个手机号、一个微信</Text>
          </View>
          <View style={styles.identity}>
            <View style={styles.identityIcon}>
              <Ionicons name="phone-portrait-outline" size={18} color={colors.sea} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.identityTitle}>手机号</Text>
              <Text style={styles.identityValue}>{user.hasPhone ? user.phoneMasked : "未绑定"}</Text>
            </View>
            <Pressable
              onPress={() => (user.hasPhone ? unbind("phone") : openPhone())}
              style={[styles.identityAction, !user.hasPhone && styles.identityActionPrimary]}
            >
              <Text
                style={[
                  styles.identityActionText,
                  !user.hasPhone && styles.identityActionTextPrimary,
                ]}
              >
                {user.hasPhone ? "解绑" : "绑定"}
              </Text>
            </Pressable>
          </View>
          <View style={styles.identity}>
            <View style={[styles.identityIcon, styles.wechatIcon]}>
              <Text style={styles.wechatMark}>微</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.identityTitle}>微信</Text>
              <Text style={styles.identityValue}>{user.hasWechat ? user.wechatMasked : "未绑定"}</Text>
            </View>
            <Pressable
              onPress={() => (user.hasWechat ? unbind("wechat") : openWechat())}
              style={[styles.identityAction, !user.hasWechat && styles.identityActionPrimary]}
            >
              <Text
                style={[
                  styles.identityActionText,
                  !user.hasWechat && styles.identityActionTextPrimary,
                ]}
              >
                {user.hasWechat ? "解绑" : "绑定"}
              </Text>
            </Pressable>
          </View>
          {identityCount <= 1 ? (
            <Text style={styles.hint}>
              至少保留一种登录方式，绑定另一种身份后才能解绑当前身份。</Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>账号规则</Text>
            <Text style={styles.cardHint}>关于绑定与合并</Text>
          </View>
          {[
            "手机号与微信可以分别登录；绑定后可用任一方式进入同一账号。",
            "如果该手机号 / 微信已属于另一个账号，系统会要求先合并账号，不会重复创建。",
            "合并时可选择保留当前或对方账号，订单、收藏和登录身份会一并迁移。",
          ].map((rule, index) => (
            <View key={rule} style={styles.rule}>
              <View style={styles.ruleIndex}>
                <Text style={styles.ruleIndexText}>{index + 1}</Text>
              </View>
              <Text style={styles.ruleText}>{rule}</Text>
            </View>
          ))}
        </View>

        <View style={styles.demo}>
          <Text style={styles.demoTitle}>本地联调提示</Text>
          <Text style={styles.demoText}>
            用 13800000001 登录后绑定微信 wx-demo-2，会触发与「阿梨」的合并流程；微信 wx-demo-3 是未绑定手机号的测试账号。</Text>
        </View>

        <Pressable onPress={() => setSettingsVisible(true)} style={styles.serverRow}>
          <Ionicons name="server-outline" size={15} color={colors.sea} />
          <Text style={styles.serverText}>{apiBase}</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.muted2} />
        </Pressable>

        <AppButton title="退出登录" onPress={signOut} variant="ghost" style={{ marginTop: 10 }} />
        <Text style={styles.footer}>未命名项目 · 原生 App v1.0 · 账号服务已连接</Text>
      </ScrollView>

      <BottomSheet
        visible={nicknameVisible}
        onClose={() => setNicknameVisible(false)}
        title="修改昵称"
        footer={<AppButton title="保存" onPress={saveNickname} loading={busy} variant="dark" />}
      >
        <Field label="昵称" value={nickname} onChangeText={setNickname} maxLength={20} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </BottomSheet>

      <BottomSheet
        visible={phoneVisible}
        onClose={() => setPhoneVisible(false)}
        title="绑定手机号"
        subtitle="绑定后可用手机号或微信任意一种方式登录同一账号。"
        footer={<AppButton title="确认绑定" onPress={submitPhone} loading={busy} variant="dark" />}
      >
        <Field
          label="手机号"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          maxLength={11}
          placeholder="请输入手机号"
        />
        <View style={styles.codeRow}>
          <Field
            label="验证码"
            value={phoneCode}
            onChangeText={setPhoneCode}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="固定验证码 123456"
            style={{ flex: 1, marginBottom: 0 }}
          />
          <AppButton
            title={sendingCode ? "发送中" : "获取验证码"}
            onPress={sendPhoneCode}
            loading={sendingCode}
            variant="soft"
            size="sm"
            style={{ height: 46 }}
          />
        </View>
        <Text style={styles.sheetNote}>如果该手机号已属于其他账号，会进入账号合并确认。</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </BottomSheet>

      <BottomSheet
        visible={wechatVisible}
        onClose={() => setWechatVisible(false)}
        title="绑定微信"
        subtitle="本地演示使用模拟授权码代替真实微信授权。"
        footer={<AppButton title="确认绑定" onPress={submitWechat} loading={busy} variant="dark" />}
      >
        <Field
          label="微信模拟授权码"
          value={wechatCode}
          onChangeText={setWechatCode}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="例如 wx-demo-2"
        />
        <Text style={styles.sheetNote}>如果该微信已属于其他账号，会进入账号合并确认。</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </BottomSheet>

      <BottomSheet
        visible={!!merge}
        onClose={() => setMerge(null)}
        title="需要合并账号"
        subtitle="这个登录身份已经属于另一个账号。合并后，订单、收藏和登录方式会迁移到保留的账号，另一账号将被删除。"
        footer={
          <>
            <AppButton
              title={`保留当前账号（${merge?.current.nickname || ""}）`}
              onPress={() => doMerge("current")}
              loading={busy}
            />
            <AppButton
              title={`保留对方账号（${merge?.target.nickname || ""}）`}
              onPress={() => doMerge("target")}
              loading={busy}
              variant="ghost"
            />
          </>
        }
      >
        <View style={styles.compare}>
          <MergeAccount label="当前账号" account={merge?.current} />
          <View style={styles.compareMiddle}>
            <Text style={styles.compareText}>合并</Text>
          </View>
          <MergeAccount label="身份所属账号" account={merge?.target} />
        </View>
        <Text style={styles.sheetNote}>
          保留哪个账号，资料和昵称就以哪个账号为准。合并后当前登录会话会刷新。</Text>
      </BottomSheet>

      <ApiSettingsSheet visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
    </SafeAreaView>
  );
}

function MergeAccount({
  label,
  account,
}: {
  label: string;
  account?: BindConflict["current"];
}) {
  return (
    <View style={styles.compareCard}>
      <Text style={styles.compareLabel}>{label}</Text>
      <RemoteImage name={account?.avatar || "model-2"} style={styles.compareAvatar} />
      <Text style={styles.compareName}>{account?.nickname || "—"}</Text>
      <Text style={styles.compareContact}>
        {account?.phoneMasked || account?.wechatMasked || ""}
      </Text>
      <Text style={styles.compareOrders}>{account?.orderCount || 0} 个订单</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  scroll: { paddingHorizontal: 20, paddingTop: 4 },
  profile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.ink,
    borderRadius: radius.xl,
    padding: 16,
    ...shadow(2),
  },
  avatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: "rgba(255,255,255,0.2)" },
  name: { fontFamily: font.medium, fontSize: 18, fontWeight: "800", color: colors.white },
  uid: { fontSize: 7.5, color: "rgba(255,255,255,0.35)", marginTop: 3 },
  contact: { fontSize: 8.5, color: "rgba(255,255,255,0.65)", marginTop: 4 },
  editButton: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  editButtonText: { fontSize: 8.5, color: colors.white },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 15, marginTop: 12, ...shadow(1) },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 6 },
  cardTitle: { ...text.h3, fontSize: 13 },
  cardHint: { fontSize: 7.5, color: colors.muted2, flexShrink: 1, textAlign: "right" },
  identity: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  identityIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.seaSoft, alignItems: "center", justifyContent: "center" },
  wechatIcon: { backgroundColor: colors.greenSoft },
  wechatMark: { fontSize: 12, fontWeight: "700", color: colors.green },
  identityTitle: { fontSize: 11.5, fontWeight: "600", color: colors.ink },
  identityValue: { fontSize: 9, color: colors.muted, marginTop: 3 },
  identityAction: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  identityActionPrimary: { backgroundColor: colors.coral, borderColor: colors.coral },
  identityActionText: { fontSize: 9, color: colors.muted },
  identityActionTextPrimary: { color: colors.white, fontWeight: "700" },
  hint: { fontSize: 8, color: colors.muted, lineHeight: 14, marginTop: 8 },
  rule: { flexDirection: "row", gap: 9, paddingVertical: 7 },
  ruleIndex: { width: 17, height: 17, borderRadius: 9, backgroundColor: colors.cream2, alignItems: "center", justifyContent: "center", marginTop: 1 },
  ruleIndexText: { fontSize: 8, color: colors.coral2, fontWeight: "700" },
  ruleText: { flex: 1, fontSize: 9.5, lineHeight: 16, color: colors.ink2 },
  demo: { backgroundColor: colors.seaSoft, borderRadius: 14, padding: 13, marginTop: 12 },
  demoTitle: { fontSize: 10, fontWeight: "700", color: colors.sea2 },
  demoText: { fontSize: 8.8, lineHeight: 15, color: colors.sea2, marginTop: 5 },
  serverRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 14, paddingHorizontal: 4 },
  serverText: { flex: 1, fontSize: 8.5, color: colors.sea },
  footer: { textAlign: "center", fontSize: 7.5, color: colors.muted2, marginTop: 16 },
  codeRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  sheetNote: { fontSize: 8.5, lineHeight: 15, color: colors.muted, marginTop: 6 },
  error: { fontSize: 9.5, lineHeight: 15, color: colors.coral2, marginTop: 8 },
  compare: { flexDirection: "row", alignItems: "stretch", gap: 8, marginBottom: 4 },
  compareMiddle: { justifyContent: "center" },
  compareText: { fontSize: 8, color: colors.muted2 },
  compareCard: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: 13, backgroundColor: colors.cream, padding: 10, alignItems: "center" },
  compareLabel: { fontSize: 7, color: colors.muted2, marginBottom: 7 },
  compareAvatar: { width: 38, height: 38, borderRadius: 19 },
  compareName: { fontSize: 10.5, fontWeight: "700", color: colors.ink, marginTop: 6 },
  compareContact: { fontSize: 8, color: colors.muted, marginTop: 3 },
  compareOrders: { fontSize: 8, color: colors.coral2, marginTop: 5 },
});
