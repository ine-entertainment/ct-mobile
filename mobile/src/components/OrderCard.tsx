import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Order } from "../types";
import { colors, font, money, radius, shadow, text } from "../theme";
import { StatusBadge } from "./ui";
import { RemoteImage } from "./RemoteImage";

export function OrderCard({
  order,
  onPress,
  onRefund,
  onContact,
  onRebook,
  onReschedule,
}: {
  order: Order;
  onPress: () => void;
  onRefund?: () => void;
  onContact: () => void;
  onRebook?: () => void;
  onReschedule?: () => void;
}) {
  const isPhoto = order.type === "photo";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${isPhoto ? "摄影订单" : "租衣订单"} ${order.orderNo}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
    >
      <View style={styles.head}>
        <Text style={styles.orderNo}>
          {isPhoto ? "摄影订单" : "租衣订单"} · {order.orderNo}
        </Text>
        <StatusBadge code={order.statusCode} label={order.status} />
      </View>
      <View style={styles.body}>
        <RemoteImage name={order.image} style={styles.image} />
        <View style={styles.info}>
          <Text numberOfLines={2} style={styles.title}>
            {order.title}
          </Text>
          <Text style={styles.meta}>{order.date}</Text>
          <Text style={styles.meta}>{order.merchant}</Text>
          <Text style={styles.price}>
            {money(order.paid)}
            <Text style={styles.priceSmall}> {isPhoto ? "已付定金" : "实付"}</Text>
          </Text>
        </View>
      </View>
      <View style={styles.foot}>
        {isPhoto ? (
          <>
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                onReschedule?.();
              }}
              style={styles.btn}
            >
              <Text style={styles.btnText}>改期</Text>
            </Pressable>
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                onContact();
              }}
              style={[styles.btn, styles.btnPrimary]}
            >
              <Text style={[styles.btnText, styles.btnPrimaryText]}>联系摄影师</Text>
            </Pressable>
          </>
        ) : order.statusCode === "paid" ? (
          <>
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                onRefund?.();
              }}
              style={styles.btn}
            >
              <Text style={styles.btnText}>申请退款</Text>
            </Pressable>
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                onContact();
              }}
              style={[styles.btn, styles.btnPrimary]}
            >
              <Text style={[styles.btnText, styles.btnPrimaryText]}>联系商家</Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              onRebook?.();
            }}
            style={[styles.btn, styles.btnPrimary]}
          >
            <Text style={[styles.btnText, styles.btnPrimaryText]}>再次租赁</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    marginHorizontal: 20,
    marginBottom: 13,
    padding: 13,
    ...shadow(1),
  },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  orderNo: { ...text.tiny, flex: 1, color: colors.muted },
  body: { flexDirection: "row", gap: 12, paddingTop: 11 },
  image: { width: 66, height: 84, borderRadius: 10 },
  info: { flex: 1, justifyContent: "space-between" },
  title: { ...text.h3, fontSize: 14, lineHeight: 19 },
  meta: { ...text.bodySmall, fontSize: 10, lineHeight: 16 },
  price: { ...text.price, fontSize: 17, marginTop: 2 },
  priceSmall: { fontSize: 9, color: colors.muted, fontWeight: "400" },
  foot: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 12,
    paddingTop: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  btn: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  btnPrimary: { backgroundColor: colors.ink, borderColor: colors.ink },
  btnText: { fontFamily: font.medium, fontSize: 10, color: colors.ink2, fontWeight: "600" },
  btnPrimaryText: { color: colors.white },
});
