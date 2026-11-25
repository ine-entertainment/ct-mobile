import React, { useCallback, useEffect, useState } from "react";
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
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useAppNavigation } from "../lib/appNavigation";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { ScreenHeader } from "../components/ScreenHeader";
import { Timeline } from "../components/Timeline";
import { BottomSheet } from "../components/BottomSheet";
import { AppButton, LoadingView, StatusBadge } from "../components/ui";
import { RemoteImage } from "../components/RemoteImage";
import { photoSlots } from "../lib/date";
import { Order } from "../types";
import { colors, font, radius, shadow, text } from "../theme";

export function OrderDetailScreen() {
  const navigation = useAppNavigation();
  const params = useLocalSearchParams<{ orderId: string }>();
  const insets = useSafeAreaInsets();
  const {
    orders,
    fetchOrder,
    refundOrder,
    returnOrder,
    reschedulePhoto,
  } = useApp();
  const toast = useToast();
  const orderId = params.orderId;
  const [order, setOrder] = useState<Order | null>(
    orders.find((item) => item.id === orderId) || null
  );
  const [loading, setLoading] = useState(!order);
  const [rescheduleVisible, setRescheduleVisible] = useState(false);
  const [slot, setSlot] = useState(photoSlots()[0]);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    try {
      const next = await fetchOrder(orderId);
      setOrder(next);
    } catch (error) {
      toast(error instanceof Error ? error.message : "订单加载失败");
    } finally {
      setLoading(false);
    }
  }, [fetchOrder, orderId, toast]);

  useEffect(() => {
    if (!order) load();
  }, [load, order]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading || !order) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="订单详情" onBack={() => navigation.goBack()} />
        {loading ? <LoadingView label="正在读取订单…" /> : null}
      </SafeAreaView>
    );
  }

  const isPhoto = order.type === "photo";
  const canRefund = !isPhoto && ["paid", "shipped"].includes(order.statusCode);
  const canReturn = !isPhoto && ["shipped", "in_use"].includes(order.statusCode);
  const canReschedule = isPhoto && ["deposit_paid", "confirmed"].includes(order.statusCode);
  const start = order.startDate ? new Date(`${order.startDate}T00:00:00`) : null;
  const deliveryDay =
    start && !Number.isNaN(start.getTime())
      ? `${start.getMonth() + 1}/${start.getDate()}`
      : "发货后";

  const refund = () => {
    Alert.alert("申请退款", "确认提交退款申请？客服会在 1 个工作日内处理。", [
      { text: "取消", style: "cancel" },
      {
        text: "提交",
        style: "destructive",
        onPress: async () => {
          setWorking(true);
          try {
            setOrder(await refundOrder(order.id));
            toast("退款申请已提交");
          } catch (error) {
            toast(error instanceof Error ? error.message : "退款申请失败");
          } finally {
            setWorking(false);
          }
        },
      },
    ]);
  };

  const doReturn = () => {
    Alert.alert("预约归还", "确认预约归还？骑手会在 2 小时内联系你。", [
      { text: "取消", style: "cancel" },
      {
        text: "确认",
        onPress: async () => {
          setWorking(true);
          try {
            setOrder(await returnOrder(order.id));
            toast("归还预约已提交");
          } catch (error) {
            toast(error instanceof Error ? error.message : "预约失败");
          } finally {
            setWorking(false);
          }
        },
      },
    ]);
  };

  const submitReschedule = async () => {
    setWorking(true);
    try {
      setOrder(await reschedulePhoto(order.id, slot));
      setRescheduleVisible(false);
      toast("改期申请已提交，等待摄影师确认");
    } catch (error) {
      toast(error instanceof Error ? error.message : "改期失败");
    } finally {
      setWorking(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar style="dark" />
      <ScreenHeader
        title={isPhoto ? "摄影订单" : "租衣订单"}
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: 36 + insets.bottom }]}
      >
        <View style={styles.statusCard}>
          <Text style={styles.statusEyebrow}>ORDER STATUS</Text>
          <View style={styles.statusLine}>
            <Text style={styles.statusTitle}>{order.status}</Text>
            <StatusBadge code={order.statusCode} label={order.status} />
          </View>
          <Text style={styles.statusSub}>{order.statusSub}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>订单进度</Text>
          <Timeline steps={order.timeline || []} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{isPhoto ? "服务信息" : "物流信息"}</Text>
          {isPhoto ? (
            <>
              <Info label="摄影师" value={order.merchant} />
              <Info label="档期" value={order.date} />
              <Info label="地点" value="亚龙湾海边" />
              <Info label="含" value="9 张精修 · 全部底片" />
            </>
          ) : (
            <>
              <Info label="配送方式" value={`${order.deliveryLabel || "酒店配送"} · 酒店前台代收`} />
              <Info label="运单号" value={order.statusCode === "paid" ? "发货后显示" : "SF1234 8890 6621"} />
              <Info label="预计送达" value={`${deliveryDay} 14:00 前`} />
              <Info label="商家" value={order.merchant} />
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{isPhoto ? "拍摄套餐" : "商品"}</Text>
          <View style={styles.itemRow}>
            <RemoteImage name={order.image} style={styles.itemImage} />
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{order.title}</Text>
              <Text style={styles.itemMeta}>{order.date}</Text>
              <Text style={styles.itemMeta}>
                {isPhoto ? "含服装建议 / 9 张精修" : `尺码 ${order.size} · 已消毒封签`}
              </Text>
              <Text style={styles.itemPrice}>
                ¥{order.paid}
                {isPhoto ? " 定金" : ""}
              </Text>
            </View>
          </View>
        </View>

        {isPhoto ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>费用</Text>
            <Info label="套餐价" value={`¥${order.paid + order.balance}`} />
            <Info label="已付定金" value={`¥${order.paid}`} />
            <Info label="拍摄前尾款" value={`¥${order.balance}`} />
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>押金</Text>
            <Info label="押金金额" value={`¥${order.deposit}`} />
            <View style={styles.depositBar}>
              <View style={styles.depositFill} />
            </View>
            <Info
              label="状态"
              value={order.depositStatus === "refunded" ? "已原路退回" : "质检后 1-3 个工作日原路退回"}
            />
          </View>
        )}

        <View style={styles.actions}>
          <AppButton
            title="联系客服"
            onPress={() => toast("客服将在 1 分钟内回复")}
            variant="ghost"
          />
          {canRefund ? (
            <AppButton title="申请退款" onPress={refund} loading={working} variant="soft" />
          ) : null}
          {canReschedule ? (
            <AppButton
              title="申请改期"
              onPress={() => setRescheduleVisible(true)}
              variant="dark"
            />
          ) : canReturn ? (
            <AppButton title="预约归还" onPress={doReturn} loading={working} variant="dark" />
          ) : (
            <AppButton
              title="再次租赁"
              onPress={() => {
                if (order.productId) navigation.navigate("Product", { productId: order.productId });
                else navigation.navigate("Photo");
              }}
              variant="dark"
            />
          )}
        </View>
      </ScrollView>

      <BottomSheet
        visible={rescheduleVisible}
        onClose={() => setRescheduleVisible(false)}
        title="申请改期"
        subtitle="提前 48 小时可免费改期一次。提交后由摄影师确认。"
        footer={<AppButton title="提交改期申请" onPress={submitReschedule} loading={working} />}
      >
        <Text style={styles.slotLabel}>新的拍摄档期</Text>
        <View style={styles.slots}>
          {photoSlots().map((item) => (
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
      </BottomSheet>
    </SafeAreaView>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  scroll: { paddingHorizontal: 20, paddingTop: 4, gap: 12 },
  statusCard: {
    backgroundColor: colors.ink,
    borderRadius: radius.xl,
    padding: 18,
    ...shadow(2),
  },
  statusEyebrow: { fontSize: 7.5, letterSpacing: 1.6, color: "rgba(255,255,255,0.45)" },
  statusLine: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 7 },
  statusTitle: { fontFamily: font.medium, fontSize: 24, fontWeight: "800", color: colors.white, letterSpacing: -0.8 },
  statusSub: { marginTop: 8, fontSize: 9.5, lineHeight: 16, color: "rgba(255,255,255,0.58)" },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 15, ...shadow(1) },
  cardTitle: { ...text.h3, fontSize: 13, marginBottom: 12 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 7 },
  infoLabel: { fontSize: 9.5, color: colors.muted },
  infoValue: { flex: 1, textAlign: "right", fontSize: 10, color: colors.ink2, fontWeight: "600" },
  itemRow: { flexDirection: "row", gap: 11 },
  itemImage: { width: 64, height: 82, borderRadius: 9 },
  itemTitle: { ...text.h3, fontSize: 12.5, lineHeight: 18 },
  itemMeta: { fontSize: 9, color: colors.muted, marginTop: 4 },
  itemPrice: { marginTop: 6, fontSize: 14, fontWeight: "700", color: colors.ink },
  depositBar: { height: 4, backgroundColor: colors.cream2, borderRadius: 2, marginVertical: 5 },
  depositFill: { width: "62%", height: 4, backgroundColor: colors.green, borderRadius: 2 },
  actions: { gap: 9, marginTop: 4 },
  slotLabel: { ...text.label, marginBottom: 8 },
  slots: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingBottom: 4 },
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
