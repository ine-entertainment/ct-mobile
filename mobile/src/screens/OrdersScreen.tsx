import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useAppNavigation } from "../lib/appNavigation";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { ScreenHeader } from "../components/ScreenHeader";
import { OrderCard } from "../components/OrderCard";
import { BottomSheet } from "../components/BottomSheet";
import { AppButton, EmptyView, LoadingView } from "../components/ui";
import { photoSlots } from "../lib/date";
import { Order, OrderFilter } from "../types";
import { colors, font, radius, text } from "../theme";

export function OrdersScreen() {
  const navigation = useAppNavigation();
  const params = useLocalSearchParams<{ filter?: string }>();
  const { orders, refreshOrders, refundOrder, reschedulePhoto } = useApp();
  const toast = useToast();
  const [filter, setFilter] = useState<OrderFilter>((params.filter as OrderFilter) || "all");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(orders.length === 0);
  const [rescheduleOrder, setRescheduleOrder] = useState<Order | null>(null);
  const [slot, setSlot] = useState(photoSlots()[0]);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        await refreshOrders();
      } catch (error) {
        toast(error instanceof Error ? error.message : "订单加载失败");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [refreshOrders, toast]
  );

  useFocusEffect(
    useCallback(() => {
      load(true);
    }, [load])
  );

  const list = useMemo(
    () => (filter === "all" ? orders : orders.filter((order) => order.type === filter)),
    [filter, orders]
  );

  const doRefund = (order: Order) => {
    Alert.alert("申请退款", "确认提交退款申请？客服会在 1 个工作日内处理。", [
      { text: "取消", style: "cancel" },
      {
        text: "提交",
        style: "destructive",
        onPress: async () => {
          try {
            await refundOrder(order.id);
            toast("退款申请已提交");
          } catch (error) {
            toast(error instanceof Error ? error.message : "退款申请失败");
          }
        },
      },
    ]);
  };

  const openReschedule = (order: Order) => {
    setRescheduleOrder(order);
    setSlot(photoSlots()[0]);
  };

  const submitReschedule = async () => {
    if (!rescheduleOrder) return;
    setSubmitting(true);
    try {
      await reschedulePhoto(rescheduleOrder.id, slot);
      setRescheduleOrder(null);
      toast("改期申请已提交，等待摄影师确认");
    } catch (error) {
      toast(error instanceof Error ? error.message : "改期失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar style="dark" />
      <ScreenHeader
        title="我的订单"
        onBack={() => navigation.goBack()}
        right={
          <Pressable onPress={() => load(true)} hitSlop={8}>
            <Ionicons name="refresh-outline" size={19} color={colors.ink} />
          </Pressable>
        }
      />
      <View style={styles.segment}>
        {[
          ["all", "全部"],
          ["rental", "租衣"],
          ["photo", "摄影"],
        ].map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => setFilter(key as OrderFilter)}
            style={[styles.segmentItem, filter === key && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, filter === key && styles.segmentTextActive]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load(true);
            }}
            tintColor={colors.coral}
          />
        }
      >
        {loading ? <LoadingView label="正在读取订单…" /> : null}
        {!loading && list.length === 0 ? (
          <EmptyView title="还没有订单" hint="去首页看看今天的可租款吧" />
        ) : null}
        {list.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            onPress={() => navigation.navigate("OrderDetail", { orderId: order.id })}
            onRefund={() => doRefund(order)}
            onContact={() => toast(order.type === "photo" ? "摄影师会在 10 分钟内回复" : "商家会在 10 分钟内回复")}
            onRebook={() => {
              if (order.productId) navigation.navigate("Product", { productId: order.productId });
              else navigation.navigate("Photo");
            }}
            onReschedule={() => openReschedule(order)}
          />
        ))}
      </ScrollView>

      <BottomSheet
        visible={!!rescheduleOrder}
        onClose={() => setRescheduleOrder(null)}
        title="申请改期"
        subtitle="提前 48 小时可免费改期一次。提交后由摄影师确认新档期。"
        footer={<AppButton title="提交改期申请" onPress={submitReschedule} loading={submitting} />}
      >
        <Text style={styles.slotLabel}>新的拍摄档期</Text>
        <View style={styles.slots}>
          {photoSlots().map((item) => (
            <Pressable
              key={item}
              onPress={() => setSlot(item)}
              style={[styles.slot, slot === item && styles.slotActive]}
            >
              <Text style={[styles.slotText, slot === item && styles.slotTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  segment: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  segmentItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  segmentActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  segmentText: { fontFamily: font.medium, fontSize: 10, color: colors.muted },
  segmentTextActive: { color: colors.white, fontWeight: "700" },
  scroll: { paddingTop: 4, paddingBottom: 40 },
  slotLabel: { ...text.label, marginBottom: 8 },
  slots: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingBottom: 6 },
  slot: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: colors.card,
  },
  slotActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  slotText: { fontSize: 10, color: colors.ink2, fontWeight: "600" },
  slotTextActive: { color: colors.white },
});
