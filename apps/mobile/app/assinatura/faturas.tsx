import { useCallback, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "@vendefacil/ui-tokens";
import { ApiClientError } from "@vendefacil/api-client";
import { formatBrl } from "@vendefacil/types";
import { api } from "../../src/api";
import { BackButton } from "../../src/back-button";
import { handleTenantError } from "../../src/session";
import { HelperText, ScreenTitle } from "../../src/ui";

type Billing = Awaited<ReturnType<typeof api.billing>>;

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR");
}

export default function InvoicesScreen() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<Billing | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (soft = false) => {
    try {
      const result = await api.billing();
      setData(result);
      setError("");
    } catch (cause) {
      if (handleTenantError(cause)) return;
      setError(cause instanceof ApiClientError ? cause.message : "Falha ao carregar faturas.");
    } finally {
      if (soft) setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: Math.max(insets.top, 12) }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(true); }} />}
      >
        <BackButton fallback="/assinatura" />
        <ScreenTitle style={{ marginBottom: 4 }}>Histórico de cobranças</ScreenTitle>
        <Text style={{ color: colors.textSecondary, fontSize: fonts.body, fontWeight: "500", marginBottom: 14 }}>Pagamentos, recibos, faturas e status.</Text>
        {error ? <HelperText error>{error}</HelperText> : null}
        {!data ? <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} /> : null}
        {data && !data.invoices.length && !data.payments.length ? (
          <View style={{ borderRadius: 14, borderWidth: 1, borderStyle: "dashed", borderColor: colors.border, padding: 24, alignItems: "center" }}>
            <Text style={{ color: colors.textSecondary, fontSize: fonts.body }}>Nenhuma cobrança ainda.</Text>
          </View>
        ) : null}
        {data?.invoices.map((invoice) => (
          <View key={invoice.id} style={{ borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 14, marginBottom: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: fonts.subtitle, fontWeight: "700" }}>{invoice.description}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: fonts.caption, marginTop: 4 }}>{formatDate(invoice.paidAt || invoice.createdAt)}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ color: colors.text, fontSize: fonts.subtitle, fontWeight: "700" }}>{formatBrl(invoice.amountCents)}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: fonts.caption, marginTop: 4, fontWeight: "600" }}>{invoice.status}</Text>
              </View>
            </View>
          </View>
        ))}
        {data?.payments.map((payment) => (
          <View key={payment.id} style={{ borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 14, marginBottom: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: colors.text, fontSize: fonts.body, fontWeight: "600" }}>Pagamento · {payment.method || "checkout"}</Text>
              <Text style={{ color: colors.text, fontSize: fonts.body, fontWeight: "700" }}>{formatBrl(payment.amountCents)}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
              <Text style={{ color: colors.textSecondary, fontSize: fonts.caption }}>{formatDate(payment.createdAt)}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: fonts.caption }}>{payment.status}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
