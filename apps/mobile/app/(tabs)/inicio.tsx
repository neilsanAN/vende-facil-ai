import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "@vendefacil/ui-tokens";
import { api } from "../../src/api";
import { handleTenantError } from "../../src/session";

type Dash = {
  greeting?: { name?: string };
  stats?: { views?: number; whatsappClicks?: number; orders?: number; salesCents?: number };
  recent?: Array<{ id: string; name: string; priceCents: number; promoPriceCents?: number | null }>;
};

const actions = [
  { href: "/anuncios/novo", label: "Anúncio com IA", icon: "sparkles-outline" as const },
  { href: "/estudio/video/novo", label: "Vídeo com voz", icon: "videocam-outline" as const },
  { href: "/estudio", label: "Arte para redes", icon: "image-outline" as const },
  { href: "/estudio/publicar", label: "Publicar nas redes", icon: "share-social-outline" as const },
] as const;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<Dash | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api
      .dashboard()
      .then((result) => setData(result as Dash))
      .catch((cause: unknown) => {
        if (handleTenantError(cause)) return;
        setError(cause instanceof Error ? cause.message : "Falha ao carregar.");
      });
  }, []);
  const first =
    (data?.greeting?.name || "").trim().split(/\s+/)[0] ||
    (data?.greeting?.name || "").trim() ||
    "você";
  const stats = data?.stats;
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: Math.max(insets.top, 10), paddingHorizontal: 16, paddingBottom: 24 }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>{first.slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>
            Olá, {first}! 👋
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 1 }}>Pronto para vender hoje?</Text>
        </View>
        <View style={{ width: 34, height: 34, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="notifications-outline" size={16} color={colors.textSecondary} />
        </View>
      </View>

      <Pressable
        onPress={() => router.push("/anuncios/novo")}
        style={{
          marginTop: 12,
          borderRadius: 16,
          paddingVertical: 12,
          paddingHorizontal: 14,
          backgroundColor: colors.primary,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={{ color: "white", fontSize: 14, fontWeight: "700" }}>Crie seu próximo anúncio</Text>
          <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 10, marginTop: 4, lineHeight: 13 }}>
            Tire uma foto, use a IA e divulgue em todas as suas redes.
          </Text>
        </View>
        <View style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="camera-outline" size={18} color="#fff" />
        </View>
      </Pressable>

      <View style={{ flexDirection: "row", gap: 6, marginTop: 10 }}>
        {actions.map((action) => (
          <Pressable
            key={action.label}
            onPress={() => router.push(action.href)}
            style={{
              flex: 1,
              alignItems: "center",
              gap: 5,
              backgroundColor: "#F7F4FF",
              borderWidth: 1,
              borderColor: "#EFEAFF",
              borderRadius: 12,
              paddingVertical: 8,
              paddingHorizontal: 2,
            }}
          >
            <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={action.icon} size={15} color={colors.primary} />
            </View>
            <Text style={{ color: colors.text, fontSize: 9, fontWeight: "600", textAlign: "center", lineHeight: 11 }}>{action.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 16 }}>
        <Text style={{ color: colors.text, fontSize: fonts.subtitle, fontWeight: "700" }}>Resultados (7 dias)</Text>
        <Pressable onPress={() => router.push("/estatisticas")}>
          <Text style={{ color: colors.primary, fontSize: fonts.caption, fontWeight: "600" }}>Ver tudo</Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
        {[
          { value: String(stats?.views ?? 0), label: "Visualizações", icon: "eye-outline" as const },
          { value: String(stats?.whatsappClicks ?? 0), label: "Cliques", icon: "hand-left-outline" as const },
          { value: String(stats?.orders ?? 0), label: "Pedidos", icon: "cart-outline" as const },
          {
            value: ((stats?.salesCents ?? 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
            label: "Vendas",
            icon: "cash-outline" as const,
          },
        ].map((item) => (
          <View key={item.label} style={{ width: "48%", backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10 }}>
            <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
              <Ionicons name={item.icon} size={12} color={colors.primary} />
            </View>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>{item.value}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 9 }}>{item.label}</Text>
          </View>
        ))}
      </View>
      {error ? <Text style={{ color: colors.error, fontSize: fonts.caption, marginTop: 8 }}>{error}</Text> : null}

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 16, marginBottom: 6 }}>
        <Text style={{ color: colors.text, fontSize: fonts.subtitle, fontWeight: "700" }}>Produtos recentes</Text>
        <Pressable onPress={() => router.push("/produtos")}>
          <Text style={{ color: colors.primary, fontSize: fonts.caption, fontWeight: "600" }}>Ver todos</Text>
        </Pressable>
      </View>
      {(data?.recent || []).length === 0 ? (
        <Text style={{ color: colors.textSecondary, fontSize: fonts.body }}>Cadastre o primeiro produto para aparecer aqui.</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(data?.recent || []).map((product) => (
            <View key={product.id} style={{ width: 100, marginRight: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 8 }}>
              <Text style={{ color: colors.text, fontSize: fonts.caption, fontWeight: "600" }} numberOfLines={1}>
                {product.name}
              </Text>
              <Text style={{ color: colors.primary, fontSize: fonts.caption, marginTop: 4 }}>
                {((product.promoPriceCents ?? product.priceCents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
    </ScrollView>
  );
}
