import React from "react";
import { Redirect, Stack } from "expo-router";
import { useApp } from "../../context/AppContext";
import { colors } from "../../theme";

export default function AuthLayout() {
  const { token } = useApp();
  if (token) return <Redirect href="/(app)/(tabs)/home" />;
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.cream },
      }}
    >
      <Stack.Screen name="login" />
    </Stack>
  );
}
