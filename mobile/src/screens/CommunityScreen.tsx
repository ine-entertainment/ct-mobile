import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useAppNavigation } from "../lib/appNavigation";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { RemoteImage } from "../components/RemoteImage";
import { colors, font, radius, shadow, text } from "../theme";

export function CommunityScreen() {
  const navigation = useAppNavigation();
  const { posts, user, togglePostLike, products } = useApp();
  const toast = useToast();
  const [tab, setTab] = useState("推荐");
  const { width } = useWindowDimensions();
  const imageWidth = (width - 40 - 6) / 2;

  const filtered = useMemo(() => {
    if (tab === "同城") return posts.filter((post) => post.city.includes("三亚"));
    if (tab === "关注") return posts.filter((post) => post.user === user?.nickname);
    return posts;
  }, [posts, tab, user?.nickname]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>社区</Text>
          <Pressable style={styles.iconButton} onPress={() => toast("搜索功能将在下一版开放")}>
            <Ionicons name="search-outline" size={19} color={colors.ink} />
          </Pressable>
        </View>
        <View style={styles.tabs}>
          {["推荐", "同城", "关注"].map((item) => (
            <Pressable key={item} onPress={() => setTab(item)} style={styles.tab}>
              <Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{item}</Text>
              {tab === item ? <View style={styles.tabLine} /> : null}
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {filtered.map((post) => {
          const product = products.find((item) => item.id === post.product);
          return (
            <View key={post.id} style={styles.post}>
              <View style={styles.postHead}>
                <RemoteImage name={post.avatar} style={styles.avatar} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.user}>{post.user}</Text>
                  <Text style={styles.meta}>
                    {post.city} · {post.time}
                  </Text>
                </View>
                <Pressable onPress={() => toast(`已关注 ${post.user}`)} style={styles.follow}>
                  <Text style={styles.followText}>关注</Text>
                </Pressable>
              </View>
              <View style={styles.images}>
                {post.images.map((image, index) => (
                  <RemoteImage
                    key={`${image}-${index}`}
                    name={image}
                    style={[
                      post.images.length === 1 ? styles.singleImage : styles.image,
                      post.images.length > 1 ? { width: imageWidth } : null,
                    ]}
                  />
                ))}
              </View>
              <View style={styles.postBody}>
                <Text style={styles.postText}>{post.text}</Text>
                <View style={styles.tags}>
                  {post.tags.map((tag) => (
                    <Text key={tag} style={styles.tag}>
                      {tag}
                    </Text>
                  ))}
                </View>
                {product ? (
                  <Pressable
                    onPress={() => navigation.navigate("Product", { productId: product.id })}
                    style={styles.productLink}
                  >
                    <RemoteImage name={product.img} style={styles.productImage} />
                    <Text numberOfLines={1} style={styles.productTitle}>
                      同款可租 · {product.title}
                    </Text>
                    <Text style={styles.productPrice}>¥{product.price}/3天</Text>
                  </Pressable>
                ) : null}
                <View style={styles.actions}>
                  <Pressable
                    style={styles.action}
                    onPress={async () => {
                      try {
                        await togglePostLike(post.id);
                      } catch (error) {
                        toast(error instanceof Error ? error.message : "点赞失败");
                      }
                    }}
                  >
                    <Ionicons
                      name={post.liked ? "heart" : "heart-outline"}
                      size={15}
                      color={post.liked ? colors.coral : colors.ink2}
                    />
                    <Text style={[styles.actionText, post.liked && { color: colors.coral }]}>
                      {post.likes}
                    </Text>
                  </Pressable>
                  <Pressable style={styles.action} onPress={() => toast("评论功能将在下一版开放")}>
                    <Ionicons name="chatbubble-outline" size={14} color={colors.ink2} />
                    <Text style={styles.actionText}>{post.comments}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.action, { marginLeft: "auto" }]}
                    onPress={() => toast("已收藏这篇笔记")}
                  >
                    <Ionicons name="bookmark-outline" size={14} color={colors.ink2} />
                    <Text style={styles.actionText}>收藏</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          );
        })}
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>这里还没有内容</Text>
            <Text style={styles.emptyHint}>去推荐看看大家的客片吧</Text>
          </View>
        ) : null}
      </ScrollView>

      <Pressable style={styles.compose} onPress={() => toast("发布功能将在二期开放")}>
        <Ionicons name="add" size={24} color={colors.white} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: 20, paddingTop: 8 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontFamily: font.medium, fontSize: 28, fontWeight: "800", letterSpacing: -1.1, color: colors.ink },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  tabs: { flexDirection: "row", gap: 24, marginTop: 12 },
  tab: { paddingBottom: 8 },
  tabText: { fontSize: 12, color: colors.muted, fontWeight: "500" },
  tabTextActive: { color: colors.ink, fontWeight: "700" },
  tabLine: { height: 2, width: 16, borderRadius: 1, backgroundColor: colors.ink, marginTop: 5 },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 108 },
  post: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    marginBottom: 14,
    padding: 13,
    ...shadow(1),
  },
  postHead: { flexDirection: "row", alignItems: "center", gap: 9 },
  avatar: { width: 34, height: 34, borderRadius: 17 },
  user: { fontFamily: font.medium, fontSize: 11.5, fontWeight: "700", color: colors.ink },
  meta: { fontSize: 8.5, color: colors.muted, marginTop: 3 },
  follow: { borderWidth: 1, borderColor: colors.coralSoft, backgroundColor: colors.coralSoft, borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 5 },
  followText: { fontSize: 8.5, color: colors.coral2, fontWeight: "700" },
  images: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 11 },
  image: { height: 180, borderRadius: 10 },
  singleImage: { width: "100%", height: 250, borderRadius: 10 },
  postBody: { paddingTop: 10 },
  postText: { ...text.body, fontSize: 11.5, lineHeight: 19 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 8 },
  tag: { fontSize: 9, color: colors.sea2 },
  productLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.cream,
    borderRadius: 9,
    padding: 6,
    marginTop: 10,
  },
  productImage: { width: 29, height: 36, borderRadius: 5 },
  productTitle: { flex: 1, fontSize: 9, color: colors.ink2 },
  productPrice: { fontSize: 9, fontWeight: "700", color: colors.coral2 },
  actions: { flexDirection: "row", alignItems: "center", gap: 18, marginTop: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  action: { flexDirection: "row", alignItems: "center", gap: 5 },
  actionText: { fontSize: 9.5, color: colors.ink2 },
  compose: {
    position: "absolute",
    right: 20,
    bottom: 92,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.coral,
    alignItems: "center",
    justifyContent: "center",
    ...shadow(2),
  },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyTitle: { ...text.h3, fontSize: 14 },
  emptyHint: { ...text.bodySmall, marginTop: 6 },
});
