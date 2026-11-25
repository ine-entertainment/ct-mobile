import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useAppNavigation } from "../lib/appNavigation";
import { useApp } from "../context/AppContext";
import { AppButton } from "../components/ui";
import { Order } from "../types";
import { colors, radius, shadow, text } from "../theme";

export function SuccessScreen() {
  const navigation = useAppNavigation();
  const params = useLocalSearchParams<{ orderId: string }>();
  const { orders, fetchOrder } = useApp();
  const orderId = params.orderId;
  const [order, setOrder] = useState<Order | null>(
    orders.find((item) => item.id === orderId) || null
  );

  useEffect(() => {
    if (!order) {
      fetchOrder(orderId).then(setOrder).catch(() => undefined);
    }
  }, [fetchOrder, order, orderId]);

  const isPhoto = order?.type === "photo";

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.body}>
        <View style={styles.mark}>
          <Ionicons name="checkmark" size={38} color={colors.white} />
        </View>
        <Text style={styles.title}>支付成功</Text>
        <Text style={styles.subtitle}>
          {isPhoto
            ? "摄影师将在 2 小时内确认档期\n行前可随时沟通拍摄细节"
            : "商家将在 24 小时内消毒打包\n送到酒店前台，离店归还"}
        </Text>

        {order ? (
          <View style={styles.card}>
            <Row label="订单号" value={order.orderNo} />
            <Row label={isPhoto ? "服务" : "商品"} value={order.title} />
            <Row label={isPhoto ? "已付定金" : "实付"} value={`¥${order.paid}`} />
            <Row
              label={isPhoto ? "尾款" : "押金"}
              value={isPhoto ? `¥${order.balance}` : `¥${order.deposit} · 可退`}
            />
          </View>
        ) : null}

        <View style={styles.actions}>
          <AppButton
            title="查看订单"
            onPress={() => {
              if (!order) return;
              navigation.reset({
                index: 2,
                routes: [
                  { name: "Main", params: { screen: "Profile" } },
                  { name: "Orders", params: { filter: "all" } },
                  { name: "OrderDetail", params: { orderId: order.id } },
                ],
              });
            }}
            variant="dark"
            size="lg"
          />
          <AppButton
            title="返回首页"
            onPress={() =>
              navigation.reset({
                index: 0,
                routes: [{ name: "Main", params: { screen: "Home" } }],
              })
            }
            variant="ghost"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.rowValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  body: { flex: 1, paddingHorizontal: 26, paddingTop: 72, alignItems: "center" },
  mark: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.coral,
    alignItems: "center",
    justifyContent: "center",
    ...shadow(2),
  },
  title: { ...text.h1, fontSize: 27, marginTop: 20 },
  subtitle: { ...text.bodySmall, textAlign: "center", lineHeight: 20, marginTop: 9 },
  card: {
    width: "100%",
    marginTop: 30,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 4,
    ...shadow(1),
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  rowLabel: { fontSize: 10.5, color: colors.muted },
  rowValue: { flex: 1, textAlign: "right", fontSize: 11.5, fontWeight: "600", color: colors.ink },
  actions: { width: "100%", gap: 10, marginTop: 30 },
});
