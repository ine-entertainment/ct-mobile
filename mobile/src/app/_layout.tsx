import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProvider, useApp } from "../context/AppContext";
import { ToastProvider } from "../context/ToastContext";
import { BootErrorScreen, BootSplash } from "../components/BootScreens";
import { colors } from "../theme";

function RootStack() {
  const { ready, token, bootError } = useApp();

  if (!ready) return <BootSplash />;
  if (token && bootError) return <BootErrorScreen />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: colors.cream },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <View style={styles.errorRoot}>
      <Text style={styles.errorTitle}>页面出错了</Text>
      <Text style={styles.errorMessage}>{error.message}</Text>
      <ScrollView style={styles.errorStack}>
        <Text style={styles.errorStackText}>{error.stack}</Text>
      </ScrollView>
      <Text style={styles.retry} onPress={retry}>
        重试
      </Text>
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ToastProvider>
        <AppProvider>
          <RootStack />
        </AppProvider>
      </ToastProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  errorRoot: { flex: 1, backgroundColor: "#FAF5EE", padding: 24, paddingTop: 70 },
  errorTitle: { fontSize: 24, fontWeight: "700", color: "#20262B" },
  errorMessage: { marginTop: 12, fontSize: 14, color: "#B84F46" },
  errorStack: { marginTop: 16, maxHeight: 420 },
  errorStackText: { fontSize: 10, color: "#7D7468" },
  retry: { marginTop: 20, color: "#FF6B5A", fontWeight: "700", fontSize: 14 },
});
