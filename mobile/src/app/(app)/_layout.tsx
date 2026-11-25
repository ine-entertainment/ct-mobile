import React from "react";
import { Redirect, Stack } from "expo-router";
import { useApp } from "../../context/AppContext";
import { colors } from "../../theme";

export default function AppLayout() {
  const { token } = useApp();
  if (!token) return <Redirect href="/(auth)/login" />;
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: colors.cream },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="product/[productId]" />
      <Stack.Screen name="booking" />
      <Stack.Screen name="success/[orderId]" options={{ gestureEnabled: false }} />
      <Stack.Screen name="orders/index" />
      <Stack.Screen name="orders/[orderId]" />
      <Stack.Screen name="photographer/[photographerId]" />
      <Stack.Screen name="city" />
      <Stack.Screen name="makeup" />
      <Stack.Screen name="account" />
    </Stack>
  );
}
