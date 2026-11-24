import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, control, fonts } from "@vendefacil/ui-tokens";

const links = [
  { href: "/pedidos", label: "Pedidos", text: "Pedidos da vitrine", icon: "bag-handle-outline" as const },
  { href: "/estatisticas", label: "Estatísticas", text: "Visualizações e vendas", icon: "bar-chart-outline" as const },
  { href: "/estudio", label: "Estúdio", text: "Vídeo, arte e anúncios", icon: "sparkles-outline" as const },
] as const;

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: Math.max(insets.top, 12), paddingHorizontal: 16, paddingBottom: 16 }}>
      <Text style={{ color: colors.text, fontSize: fonts.heading, fontWeight: "700" }}>Mais</Text>
      <Text style={{ color: colors.textSecondary, fontSize: fonts.body, marginTop: 4, marginBottom: 14 }}>Loja, pedidos, resultados e ajustes.</Text>
      {links.map((item) => (
        <Pressable
          key={item.href}
          onPress={() => router.push(item.href)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 14,
            padding: 14,
            marginBottom: 8,
          }}
        >
          <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name={item.icon} size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: fonts.subtitle, fontWeight: "600" }}>{item.label}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: fonts.caption, marginTop: 2 }}>{item.text}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.border} />
        </Pressable>
      ))}
      <Pressable
        onPress={async () => {
          await SecureStore.deleteItemAsync("vf_access");
          await SecureStore.deleteItemAsync("vf_refresh");
          router.replace("/");
        }}
        style={{
          marginTop: 16,
          height: control.height,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.surface,
        }}
      >
        <Text style={{ color: colors.text, fontSize: fonts.body, fontWeight: "600" }}>Sair</Text>
      </Pressable>
    </View>
  );
}
