import { useEffect, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { colors, control, fonts } from "@vendefacil/ui-tokens";
import { api } from "../../src/api";

type Product = { id: string; name: string; priceCents: number; promoPriceCents?: number | null };

export default function ProductsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    api.products().then((result) => {
      const payload = result as { data?: Product[] };
      setProducts(payload.data || []);
    }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Falha ao carregar."));
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: 16 }}>
      <Text style={{ color: colors.text, fontSize: fonts.heading, fontWeight: "700", marginBottom: 12 }}>Produtos</Text>
      {error ? <Text style={{ color: colors.error, fontSize: fonts.caption }}>{error}</Text> : null}
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={error ? null : <Text style={{ color: colors.textSecondary, fontSize: fonts.body }}>Nenhum produto neste cadastro.</Text>}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: control.radiusCard, padding: 12, marginBottom: 8 }}>
            <Text style={{ color: colors.text, fontSize: fonts.body, fontWeight: "600" }}>{item.name}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: fonts.caption }}>{((item.promoPriceCents ?? item.priceCents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</Text>
          </View>
        )}
      />
    </View>
  );
}
