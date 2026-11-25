import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, font } from "../theme";

const tabs = [
  { name: "home", label: "首页", icon: "home-outline", activeIcon: "home" },
  { name: "rent", label: "租衣", icon: "shirt-outline", activeIcon: "shirt" },
  { name: "photo", label: "摄影", icon: "camera-outline", activeIcon: "camera" },
  { name: "community", label: "社区", icon: "heart-outline", activeIcon: "heart" },
  { name: "profile", label: "我的", icon: "person-outline", activeIcon: "person" },
] as const;

export function AppTabBar({ state, navigation, navigateToTab }: any) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route: any, index: number) => {
        const item = tabs.find((tab) => tab.name === route.name) || tabs[0];
        const focused = state.index === index;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            onPress={() => {
              if (focused) return;
              if (typeof navigateToTab === "function") {
                navigateToTab(route.key);
              } else if (navigation) {
                navigation.navigate(route.name, route.params);
              }
            }}
            style={({ pressed }) => [styles.tab, pressed && { opacity: 0.65 }]}
          >
            <Ionicons
              name={focused ? item.activeIcon : item.icon}
              size={21}
              color={focused ? colors.coral : colors.muted2}
            />
            <Text style={[styles.label, focused && styles.labelActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    backgroundColor: "rgba(250,245,238,0.97)",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3, minHeight: 45 },
  label: {
    fontFamily: font.regular,
    fontSize: 9,
    color: colors.muted2,
    fontWeight: "500",
  },
  labelActive: { color: colors.coral, fontWeight: "700" },
});
