import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { ApiSettingsSheet } from "./ApiSettingsSheet";
import { AppButton } from "./ui";
import { colors, font, radius, text } from "../theme";

export function BootSplash() {
  return (
    <View style={styles.loading}>
      <StatusBar style="dark" />
      <View style={styles.mark}>
        <Text style={styles.markText}>未</Text>
      </View>
      <ActivityIndicator color={colors.coral} style={{ marginTop: 20 }} />
      <Text style={styles.loadingText}>正在打开你的旅行衣橱…</Text>
    </View>
  );
}

export function BootErrorScreen() {
  const { bootError, apiBase, retryBootstrap, signOut } = useApp();
  const toast = useToast();
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [retrying, setRetrying] = useState(false);

  return (
    <SafeAreaView style={styles.errorRoot}>
      <StatusBar style="dark" />
      <View style={styles.errorBody}>
        <View style={styles.mark}>
          <Text style={styles.markText}>未</Text>
        </View>
        <Text style={styles.errorTitle}>暂时连不上服务</Text>
        <Text style={styles.errorText}>{bootError}</Text>
        <Text style={styles.server}>{apiBase}</Text>
        <View style={styles.actions}>
          <AppButton
            title="重试"
            variant="dark"
            loading={retrying}
            onPress={async () => {
              setRetrying(true);
              try {
                await retryBootstrap();
              } catch (error) {
                toast(error instanceof Error ? error.message : "连接失败");
              } finally {
                setRetrying(false);
              }
            }}
          />
          <AppButton
            title="修改服务地址"
            variant="ghost"
            onPress={() => setSettingsVisible(true)}
          />
          <Pressable onPress={() => signOut()} style={styles.logout}>
            <Text style={styles.logoutText}>退出当前账号</Text>
          </Pressable>
        </View>
      </View>
      <ApiSettingsSheet visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  mark: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  markText: { color: colors.white, fontSize: 24, fontWeight: "800" },
  loadingText: { ...text.bodySmall, marginTop: 12 },
  errorRoot: { flex: 1, backgroundColor: colors.cream },
  errorBody: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28 },
  errorTitle: { ...text.h2, marginTop: 20 },
  errorText: {
    ...text.bodySmall,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 9,
    maxWidth: 300,
  },
  server: {
    marginTop: 10,
    fontSize: 8.5,
    color: colors.sea,
    backgroundColor: colors.seaSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  actions: { width: "100%", gap: 9, marginTop: 26 },
  logout: { alignItems: "center", paddingTop: 8 },
  logoutText: { fontSize: 10, color: colors.coral2, fontFamily: font.medium },
});
