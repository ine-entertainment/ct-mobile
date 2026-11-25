import React, { useEffect, useMemo, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useAppNavigation } from "../lib/appNavigation";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { RemoteImage } from "../components/RemoteImage";
import { AppButton, Divider, Price } from "../components/ui";
import { api } from "../api/client";
import { dayPrice, deliveryInfo, rentalRangeLabel } from "../lib/date";
import { DeliveryKey, Product } from "../types";
import { colors, font, radius, shadow, text } from "../theme";

const deliveries: { key: DeliveryKey; label: string; desc: string }[] = [
  { key: "hotel", label: "酒店配送", desc: "¥15 · 前台代收" },
  { key: "express", label: "快递", desc: "¥18 · 顺丰" },
  { key: "pickup", label: "门店自提", desc: "免费 · 10:00-21:00" },
];

export function ProductScreen() {
  const navigation = useAppNavigation();
  const params = useLocalSearchParams<{ productId: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { products, favorites, toggleFavorite } = useApp();
  const toast = useToast();
  const productId = params.productId;
  const [remoteProduct, setRemoteProduct] = useState<Product | null>(null);
  const product = products.find((item) => item.id === productId) || remoteProduct;
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [size, setSize] = useState("");
  const [days, setDays] = useState(3);
  const [delivery, setDelivery] = useState<DeliveryKey>("hotel");
  const [onImage, setOnImage] = useState(true);

  useEffect(() => {
    if (!product) {
      api
        .product(productId)
        .then((result) => setRemoteProduct(result.product))
        .catch((error) => toast(error instanceof Error ? error.message : "商品不存在"));
    }
  }, [product, productId, toast]);

  useEffect(() => {
    if (!product) return;
    const available = product.sizes.filter(
      (item) => (product.stockBySize?.[item]?.available ?? 1) > 0
    );
    const next = available.includes("M") ? "M" : available[0] || product.sizes[0] || "M";
    setSize(next);
  }, [product]);

  const total = useMemo(() => {
    if (!product) return 0;
    return Math.max(
      0,
      dayPrice(product.price, days) +
        product.deposit +
        deliveryInfo(delivery).fee -
        20
    );
  }, [days, delivery, product]);

  if (!product) {
    return (
      <View style={[styles.loadingRoot, { paddingTop: insets.top }]}>
        <StatusBar style="dark" />
        <Text style={styles.loadingText}>正在读取商品…</Text>
      </View>
    );
  }

  const gallery = product.gallery.length ? product.gallery : [product.img];
  const liked = !!favorites[product.id];

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    if (y > 320 && onImage) setOnImage(false);
    if (y <= 320 && !onImage) setOnImage(true);
  };

  return (
    <View style={styles.root}>
      <StatusBar style={onImage ? "light" : "dark"} />
      <ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 118 + insets.bottom }}
      >
        <View style={{ width, height: Math.min(500, width * 1.18) }}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) =>
              setGalleryIndex(Math.round(event.nativeEvent.contentOffset.x / width))
            }
          >
            {gallery.map((image, index) => (
              <RemoteImage
                key={`${image}-${index}`}
                name={image}
                style={{ width, height: Math.min(500, width * 1.18) }}
              />
            ))}
          </ScrollView>
          <View style={[styles.overlayTop, { paddingTop: insets.top + 8 }]}>
            <Pressable style={styles.glass} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={19} color={onImage ? colors.white : colors.ink} />
            </Pressable>
            <View style={styles.overlayActions}>
              <Pressable
                style={styles.glass}
                onPress={() => toast("分享链接已复制")}
              >
                <Ionicons name="share-outline" size={17} color={onImage ? colors.white : colors.ink} />
              </Pressable>
              <Pressable
                style={[styles.glass, liked && styles.glassLiked]}
                onPress={async () => {
                  try {
                    const next = await toggleFavorite(product.id);
                    toast(next ? "已收藏，行前记得回来看档期" : "已取消收藏");
                  } catch (error) {
                    toast(error instanceof Error ? error.message : "收藏失败");
                  }
                }}
              >
                <Ionicons
                  name={liked ? "heart" : "heart-outline"}
                  size={17}
                  color={liked ? colors.white : onImage ? colors.white : colors.ink}
                />
              </Pressable>
            </View>
          </View>
          <View style={styles.dots}>
            {gallery.map((_, index) => (
              <View
                key={index}
                style={[styles.dot, index === galleryIndex && styles.dotActive]}
              />
            ))}
          </View>
        </View>

        <View style={styles.sheet}>
          <Text style={styles.title}>{product.title}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="star" size={10} color={colors.gold} />
            <Text style={styles.meta}>
              {product.rating} · {product.reviews} 条真实评价 · {product.merchant}
            </Text>
          </View>
          <View style={styles.priceLine}>
            <Price value={dayPrice(product.price, days)} suffix={`/${days}天`} />
            <Text style={styles.deposit}>押金 ¥{product.deposit} · 可信用免押</Text>
          </View>
          <View style={styles.trustRow}>
            <Text style={styles.trust}>🛡 一客一洗一消毒</Text>
            <Text style={styles.trust}>🛡 封签验货</Text>
            <Text style={styles.trust}>🚚 酒店送达</Text>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.selectorHead}>
            <Text style={styles.selectorTitle}>选尺码</Text>
            <Text style={styles.selectorHint}>{product.fit}</Text>
          </View>
          <View style={styles.optionRow}>
            {product.sizes.map((item) => {
              const available = product.stockBySize?.[item]?.available;
              const soldOut = available !== undefined && available <= 0;
              return (
                <Pressable
                  key={item}
                  disabled={soldOut}
                  onPress={() => setSize(item)}
                  style={[
                    styles.option,
                    size === item && styles.optionActive,
                    soldOut && styles.optionDisabled,
                  ]}
                >
                  <Text style={[styles.optionTitle, size === item && styles.optionTitleActive]}>
                    {item}
                  </Text>
                  <Text style={[styles.optionSub, size === item && styles.optionSubActive]}>
                    {soldOut ? "暂时租完" : available !== undefined ? `可租 ${available} 件` : "按体重选"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.selectorHead}>
            <Text style={styles.selectorTitle}>选租期</Text>
            <Text style={styles.selectorHint}>{rentalRangeLabel(days)}</Text>
          </View>
          <View style={styles.optionRow}>
            {[3, 5, 7].map((item) => (
              <Pressable
                key={item}
                onPress={() => setDays(item)}
                style={[styles.option, days === item && styles.optionActive]}
              >
                <Text style={[styles.optionTitle, days === item && styles.optionTitleActive]}>
                  {item} 天
                </Text>
                <Text style={[styles.optionSub, days === item && styles.optionSubActive]}>
                  ¥{dayPrice(product.price, item)}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.selectorHead}>
            <Text style={styles.selectorTitle}>配送方式</Text>
            <Text style={styles.selectorHint}>三亚全城可送</Text>
          </View>
          <View style={styles.optionRow}>
            {deliveries.map((item) => (
              <Pressable
                key={item.key}
                onPress={() => setDelivery(item.key)}
                style={[styles.deliveryOption, delivery === item.key && styles.optionActive]}
              >
                <Text
                  style={[
                    styles.optionTitle,
                    delivery === item.key && styles.optionTitleActive,
                    { fontSize: 10.5 },
                  ]}
                >
                  {item.label}
                </Text>
                <Text style={[styles.optionSub, delivery === item.key && styles.optionSubActive]}>
                  {item.desc}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.modelCard}>
            <RemoteImage name="model-2" style={styles.modelImage} />
            <View style={{ flex: 1 }}>
              <Text style={styles.modelTitle}>模特参考 · {product.model || "168cm / 50kg · 穿 S"}</Text>
              <Text style={styles.modelText}>{product.fit || "按日常尺码选择即可"}</Text>
            </View>
            <View style={styles.sizeTag}>
              <Text style={styles.sizeTagText}>穿 {size}</Text>
            </View>
          </View>

          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>真实客片</Text>
            <Text style={styles.sectionHint}>{product.reviews} 位女生穿过</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.realRow}
          >
            {product.real.map((image, index) => (
              <View key={`${image}-${index}`} style={styles.realCard}>
                <RemoteImage name={image} style={styles.realImage} />
                <Text style={styles.realLabel}>
                  {index === 0 ? "三亚 · 亚龙湾" : index === 1 ? "后海村 · 日落" : "酒店阳台"}
                </Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.rules}>
            {[
              ["清洗消毒", "一客一洗 · 封签 · 可查记录"],
              ["押金退还", "质检后 1-3 个工作日"],
              ["损坏 / 逾期", "明示标准 · 平台仲裁"],
            ].map(([title, body]) => (
              <View key={title} style={styles.rule}>
                <Text style={styles.ruleTitle}>{title}</Text>
                <Text style={styles.ruleBody}>{body}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <Pressable
          style={styles.bottomAction}
          onPress={async () => {
            try {
              const next = await toggleFavorite(product.id);
              toast(next ? "已收藏" : "已取消收藏");
            } catch (error) {
              toast(error instanceof Error ? error.message : "收藏失败");
            }
          }}
        >
          <Ionicons name={liked ? "heart" : "heart-outline"} size={20} color={liked ? colors.coral : colors.ink} />
          <Text style={styles.bottomActionText}>收藏</Text>
        </Pressable>
        <Pressable style={styles.bottomAction} onPress={() => toast("客服将在 1 分钟内回复")}>
          <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.ink} />
          <Text style={styles.bottomActionText}>客服</Text>
        </Pressable>
        <View style={styles.bottomPrice}>
          <Text style={styles.total}>¥{total}</Text>
          <Text style={styles.totalNote}>含押金 ¥{product.deposit} · 可退</Text>
        </View>
        <AppButton
          title="立即租"
          onPress={() =>
            navigation.navigate("Booking", {
              productId: product.id,
              size,
              days,
              delivery,
              insurance: false,
            })
          }
          style={styles.rentButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  overlayTop: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  overlayActions: { flexDirection: "row", gap: 8 },
  glass: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(30,30,30,0.24)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  glassLiked: { backgroundColor: colors.coral, borderColor: colors.coral },
  dots: {
    position: "absolute",
    bottom: 34,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  dotActive: { width: 15, backgroundColor: colors.white },
  sheet: {
    marginTop: -24,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: colors.cream,
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  title: { fontFamily: font.medium, fontSize: 24, lineHeight: 31, fontWeight: "700", letterSpacing: -1, color: colors.ink },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  meta: { fontSize: 9.5, color: colors.muted },
  priceLine: { flexDirection: "row", alignItems: "flex-end", gap: 10, marginTop: 12 },
  deposit: { fontSize: 8.5, color: colors.muted, marginBottom: 2 },
  trustRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 11 },
  trust: { fontSize: 8.5, color: colors.muted },
  divider: { marginVertical: 18 },
  selectorHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 9 },
  selectorTitle: { fontFamily: font.medium, fontSize: 12.5, fontWeight: "700", color: colors.ink },
  selectorHint: { fontSize: 8.5, color: colors.muted },
  optionRow: { flexDirection: "row", gap: 8, marginBottom: 17 },
  option: {
    minWidth: 56,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.card,
  },
  optionActive: { borderColor: colors.ink, backgroundColor: colors.ink },
  optionDisabled: { opacity: 0.4 },
  optionTitle: { fontFamily: font.medium, fontSize: 11.5, fontWeight: "700", color: colors.ink },
  optionTitleActive: { color: colors.white },
  optionSub: { marginTop: 3, fontSize: 7.5, color: colors.muted },
  optionSubActive: { color: "rgba(255,255,255,0.65)" },
  deliveryOption: {
    flex: 1,
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.card,
  },
  modelCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 10,
    marginTop: 1,
  },
  modelImage: { width: 49, height: 62, borderRadius: 9 },
  modelTitle: { fontFamily: font.medium, fontSize: 10, fontWeight: "700", color: colors.ink },
  modelText: { fontSize: 8.5, color: colors.muted, marginTop: 4, lineHeight: 14 },
  sizeTag: {
    backgroundColor: colors.coralSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  sizeTagText: { fontSize: 8, color: colors.coral2, fontWeight: "700" },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: 22, marginBottom: 10 },
  sectionTitle: { ...text.h3, fontSize: 13 },
  sectionHint: { fontSize: 8, color: colors.muted },
  realRow: { gap: 9 },
  realCard: { width: 118 },
  realImage: { width: 118, height: 150, borderRadius: radius.md },
  realLabel: { marginTop: 5, fontSize: 8, color: colors.muted },
  rules: { marginTop: 22, backgroundColor: colors.card, borderRadius: radius.lg, paddingHorizontal: 14 },
  rule: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  ruleTitle: { fontSize: 10, color: colors.ink2, fontWeight: "600" },
  ruleBody: { fontSize: 8.5, color: colors.muted, flexShrink: 1, textAlign: "right", marginLeft: 10 },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: "rgba(250,245,238,0.98)",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    ...shadow(2),
  },
  bottomAction: { width: 38, alignItems: "center", gap: 2 },
  bottomActionText: { fontSize: 7.5, color: colors.muted },
  bottomPrice: { flex: 1, marginLeft: 4 },
  total: { fontFamily: font.medium, fontSize: 18, fontWeight: "800", color: colors.ink },
  totalNote: { fontSize: 7.5, color: colors.muted, marginTop: 2 },
  rentButton: { paddingHorizontal: 17, height: 42 },
  loadingRoot: { flex: 1, backgroundColor: colors.cream, alignItems: "center", justifyContent: "center" },
  loadingText: { ...text.bodySmall },
});
