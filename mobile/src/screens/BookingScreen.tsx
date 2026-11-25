import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useAppNavigation } from "../lib/appNavigation";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { ScreenHeader } from "../components/ScreenHeader";
import { BottomSheet } from "../components/BottomSheet";
import { AppButton, Divider, Field } from "../components/ui";
import { RemoteImage } from "../components/RemoteImage";
import { dayPrice, deliveryInfo, rentalWindow, shortDay } from "../lib/date";
import { DeliveryKey, UserAddress } from "../types";
import { colors, font, radius, shadow, text } from "../theme";

export function BookingScreen() {
  const navigation = useAppNavigation();
  const params = useLocalSearchParams<{
    productId: string;
    size: string;
    days: string;
    delivery: string;
    insurance: string;
  }>();
  const insets = useSafeAreaInsets();
  const { products, user, updateProfile, createRental } = useApp();
  const toast = useToast();
  const productId = params.productId;
  const size = params.size;
  const days = Number(params.days || 3);
  const delivery = (params.delivery || "hotel") as DeliveryKey;
  const product = products.find((item) => item.id === productId);
  const [insurance, setInsurance] = useState(params.insurance === "true");
  const [agreed, setAgreed] = useState(true);
  const [address, setAddress] = useState<UserAddress>(
    user?.address || { name: "", phone: "", text: "" }
  );
  const [addressVisible, setAddressVisible] = useState(false);
  const [addressDraft, setAddressDraft] = useState(address);
  const [addressError, setAddressError] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);
  const [payVisible, setPayVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [payError, setPayError] = useState("");

  useEffect(() => {
    if (user?.address) setAddress(user.address);
  }, [user?.address]);

  const win = rentalWindow(days);
  const fees = useMemo(() => {
    if (!product) return { rent: 0, total: 0, deliveryFee: 0, insuranceFee: 0 };
    const rent = dayPrice(product.price, days);
    const deliveryFee = deliveryInfo(delivery).fee;
    const insuranceFee = insurance ? 9 : 0;
    return {
      rent,
      deliveryFee,
      insuranceFee,
      total: Math.max(0, rent + product.deposit + deliveryFee + insuranceFee - 20),
    };
  }, [days, delivery, insurance, product]);

  if (!product) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="确认订单" onBack={() => navigation.goBack()} />
        <Text style={styles.missing}>商品不存在或已下架</Text>
      </SafeAreaView>
    );
  }

  const openAddress = () => {
    setAddressDraft(address);
    setAddressError("");
    setAddressVisible(true);
  };

  const saveAddress = async () => {
    const draft = {
      name: addressDraft.name.trim(),
      phone: addressDraft.phone.trim(),
      text: addressDraft.text.trim(),
    };
    if (!draft.name) return setAddressError("请填写收货人");
    if (!/^1[3-9]\d{9}$/.test(draft.phone)) return setAddressError("请填写正确的手机号");
    if (!draft.text) return setAddressError("请填写详细地址");
    setSavingAddress(true);
    setAddressError("");
    try {
      await updateProfile({
        addressName: draft.name,
        addressPhone: draft.phone,
        addressText: draft.text,
      });
      setAddress(draft);
      setAddressVisible(false);
      toast("收货地址已保存");
    } catch (error) {
      setAddressError(error instanceof Error ? error.message : "地址保存失败");
    } finally {
      setSavingAddress(false);
    }
  };

  const submit = async () => {
    if (!agreed) {
      toast("请先阅读并同意租赁协议");
      return;
    }
    if (!address.name || !address.phone || !address.text) {
      openAddress();
      return;
    }
    setSubmitting(true);
    setPayError("");
    try {
      const order = await createRental({
        productId: product.id,
        size,
        days,
        delivery,
        insurance,
        address,
      });
      setPayVisible(false);
      navigation.reset({
        index: 2,
        routes: [
          { name: "Main", params: { screen: "Profile" } },
          { name: "Orders", params: { filter: "all" } },
          { name: "Success", params: { orderId: order.id } },
        ],
      });
    } catch (error) {
      setPayError(error instanceof Error ? error.message : "提交订单失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar style="dark" />
      <ScreenHeader title="确认订单" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 126 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>收货地址</Text>
          <View style={styles.addressRow}>
            <View style={styles.addressIcon}>
              <Ionicons name="location-outline" size={18} color={colors.coral2} />
            </View>
            <View style={{ flex: 1 }}>
              {address.name ? (
                <>
                  <Text style={styles.addressMain}>{address.text}</Text>
                  <Text style={styles.addressSub}>
                    {address.name} · {address.phone}
                  </Text>
                  <Text style={styles.addressSub}>预计 {shortDay(win.deliver)} 送达</Text>
                </>
              ) : (
                <>
                  <Text style={styles.addressMain}>还没有收货地址</Text>
                  <Text style={styles.addressSub}>请填写酒店或民宿地址，前台可代收</Text>
                </>
              )}
            </View>
            <Pressable onPress={openAddress} hitSlop={8}>
              <Text style={styles.edit}>{address.name ? "修改" : "填写"}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>租期与物流</Text>
          <View style={styles.timelineRow}>
            {[
              [shortDay(win.ship), "商家发货", "done"],
              [shortDay(win.deliver), "送达酒店", "done"],
              [shortDay(win.start), "开始穿着", "todo"],
              [shortDay(win.returnBy), "归还截止", "todo"],
            ].map(([day, label, state], index) => (
              <React.Fragment key={label}>
                <View style={styles.timelineNode}>
                  <View style={[styles.timelineDot, state === "done" && styles.timelineDotDone]} />
                  <Text style={styles.timelineDay}>{day}</Text>
                  <Text style={styles.timelineLabel}>{label}</Text>
                </View>
                {index < 3 ? <View style={styles.timelineLine} /> : null}
              </React.Fragment>
            ))}
          </View>
          <Text style={styles.timelineNote}>
            含物流缓冲：{shortDay(win.start)} 穿，{shortDay(win.end)} 结束，{shortDay(win.returnBy)} 前寄回或预约上门取件。
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>商品</Text>
          <View style={styles.itemRow}>
            <RemoteImage name={product.img} style={styles.itemImage} />
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{product.title}</Text>
              <Text style={styles.itemMeta}>
                尺码 {size} · {days} 天 · {deliveryInfo(delivery).label}
              </Text>
              <Text style={styles.itemMeta}>{product.includes}</Text>
              <Text style={styles.itemPrice}>¥{fees.rent}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>费用明细</Text>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>租金（{days} 天）</Text>
            <Text style={styles.feeValue}>¥{fees.rent}</Text>
          </View>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>押金（可退）</Text>
            <Text style={styles.feeValue}>¥{product.deposit}</Text>
          </View>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>配送费</Text>
            <Text style={styles.feeValue}>¥{fees.deliveryFee}</Text>
          </View>
          {insurance ? (
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>租赁安心险</Text>
              <Text style={styles.feeValue}>¥9</Text>
            </View>
          ) : null}
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>新人券</Text>
            <Text style={[styles.feeValue, { color: colors.coral2 }]}>-¥20</Text>
          </View>
          <View style={styles.insuranceRow}>
            <Switch
              value={insurance}
              onValueChange={setInsurance}
              trackColor={{ false: colors.line, true: colors.coralSoft }}
              thumbColor={insurance ? colors.coral : "#FFFFFF"}
            />
            <Text style={styles.insuranceText}>租赁安心险 ¥9 · 损坏/丢失最高赔 ¥2,000</Text>
          </View>
          <Divider style={{ marginVertical: 12 }} />
          <View style={styles.feeRow}>
            <Text style={styles.totalLabel}>合计</Text>
            <Text style={styles.totalValue}>¥{fees.total}</Text>
          </View>
          <Text style={styles.feeNote}>押金 ¥{product.deposit} 将在归还质检后原路退回</Text>
        </View>

        <Pressable style={styles.agreeRow} onPress={() => setAgreed((current) => !current)}>
          <View style={[styles.check, agreed && styles.checkOn]}>
            {agreed ? <Ionicons name="checkmark" size={10} color={colors.white} /> : null}
          </View>
          <Text style={styles.agreeText}>
            我已阅读并同意 <Text style={styles.link}>《租赁协议》</Text> 和{" "}
            <Text style={styles.link}>《押金与损赔规则》</Text>
          </Text>
        </Pressable>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bottomTotal}>
            合计（含押金 ¥{product.deposit}）
          </Text>
          <Text style={styles.bottomAmount}>¥{fees.total}</Text>
        </View>
        <AppButton
          title="提交订单"
          onPress={() => {
            if (!agreed) {
              toast("请先阅读并同意租赁协议");
              return;
            }
            setPayVisible(true);
          }}
          style={{ paddingHorizontal: 26 }}
        />
      </View>

      <BottomSheet
        visible={addressVisible}
        onClose={() => setAddressVisible(false)}
        title="收货地址"
        subtitle="衣服会送到酒店 / 民宿前台，请填写可代收的地址。"
        footer={<AppButton title="保存地址" onPress={saveAddress} loading={savingAddress} variant="dark" />}
      >
        <Field
          label="收货人"
          value={addressDraft.name}
          onChangeText={(name) => setAddressDraft((current) => ({ ...current, name }))}
          placeholder="姓名"
          maxLength={20}
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
          maxLength={120}
        />
        {addressError ? <Text style={styles.formError}>{addressError}</Text> : null}
      </BottomSheet>

      <BottomSheet
        visible={payVisible}
        onClose={() => setPayVisible(false)}
        title="确认支付"
        subtitle={`含押金 ¥${product.deposit} · 归还质检后原路退回`}
        footer={
          <AppButton
            title={`确认支付 ¥${fees.total}`}
            onPress={submit}
            loading={submitting}
          />
        }
      >
        <View style={styles.payAmount}>
          <Text style={styles.payCurrency}>¥</Text>
          <Text style={styles.payValue}>{fees.total}</Text>
        </View>
        <View style={styles.payMethod}>
          <View style={styles.wechatIcon}>
            <Text style={styles.wechatIconText}>微</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.payMethodTitle}>微信支付</Text>
            <Text style={styles.payMethodSub}>本地演示 · 点击即视为支付成功</Text>
          </View>
          <Ionicons name="checkmark-circle" size={19} color={colors.green} />
        </View>
        {payError ? <Text style={styles.formError}>{payError}</Text> : null}
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  scroll: { paddingHorizontal: 20, paddingTop: 4, gap: 12 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 15, ...shadow(1) },
  cardTitle: { ...text.h3, fontSize: 13, marginBottom: 12 },
  addressRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  addressIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.coralSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  addressMain: { fontSize: 11.5, lineHeight: 17, fontWeight: "600", color: colors.ink },
  addressSub: { fontSize: 9, lineHeight: 15, color: colors.muted, marginTop: 3 },
  edit: { fontSize: 9, color: colors.sea2, marginTop: 3 },
  timelineRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  timelineNode: { alignItems: "center", width: 58 },
  timelineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.line, marginBottom: 6 },
  timelineDotDone: { backgroundColor: colors.green },
  timelineDay: { fontFamily: font.medium, fontSize: 10, fontWeight: "700", color: colors.ink },
  timelineLabel: { fontSize: 7.5, color: colors.muted, marginTop: 2, textAlign: "center" },
  timelineLine: { flex: 1, height: 1, backgroundColor: colors.line, marginTop: -18 },
  timelineNote: { fontSize: 8, lineHeight: 14, color: colors.muted, marginTop: 12 },
  itemRow: { flexDirection: "row", gap: 11 },
  itemImage: { width: 63, height: 80, borderRadius: 9 },
  itemTitle: { ...text.h3, fontSize: 12, lineHeight: 17 },
  itemMeta: { fontSize: 9, color: colors.muted, marginTop: 4 },
  itemPrice: { fontSize: 14, fontWeight: "700", color: colors.ink, marginTop: 6 },
  feeRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 9 },
  feeLabel: { fontSize: 10.5, color: colors.muted },
  feeValue: { fontSize: 10.5, color: colors.ink2, fontWeight: "600" },
  insuranceRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 5 },
  insuranceText: { fontSize: 8.5, color: colors.muted, flex: 1 },
  totalLabel: { fontSize: 12, fontWeight: "700", color: colors.ink },
  totalValue: { fontSize: 20, fontWeight: "800", letterSpacing: -0.6, color: colors.ink },
  feeNote: { marginTop: 6, fontSize: 7.5, color: colors.muted },
  agreeRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4, paddingVertical: 3 },
  check: {
    width: 16,
    height: 16,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
  },
  checkOn: { backgroundColor: colors.coral, borderColor: colors.coral },
  agreeText: { flex: 1, fontSize: 8.5, lineHeight: 15, color: colors.muted },
  link: { color: colors.coral2 },
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
  bottomTotal: { fontSize: 8.5, color: colors.muted },
  bottomAmount: { fontFamily: font.medium, fontSize: 22, fontWeight: "800", color: colors.ink, marginTop: 1 },
  payAmount: { flexDirection: "row", alignItems: "flex-start", justifyContent: "center", paddingVertical: 12 },
  payCurrency: { fontSize: 17, fontWeight: "700", color: colors.ink, marginTop: 5 },
  payValue: { fontFamily: font.medium, fontSize: 44, lineHeight: 52, fontWeight: "800", letterSpacing: -2, color: colors.ink },
  payMethod: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 10,
  },
  wechatIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.green, alignItems: "center", justifyContent: "center" },
  wechatIconText: { color: colors.white, fontSize: 14, fontWeight: "700" },
  payMethodTitle: { fontSize: 11.5, fontWeight: "700", color: colors.ink },
  payMethodSub: { fontSize: 8.5, color: colors.muted, marginTop: 3 },
  formError: { marginTop: 8, color: colors.coral2, fontSize: 10, lineHeight: 16 },
  missing: { ...text.bodySmall, textAlign: "center", marginTop: 60 },
});
