import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { colors, control, fonts } from "@vendefacil/ui-tokens";
import { api } from "../../src/api";

type Product = {
  id: string;
  name: string;
  priceCents: number;
  promoPriceCents?: number | null;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  published?: boolean;
};

type Filter = "ALL" | "ACTIVE" | "DRAFT";

export default function ProductsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .products()
      .then((result) => {
        const payload = result as { data?: Product[] };
        setProducts(payload.data || []);
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Falha ao carregar."));
  }, []);

  const counts = useMemo(
    () => ({
      ALL: products.length,
      ACTIVE: products.filter((item) => item.status === "ACTIVE").length,
      DRAFT: products.filter((item) => item.status === "DRAFT").length,
    }),
    [products],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return products.filter((item) => {
      if (filter === "ACTIVE" && item.status !== "ACTIVE") return false;
      if (filter === "DRAFT" && item.status !== "DRAFT") return false;
      if (!needle) return true;
      return item.name.toLowerCase().includes(needle);
    });
  }, [products, filter, q]);

  const tabs: Array<{ key: Filter; label: string; count: number }> = [
    { key: "ALL", label: "Todos", count: counts.ALL },
    { key: "ACTIVE", label: "Ativos", count: counts.ACTIVE },
    { key: "DRAFT", label: "Rascunhos", count: counts.DRAFT },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: 16 }}>
      <Text style={{ color: colors.text, fontSize: fonts.heading, fontWeight: "700", marginBottom: 12 }}>Produtos</Text>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="Buscar produto"
        placeholderTextColor={colors.textSecondary}
        style={{
          height: control.height,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: control.radiusInput,
          backgroundColor: colors.surface,
          color: colors.text,
          paddingHorizontal: 12,
          fontSize: fonts.body,
          marginBottom: 10,
        }}
      />
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        {tabs.map((tab) => {
          const active = filter === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setFilter(tab.key)}
              style={{
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: active ? colors.primary : colors.surface,
                borderWidth: active ? 0 : 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ color: active ? "#fff" : colors.textSecondary, fontSize: fonts.caption, fontWeight: "600" }}>
                {tab.label} ({tab.count})
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={{ color: colors.error, fontSize: fonts.caption, marginBottom: 8 }}>{error}</Text> : null}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={error ? null : <Text style={{ color: colors.textSecondary, fontSize: fonts.body }}>Nenhum produto neste filtro.</Text>}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 12, marginBottom: 8, flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: fonts.body, fontWeight: "600" }}>{item.name}</Text>
              <Text style={{ color: colors.primary, fontSize: fonts.body, marginTop: 2 }}>
                {((item.promoPriceCents ?? item.priceCents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: fonts.caption, marginTop: 4 }}>{item.published ? "Na vitrine" : "Só rascunho"}</Text>
            </View>
            <View style={{ alignSelf: "flex-start", borderRadius: 999, backgroundColor: item.status === "ACTIVE" ? "#DCFCE7" : colors.primarySoft, paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text style={{ color: item.status === "ACTIVE" ? "#166534" : colors.primary, fontSize: fonts.caption, fontWeight: "600" }}>
                {item.status === "ACTIVE" ? "Ativo" : item.status === "DRAFT" ? "Rascunho" : "Arquivo"}
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}
