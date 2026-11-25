import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useAppNavigation } from "../lib/appNavigation";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { ProductCard } from "../components/ProductCard";
import { Chip } from "../components/ui";
import { rentalRangeLabel, rentalWindow, shortDay } from "../lib/date";
import { colors, font, radius, text } from "../theme";

export function RentScreen() {
  const navigation = useAppNavigation();
  const { products, favorites, toggleFavorite, cities } = useApp();
  const toast = useToast();
  const [style, setStyle] = useState("全部");
  const [query, setQuery] = useState("");
  const city = cities.find((item) => item.status === "open")?.name || "三亚";
  const stock = products.reduce((sum, item) => sum + (item.stockAvailable || 0), 0);
  const win = rentalWindow(3);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((product) => {
      const byStyle = style === "全部" || product.styles.includes(style);
      const haystack = `${product.title} ${product.styles.join(" ")} ${product.merchant}`.toLowerCase();
      return byStyle && (!q || haystack.includes(q));
    });
  }, [products, query, style]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.title}>租衣</Text>
            <Text style={styles.subtitle}>
              {city} · {stock} 件可租 · 支持酒店送达
            </Text>
          </View>
          <Pressable onPress={() => navigation.navigate("City")} style={styles.pin}>
            <Ionicons name="location-outline" size={18} color={colors.ink} />
          </Pressable>
        </View>

        <View style={styles.search}>
          <Ionicons name="search-outline" size={16} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="搜白裙 / 碎花 / 法式..."
            placeholderTextColor={colors.muted2}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {query ? (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.muted2} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.dateRow}>
          <View style={styles.datePill}>
            <Ionicons name="calendar-outline" size={13} color={colors.ink2} />
            <Text style={styles.dateText}>{rentalRangeLabel(3)}</Text>
            <Ionicons name="chevron-down" size={11} color={colors.muted} />
          </View>
          <Text style={styles.dateNote}>含物流缓冲 · {shortDay(win.ship)} 发货</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {["全部", "海岛", "法式", "城市", "复古"].map((item) => (
            <Chip key={item} label={item} active={style === item} onPress={() => setStyle(item)} />
          ))}
        </ScrollView>

        <View style={styles.filterRow}>
          <Text style={styles.sort}>综合推荐</Text>
          <Pressable onPress={() => toast("筛选器将在下一版开放")}>
            <Text style={styles.filterText}>
              <Ionicons name="options-outline" size={11} /> 筛选
            </Text>
          </Pressable>
        </View>

        <Text style={styles.count}>
          {query || style !== "全部"
            ? `为你找到 ${list.length} 套`
            : `为你找到 ${list.length} 套 · 按可租日期排序`}
        </Text>

        <View style={styles.grid}>
          {list.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              liked={!!favorites[product.id]}
              onPress={() => navigation.navigate("Product", { productId: product.id })}
              onToggleFavorite={async () => {
                try {
                  const liked = await toggleFavorite(product.id);
                  toast(liked ? "已收藏，行前记得回来看档期" : "已取消收藏");
                } catch (error) {
                  toast(error instanceof Error ? error.message : "收藏失败");
                }
              }}
            />
          ))}
        </View>
        {list.length === 0 ? (
          <Text style={styles.empty}>没有找到匹配的款式，换个关键词试试</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  scroll: { paddingBottom: 104 },
  titleRow: {
    paddingHorizontal: 20,
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontFamily: font.medium, fontSize: 28, fontWeight: "800", letterSpacing: -1.1, color: colors.ink },
  subtitle: { ...text.bodySmall, fontSize: 9, marginTop: 4 },
  pin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
  },
  search: {
    marginHorizontal: 20,
    marginTop: 16,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 12, color: colors.ink, paddingVertical: 0 },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, marginTop: 11 },
  datePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    backgroundColor: colors.cream2,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  dateText: { fontSize: 9.5, color: colors.ink2, fontWeight: "600" },
  dateNote: { fontSize: 8, color: colors.muted },
  chips: { paddingHorizontal: 20, gap: 8, paddingTop: 14 },
  filterRow: {
    paddingHorizontal: 20,
    paddingTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sort: { fontSize: 9.5, color: colors.ink2, fontWeight: "600" },
  filterText: { fontSize: 9, color: colors.muted },
  count: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10, fontSize: 8.5, color: colors.muted },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingHorizontal: 20 },
  empty: { ...text.bodySmall, textAlign: "center", paddingVertical: 40 },
});
