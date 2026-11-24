import { Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@vendefacil/ui-tokens";

/** Voltar com fallback — router.back() falha quando não há histórico. */
export function BackButton({ fallback = "/inicio" }: { fallback?: string }) {
  return (
    <Pressable
      onPress={() => {
        if (router.canGoBack()) router.back();
        else router.replace(fallback);
      }}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Voltar"
      style={{
        height: 44,
        width: 44,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
      }}
    >
      <Ionicons name="chevron-back" size={22} color={colors.text} />
    </Pressable>
  );
}
