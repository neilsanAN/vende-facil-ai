import { useEffect, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { colors, control, fonts } from "@vendefacil/ui-tokens";
import { api } from "../../src/api";

type Order = { id: string; totalCents: number; status: string; customer?: { name?: string }; items?: unknown[] };

export default function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    api.orders().then((result) => setOrders((result as Order[]) || [])).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Falha ao carregar."));
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: 16 }}>
      <Text style={{ color: colors.text, fontSize: fonts.heading, fontWeight: "700" }}>Pedidos</Text>
      <Text style={{ color: colors.textSecondary, fontSize: fonts.body, marginTop: 4, marginBottom: 12 }}>Um clique no WhatsApp não entra aqui.</Text>
      {error ? <Text style={{ color: colors.error, fontSize: fonts.caption }}>{error}</Text> : null}
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={error ? null : <Text style={{ color: colors.textSecondary, fontSize: fonts.body }}>Nenhum pedido registrado.</Text>}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: control.radiusCard, padding: 12, marginBottom: 8 }}>
            <Text style={{ color: colors.text, fontSize: fonts.body, fontWeight: "600" }}>{item.customer?.name || "Cliente"}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: fonts.caption }}>{item.items?.length || 0} itens · {(item.totalCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} · {item.status}</Text>
          </View>
        )}
      />
    </View>
  );
}
