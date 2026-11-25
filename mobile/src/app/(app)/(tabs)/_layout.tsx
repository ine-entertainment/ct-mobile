import React from "react";
import { Tabs } from "expo-router";
import { AppTabBar } from "../../../components/TabBar";
import { colors } from "../../../theme";

export default function TabsLayout() {
  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.cream },
        animation: "fade",
      }}
      tabBar={(props) => <AppTabBar {...props} />}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="rent" />
      <Tabs.Screen name="photo" />
      <Tabs.Screen name="community" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
