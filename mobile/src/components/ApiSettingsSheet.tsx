import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { BottomSheet } from "./BottomSheet";
import { AppButton, Field } from "./ui";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { DEFAULT_API_BASE, serverOrigin } from "../config";
import { colors, text } from "../theme";

export function ApiSettingsSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { apiBase, changeApiBase, token } = useApp();
  const toast = useToast();
  const [value, setValue] = useState(apiBase);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setValue(apiBase);
      setError("");
    }
  }, [apiBase, visible]);

  const save = async (target = value) => {
    setSaving(true);
    setError("");
    try {
      await changeApiBase(target);
      toast(token ? "服务地址已更新，数据已重新同步" : "服务地址可用");
      onClose();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "连接失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="服务地址"
      subtitle="手机与后端需在同一网络；模拟器可用电脑的局域网 IP。"
      footer={
        <>
          <AppButton
            title="测试并保存"
            onPress={() => save()}
            loading={saving}
            variant="dark"
          />
          <AppButton
            title="恢复当前默认地址"
            onPress={() => {
              setValue(DEFAULT_API_BASE);
              save(DEFAULT_API_BASE);
            }}
            variant="ghost"
            size="sm"
          />
        </>
      }
    >
      <Field
        label="API Base URL"
        value={value}
        onChangeText={setValue}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        placeholder="http://192.168.1.10:3000/api"
        hint={`当前服务：${serverOrigin(apiBase)}`}
      />
      <View style={styles.tip}>
        <Text style={styles.tipTitle}>真机连接提示</Text>
        <Text style={styles.tipText}>
          在电脑上启动 `server` 后，查看启动日志里的“局域网访问”地址，把 `http://电脑IP:3000/api`
          填到这里。iOS 和 Android 都已允许本地 HTTP 调试。
        </Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  tip: {
    backgroundColor: colors.seaSoft,
    borderRadius: 13,
    padding: 13,
    marginTop: 2,
  },
  tipTitle: { ...text.label, color: colors.sea2, marginBottom: 5 },
  tipText: { ...text.bodySmall, color: colors.sea2, fontSize: 9.5, lineHeight: 16 },
  error: {
    marginTop: 10,
    color: colors.coral2,
    backgroundColor: colors.coralSoft,
    borderRadius: 9,
    padding: 10,
    fontSize: 10.5,
    lineHeight: 16,
  },
});
