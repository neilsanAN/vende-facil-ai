import { Pressable } from "react-native";
import { router, type Href } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@vendefacil/ui-tokens";

/** Volta exatamente para a tela anterior; só usa fallback se não houver histórico. */
export function goBack(fallback: Href = "/inicio") {
  try {
    if (router.canGoBack()) {
      router.back();
      return;
    }
  } catch {
    // ignore e tenta fallback
  }
  router.replace(fallback);
}

/** Botão Voltar — prioriza o histórico real da navegação. */
export function BackButton({ fallback = "/inicio" }: { fallback?: Href }) {
  const navigation = useNavigation();

  return (
    <Pressable
      onPress={() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
          return;
        }
        goBack(fallback);
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
