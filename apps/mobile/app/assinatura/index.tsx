import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, control, fonts } from "@vendefacil/ui-tokens";
import { ApiClientError } from "@vendefacil/api-client";
import { api } from "../../src/api";
import { BackButton } from "../../src/back-button";
import { useFeedback } from "../../src/feedback";
import { handleTenantError } from "../../src/session";
import { HelperText, PrimaryButton, ScreenTitle, SectionLabel } from "../../src/ui";

type Billing = Awaited<ReturnType<typeof api.billing>>;

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR");
}

function formatGb(value: number) {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: value % 1 ? 1 : 0, maximumFractionDigits: 1 });
}

function UsageRow({ label, value, pct }: { label: string; value: string; pct?: number | null }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <Text style={{ color: colors.text, fontSize: fonts.body, fontWeight: "600" }}>{label}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: fonts.body, fontWeight: "600" }}>{value}</Text>
      </View>
      {pct != null ? (
        <View style={{ marginTop: 8, height: 6, borderRadius: 999, backgroundColor: colors.primarySoft, overflow: "hidden" }}>
          <View style={{ width: `${Math.min(100, Math.max(0, pct))}%`, height: "100%", backgroundColor: colors.primary, borderRadius: 999 }} />
        </View>
      ) : null}
    </View>
  );
}

