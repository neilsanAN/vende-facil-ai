import { Stack } from "expo-router";
import { colors } from "@vendefacil/ui-tokens";

export default function AssinaturaLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: "slide_from_right",
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="planos" options={{ animation: "none" }} />
      <Stack.Screen name="alterar" />
      <Stack.Screen name="pagamento" />
      <Stack.Screen name="faturas" />
      <Stack.Screen name="cancelar" />
    </Stack>
  );
}
