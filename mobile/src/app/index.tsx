import React from "react";
import { Redirect } from "expo-router";
import { useApp } from "../context/AppContext";

export default function IndexRoute() {
  const { token } = useApp();
  return <Redirect href={token ? "/(app)/(tabs)/home" : "/(auth)/login"} />;
}
