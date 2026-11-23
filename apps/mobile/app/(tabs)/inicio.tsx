import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { colors, control, fonts } from "@vendefacil/ui-tokens";
import { api } from "../../src/api";

type Dash = {
  greeting?: { name?: string; subtitle?: string };
  stats?: { products?: number; views?: number; orders?: number };
};

export default function HomeScreen() {
  const [data, setData] = useState<Dash | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api.dashboard().then((result) => setData(result as Dash)).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Falha ao carregar."));
  }, []);
  const first = (data?.greeting?.name || "").split(" ")[0] || "você";
  const stats = data?.stats;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
      <Text style={{ color: colors.text, fontSize: fonts.hero, fontWeight: "700" }}>Olá, {first}!</Text>
      <Text style={{ color: colors.textSecondary, fontSize: fonts.body, marginTop: 2 }}>Pronto para vender hoje?</Text>
      <Pressable onPress={() => router.push("/anuncios")} style={{ marginTop: 16, backgroundColor: colors.primary, borderRadius: control.radiusCard, padding: 16 }}>
        <Text style={{ color: "white", fontSize: fonts.body, fontWeight: "600" }}>Criar novo anúncio</Text>
        <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: fonts.caption, marginTop: 4 }}>Tire uma foto, use a IA e divulgue nas redes.</Text>
      </Pressable>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
        {[
          [String(stats?.products ?? 0), "Produtos"],
          [String(stats?.views ?? 0), "Visualizações"],
          [String(stats?.orders ?? 0), "Pedidos"],
        ].map(([value, label]) => (
          <View key={label} style={{ flex: 1, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: control.radiusCard, padding: 10 }}>
            <Text style={{ color: colors.text, fontSize: fonts.title, fontWeight: "700" }}>{value}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: fonts.caption }}>{label}</Text>
          </View>
        ))}
      </View>
      {error ? <Text style={{ color: colors.error, fontSize: fonts.caption, marginTop: 8 }}>{error}</Text> : null}
      <Text style={{ color: colors.textSecondary, fontSize: fonts.body2, marginTop: 8 }}>Números reais dos últimos 7 dias.</Text>
    </ScrollView>
  );
}
