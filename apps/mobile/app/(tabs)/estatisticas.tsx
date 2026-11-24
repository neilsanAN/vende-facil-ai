import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, control, fonts } from "@vendefacil/ui-tokens";
import { api } from "../../src/api";
import { BackButton } from "../../src/back-button";
import { handleTenantError } from "../../src/session";

type Stats = { views?: number; whatsappClicks?: number; orders?: number; salesCents?: number; note?: string };

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api
      .stats("7d")
      .then((result) => setStats(result as Stats))
      .catch((cause: unknown) => {
        if (handleTenantError(cause)) return;
        setError(cause instanceof Error ? cause.message : "Falha ao carregar.");
      });
  }, []);
  const cards = [
    [String(stats?.views ?? 0), "Visualizações"],
    [String(stats?.whatsappClicks ?? 0), "Cliques"],
    [String(stats?.orders ?? 0), "Pedidos"],
    [((stats?.salesCents ?? 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), "Vendas"],
  ];
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: Math.max(insets.top, 12), paddingHorizontal: 16, paddingBottom: 16 }}>
      <BackButton fallback="/inicio" />
      <Text style={{ color: colors.text, fontSize: fonts.heading, fontWeight: "700" }}>Resultados</Text>
      <Text style={{ color: colors.textSecondary, fontSize: fonts.body, marginTop: 4, marginBottom: 12 }}>Últimos 7 dias</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {cards.map(([value, label]) => (
          <View key={label} style={{ width: "47%", backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: control.radiusCard, padding: 12 }}>
            <Text style={{ color: colors.text, fontSize: fonts.title, fontWeight: "700" }}>{value}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: fonts.caption }}>{label}</Text>
          </View>
        ))}
      </View>
      {error ? <Text style={{ color: colors.error, fontSize: fonts.caption, marginTop: 8 }}>{error}</Text> : null}
      {stats?.note ? <Text style={{ color: colors.textSecondary, fontSize: fonts.body2, marginTop: 12 }}>{stats.note}</Text> : null}
    </View>
  );
}