export default function MySubscriptionScreen() {
  const insets = useSafeAreaInsets();
  const feedback = useFeedback();
  const [data, setData] = useState<Billing | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (soft = false) => {
    if (!soft) setLoading(true);
    try {
      const result = await api.billing();
      setData(result);
      setError("");
    } catch (cause) {
      if (handleTenantError(cause)) return;
      const text = cause instanceof ApiClientError ? cause.message : "Não foi possível carregar a assinatura.";
      setError(text);
      if (!soft) feedback.showToast(text, "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [feedback]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const links = [
    { href: "/assinatura/alterar", label: "Alterar plano", icon: "arrow-up-outline" as const, danger: false },
    { href: "/assinatura/pagamento", label: "Forma de pagamento", icon: "card-outline" as const, danger: false },
    { href: "/assinatura/faturas", label: "Histórico de faturas", icon: "document-text-outline" as const, danger: false },
    { href: "/assinatura/cancelar", label: "Cancelar assinatura", icon: "trash-outline" as const, danger: true },
  ];

  const usage = data?.usage;
  const videosPct = usage && usage.videos.cap > 0 ? Math.round((usage.videos.used / usage.videos.cap) * 100) : null;
  const storagePct = usage && usage.storage.capGb > 0 ? Math.round((usage.storage.usedGb / usage.storage.capGb) * 100) : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: Math.max(insets.top, 12) }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 28) }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load(true);
            }}
          />
        }
      >
        <BackButton fallback="/mais" />
        <ScreenTitle>Minha Assinatura</ScreenTitle>

        {error ? (
          <View style={{ marginBottom: 12 }}>
            <HelperText error>{error}</HelperText>
            <PrimaryButton label="Tentar de novo" onPress={() => void load()} />
            <View style={{ height: 8 }} />
            <PrimaryButton label="Ver planos" onPress={() => router.push("/planos")} />
          </View>
        ) : null}

        {loading && !data && !error ? (
          <Text style={{ color: colors.textSecondary, fontSize: fonts.body, fontWeight: "600", marginBottom: 12 }}>
            Carregando assinatura…
          </Text>
        ) : null}

        {data ? (
          <>
            {data.states.expired ? (
              <View style={{ marginBottom: 10, borderRadius: control.radiusCard, backgroundColor: "#FEF2F2", padding: 12 }}>
                <Text style={{ color: colors.error, fontSize: fonts.body, fontWeight: "600" }}>Assinatura vencida. Escolha um plano para continuar.</Text>
              </View>
            ) : null}
            {data.states.pendingPayment ? (
              <View style={{ marginBottom: 10, borderRadius: control.radiusCard, backgroundColor: "#FFFBEB", padding: 12 }}>
                <Text style={{ color: "#92400E", fontSize: fonts.body, fontWeight: "600" }}>Pagamento pendente — liberação só após confirmação do provedor.</Text>
              </View>
            ) : null}

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: control.radiusSheet,
                padding: 14,
                marginBottom: 18,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: control.radiusCard,
                  backgroundColor: colors.primary,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="diamond-outline" size={20} color="#fff" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <Text style={{ color: colors.text, fontSize: fonts.title, fontWeight: "700" }}>
                    Plano {data.subscription?.plan.name || "Gratuito"}
                  </Text>
                  <View
                    style={{
                      borderRadius: 999,
                      backgroundColor: data.states.expired ? "#FEE2E2" : "#DCFCE7",
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                    }}
                  >
                    <Text style={{ color: data.states.expired ? colors.error : "#15803D", fontSize: fonts.caption, fontWeight: "700" }}>
                      {data.states.expired ? "Inativo" : "Ativo"}
                    </Text>
                  </View>
                </View>
                <Text style={{ color: colors.textSecondary, fontSize: fonts.body2, fontWeight: "500", marginTop: 4 }}>
                  Renova em: {formatDate(data.subscription?.currentPeriodEnd || data.usage.periodEnd)}
                </Text>
              </View>
            </View>

            <SectionLabel>Uso do plano</SectionLabel>
            <View
              style={{
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: control.radiusSheet,
                padding: 14,
                marginBottom: 16,
              }}
            >
              <UsageRow
                label={`Vídeos (${data.usage.videos.cap}/mês)`}
                value={`${data.usage.videos.used} / ${data.usage.videos.cap}`}
                pct={videosPct}
              />
              <UsageRow
                label="Produtos"
                value={data.usage.products.cap < 0 ? "∞ Ilimitado" : `${data.usage.products.used} / ${data.usage.products.cap}`}
                pct={null}
              />
              <UsageRow
                label="Armazenamento"
                value={`${formatGb(data.usage.storage.usedGb)} GB / ${data.usage.storage.capGb} GB`}
                pct={storagePct}
              />
            </View>

            {data.usage.videos.cap >= 0 && data.usage.videos.used >= data.usage.videos.cap ? (
              <View style={{ marginBottom: 12, borderRadius: control.radiusSheet, backgroundColor: colors.primarySoft, padding: 12 }}>
                <Text style={{ color: colors.primary, fontSize: fonts.body, fontWeight: "700" }}>Limite de vídeos atingido</Text>
                <Text style={{ color: colors.textSecondary, fontSize: fonts.body2, fontWeight: "500", marginTop: 4 }}>
                  Faça upgrade para continuar neste período.
                </Text>
                <View style={{ marginTop: 10 }}>
                  <PrimaryButton label="Ver planos" onPress={() => router.push("/planos")} />
                </View>
              </View>
            ) : null}

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
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: control.radiusCard,
                    backgroundColor: item.danger ? "#FEF2F2" : colors.primarySoft,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name={item.icon} size={control.icon} color={item.danger ? colors.error : colors.primary} />
                </View>
                <Text style={{ flex: 1, color: item.danger ? colors.error : colors.text, fontSize: fonts.subtitle, fontWeight: "600" }}>
                  {item.label}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.border} />
              </Pressable>
            ))}

            {data.states.cancelScheduled ? (
              <View style={{ marginTop: 10 }}>
                <PrimaryButton
                  label="Reativar assinatura"
                  onPress={async () => {
                    try {
                      await api.reactivateSubscription();
                      await load(true);
                      feedback.showToast("Assinatura reativada.", "success");
                    } catch (cause) {
                      const text = cause instanceof ApiClientError ? cause.message : "Falha ao reativar.";
                      setError(text);
                      feedback.showToast(text, "error");
                    }
                  }}
                />
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
