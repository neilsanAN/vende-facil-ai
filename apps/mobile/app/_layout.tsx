import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { colors } from "@vendefacil/ui-tokens";
import { BootScreen } from "../src/boot-screen";
import { checkOtaUpdate } from "../src/ota";
import { FeedbackProvider } from "../src/feedback";

export default function RootLayout() {
  const [boot, setBoot] = useState<{ ready: boolean; message: string; detail?: string }>({
    ready: __DEV__,
    message: "Iniciando…",
    detail: "Preparando a VendeFácil AI",
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      if (__DEV__) return;
      const reloading = await checkOtaUpdate({
        force: true,
        onStatus: (status) => {
          if (!alive) return;
          setBoot({ ready: false, message: status.message, detail: status.detail });
        },
      });
      // Se reloadAsync rodou, este layout some; senão liberamos a UI.
      if (alive && !reloading) setBoot((current) => ({ ...current, ready: true }));
    })();

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void checkOtaUpdate();
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  if (!boot.ready) {
    return <BootScreen message={boot.message} detail={boot.detail} />;
  }

  return (
    <FeedbackProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: "slide_from_right" }} />
    </FeedbackProvider>
  );
}
