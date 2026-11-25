import { Stack } from "expo-router";
import { colors } from "@vendefacil/ui-tokens";

export default function AssinaturaLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: "slide_from_right",
      }}
    />
  );
}
