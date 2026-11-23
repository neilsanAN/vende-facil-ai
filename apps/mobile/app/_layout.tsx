import { useEffect } from "react";
import { AppState } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { colors } from "@vendefacil/ui-tokens";
import { checkOtaUpdate } from "../src/ota";

export default function RootLayout() {
  useEffect(() => {
    void checkOtaUpdate();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void checkOtaUpdate();
    });
    return () => sub.remove();
  }, []);
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
    </>
  );
}
