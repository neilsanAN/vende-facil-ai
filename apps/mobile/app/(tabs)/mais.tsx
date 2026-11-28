import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, control, fonts } from "@vendefacil/ui-tokens";
import { ConfirmSheet } from "../../src/feedback";
import { deleteItem } from "../../src/storage";

const links = [
  { href: "/pedidos", label: "Pedidos", text: "Pedidos da vitrine", icon: "bag-handle-outline" as const },
  { href: "/estatisticas", label: "Estatísticas", text: "Visualizações e vendas", icon: "bar-chart-outline" as const },
  { href: "/estudio/publicar", label: "Publicar", text: "WhatsApp, Instagram e Facebook", icon: "share-social-outline" as const },
  { href: "/planos", label: "Planos e preços", text: "Básico, Profissional e Business", icon: "diamond-outline" as const },
] as const;

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const [confirmLogout, setConfirmLogout] = useState(false);

  async function logout() {
    await deleteItem("vf_access");
    await deleteItem("vf_refresh");
    router.replace("/");
  }

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
        onPress={() => setConfirmLogout(true)}
        style={{
          marginTop: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: "#FECACA",
          borderRadius: 14,
          padding: 14,
        }}
      >
        <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: "#FEF2F2", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="log-out-outline" size={18} color={colors.error} />
        </View>
        <Text style={{ flex: 1, color: colors.error, fontSize: fonts.subtitle, fontWeight: "700" }}>Sair</Text>
        <Ionicons name="chevron-forward" size={16} color="#FECACA" />
      </Pressable>

      <Pressable onPress={() => router.push("/conta/excluir")} style={{ marginTop: 14, alignItems: "center", paddingVertical: 8 }}>
        <Text style={{ color: colors.textSecondary, fontSize: fonts.caption, fontWeight: "600" }}>Excluir minha conta</Text>
      </Pressable>

      <ConfirmSheet
        open={confirmLogout}
        title="Sair da conta?"
        message="Você precisará entrar de novo para acessar anúncios e a loja."
        confirmLabel="Sair"
        destructive
        onClose={() => setConfirmLogout(false)}
        onConfirm={() => {
          void logout();
        }}
      />
    </View>
  );
}
