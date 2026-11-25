import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { api, ApiError } from "../api/client";
import { APP_NAME, APP_VERSION, STORAGE_KEYS, serverOrigin } from "../config";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { AppButton, Field } from "../components/ui";
import { ApiSettingsSheet } from "../components/ApiSettingsSheet";
import { colors, font, radius, shadow, text } from "../theme";

export function LoginScreen() {
  const { signInPhone, signInWechat, apiBase } = useApp();
  const toast = useToast();
  const [phone, setPhone] = useState("13800000001");
  const [code, setCode] = useState("");
  const [wechatCode, setWechatCode] = useState("wx-demo-3");
  const [busy, setBusy] = useState<"phone" | "wechat" | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [settingsVisible, setSettingsVisible] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.wechatCode)
      .then((stored) => {
        if (stored) setWechatCode(stored);
      })
      .catch(() => undefined);
  }, []);

  const sendCode = async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError("请输入正确的 11 位手机号");
      return;
    }
    setSending(true);
    setError("");
    try {
      const data = await api.sendCode(phone);
      if (data.devCode) {
        setCode(data.devCode);
        toast(`验证码 ${data.devCode}（本地演示）`);
      } else {
        toast("验证码已发送");
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "验证码发送失败");
    } finally {
      setSending(false);
    }
  };

  const loginPhone = async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError("请输入正确的手机号");
      return;
    }
    if (!code) {
      setError("请输入验证码，或点击获取验证码");
      return;
    }
    setBusy("phone");
    setError("");
    try {
      const isNew = await signInPhone(phone, code);
      toast(isNew ? "账号已创建，欢迎来到三亚" : "欢迎回来");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "登录失败");
    } finally {
      setBusy(null);
    }
  };

  const loginWechat = async () => {
    if (!wechatCode.trim()) {
      setError("请输入微信模拟授权码");
      return;
    }
    setBusy("wechat");
    setError("");
    try {
      const isNew = await signInWechat(wechatCode.trim());
      await AsyncStorage.setItem(STORAGE_KEYS.wechatCode, wechatCode.trim());
      toast(isNew ? "微信账号已创建，可稍后绑定手机号" : "微信登录成功");
    } catch (nextError) {
      setError(nextError instanceof ApiError ? nextError.message : "微信登录失败");
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.top}>
            <View style={styles.brand}>
              <View style={styles.mark}>
                <Text style={styles.markText}>未</Text>
              </View>
              <View>
                <Text style={styles.brandName}>{APP_NAME}</Text>
                <Text style={styles.brandSub}>UNTITLED PROJECT · TRAVEL WARDROBE</Text>
              </View>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>三亚首发</Text>
            </View>
          </View>

          <View style={styles.hero}>
            <Text style={styles.eyebrow}>SANYA · 旅行衣橱</Text>
            <Text style={styles.heroTitle}>先登录，{"\n"}再把旅行穿在身上。</Text>
            <Text style={styles.heroText}>
              租衣、妆造、摄影一次约好。手机号或微信登录，账号与订单会保存在服务端。
            </Text>
          </View>

          <LinearGradient
            colors={["rgba(255,255,255,0.98)", "rgba(255,252,247,0.95)"]}
            style={styles.card}
          >
            <View style={styles.cardHead}>
              <Text style={styles.cardTitle}>手机号登录</Text>
              <Text style={styles.cardHint}>本地演示 · 无需真实短信</Text>
            </View>
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
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="固定验证码 123456"
                style={{ flex: 1, marginBottom: 0 }}
              />
              <AppButton
                title={sending ? "发送中" : "获取验证码"}
                onPress={sendCode}
                variant="soft"
                size="sm"
                loading={sending}
                style={styles.codeButton}
              />
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <AppButton
              title="登录 / 注册"
              onPress={loginPhone}
              variant="dark"
              size="lg"
              loading={busy === "phone"}
              style={styles.primary}
            />
            <View style={styles.or}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>或使用微信</Text>
              <View style={styles.orLine} />
            </View>
            <Field
              label="微信模拟授权码"
              value={wechatCode}
              onChangeText={setWechatCode}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="wx-demo-3"
            />
            <AppButton
              title="微信一键登录（本地模拟）"
              onPress={loginWechat}
              variant="soft"
              size="lg"
              loading={busy === "wechat"}
            />
            <Text style={styles.note}>
              默认手机号 <Text style={styles.noteStrong}>13800000001</Text>，验证码{" "}
              <Text style={styles.noteStrong}>123456</Text>。微信授权码可填{" "}
              <Text style={styles.noteStrong}>wx-demo-3</Text> 体验未绑定手机号的账号。
            </Text>
          </LinearGradient>

          <View style={styles.footer}>
            <Pressable onPress={() => setSettingsVisible(true)} hitSlop={8}>
              <Text style={styles.server}>
                <Ionicons name="server-outline" size={10} color={colors.sea} />{" "}
                {serverOrigin(apiBase)}
              </Text>
            </Pressable>
            <Text style={styles.version}>
              {APP_NAME} · v{APP_VERSION}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <ApiSettingsSheet visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 30 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  mark: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  markText: { color: colors.white, fontSize: 17, fontWeight: "800" },
  brandName: { fontFamily: font.medium, fontSize: 12, letterSpacing: 1, color: colors.ink },
  brandSub: { marginTop: 2, fontSize: 6, letterSpacing: 1.6, color: colors.muted2 },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.seaSoft,
    borderWidth: 1,
    borderColor: "rgba(46,111,142,0.15)",
  },
  badgeText: { fontSize: 8, color: colors.sea2, letterSpacing: 0.5 },
  hero: { paddingTop: 32, paddingBottom: 22 },
  eyebrow: {
    fontFamily: font.medium,
    fontSize: 8,
    letterSpacing: 2,
    color: colors.coral2,
    fontWeight: "700",
    marginBottom: 10,
  },
  heroTitle: {
    fontFamily: font.medium,
    fontSize: 31,
    lineHeight: 38,
    letterSpacing: -1.4,
    fontWeight: "800",
    color: colors.ink,
  },
  heroText: { ...text.bodySmall, marginTop: 12, fontSize: 11, lineHeight: 19, maxWidth: 320 },
  card: {
    borderRadius: radius.xxl,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow(2),
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  cardTitle: { fontFamily: font.medium, fontSize: 15, fontWeight: "700", color: colors.ink },
  cardHint: { fontSize: 8, color: colors.muted2 },
  codeRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  codeButton: { height: 46, paddingHorizontal: 12 },
  error: {
    marginTop: 10,
    marginBottom: 2,
    backgroundColor: colors.coralSoft,
    color: colors.coral2,
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 9,
    fontSize: 10.5,
    lineHeight: 16,
  },
  primary: { marginTop: 14 },
  or: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 16 },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.line },
  orText: { fontSize: 8, color: colors.muted2, letterSpacing: 0.5 },
  note: {
    marginTop: 14,
    textAlign: "center",
    fontSize: 8.5,
    lineHeight: 15,
    color: colors.muted,
  },
  noteStrong: { color: colors.ink2, fontWeight: "700" },
  footer: {
    paddingTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  server: { fontSize: 8.5, color: colors.sea },
  version: { fontSize: 8, color: colors.muted2 },
});
