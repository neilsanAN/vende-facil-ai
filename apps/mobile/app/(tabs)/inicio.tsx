import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { colors, control, fonts } from "@vendefacil/ui-tokens";
import { api } from "../../src/api";

type Dash = {
  greeting?: { name?: string };
  stats?: { views?: number; whatsappClicks?: number; orders?: number; salesCents?: number };
  recent?: Array<{ id: string; name: string; priceCents: number; promoPriceCents?: number | null }>;
};

const actions = [
  { href: "/anuncios", label: "Anúncio com IA", color: "#7C5CFF" },
  { href: "/estudio", label: "Vídeo com voz", color: "#6D4AFF" },
  { href: "/estudio", label: "Arte para redes", color: "#7C5CFF" },
  { href: "/mais", label: "Publicar nas redes", color: "#7C5CFF" },
] as const;

export default function HomeScreen() {
  const [data, setData] = useState<Dash | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api
      .dashboard()
      .then((result) => setData(result as Dash))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Falha ao carregar."));
  }, []);
  const first = (data?.greeting?.name || "").split(" ")[0] || "você";
  const stats = data?.stats;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.primary, fontWeight: "700", fontSize: fonts.title }}>{first.slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: fonts.hero, fontWeight: "700" }}>Olá, {first}!</Text>
          <Text style={{ color: colors.textSecondary, fontSize: fonts.body, marginTop: 2 }}>Pronto para vender hoje?</Text>
        </View>
      </View>

      <Pressable
        onPress={() => router.push("/anuncios")}
        style={{
          marginTop: 16,
          borderRadius: 16,
          padding: 16,
          backgroundColor: colors.primary,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={{ color: "white", fontSize: fonts.body, fontWeight: "600" }}>Crie seu próximo anúncio</Text>
          <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: fonts.caption, marginTop: 4 }}>Tire uma foto, use a IA e divulgue nas redes.</Text>
        </View>
      </Pressable>

      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
        {actions.map((action) => (
          <Pressable
            key={action.label}
            onPress={() => router.push(action.href)}
            style={{ flex: 1, alignItems: "center", gap: 8, backgroundColor: colors.surface, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 4 }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: action.color }} />
            <Text style={{ color: colors.textSecondary, fontSize: fonts.caption, fontWeight: "500", textAlign: "center" }}>{action.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={{ color: colors.text, fontSize: fonts.body, fontWeight: "600", marginTop: 20 }}>Resultados · 7 dias</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
        {[
          [String(stats?.views ?? 0), "Visualizações"],
          [String(stats?.whatsappClicks ?? 0), "Cliques WhatsApp"],
          [String(stats?.orders ?? 0), "Pedidos"],
          [((stats?.salesCents ?? 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), "Vendas"],
        ].map(([value, label]) => (
          <View key={label} style={{ width: "48%", backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 12 }}>
            <Text style={{ color: colors.text, fontSize: fonts.display, fontWeight: "700" }}>{value}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: fonts.caption }}>{label}</Text>
          </View>
        ))}
      </View>
      {error ? <Text style={{ color: colors.error, fontSize: fonts.caption, marginTop: 8 }}>{error}</Text> : null}
      <Text style={{ color: colors.textSecondary, fontSize: fonts.body2, marginTop: 8 }}>Números reais dos últimos 7 dias.</Text>

      <Text style={{ color: colors.text, fontSize: fonts.body, fontWeight: "600", marginTop: 20, marginBottom: 8 }}>Produtos recentes</Text>
      {(data?.recent || []).length === 0 ? (
        <Text style={{ color: colors.textSecondary, fontSize: fonts.body }}>Cadastre o primeiro produto para aparecer aqui.</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(data?.recent || []).map((product) => (
            <View key={product.id} style={{ width: 112, marginRight: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 8 }}>
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
