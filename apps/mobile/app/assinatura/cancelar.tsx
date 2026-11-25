import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "@vendefacil/ui-tokens";
import { ApiClientError } from "@vendefacil/api-client";
import { api } from "../../src/api";
import { BackButton } from "../../src/back-button";
import { handleTenantError } from "../../src/session";
import { HelperText, PrimaryButton, ScreenTitle, SecondaryButton } from "../../src/ui";

type Billing = Awaited<ReturnType<typeof api.billing>>;

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR");
}

export default function CancelScreen() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<Billing | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ endsAt: string; retention: string } | null>(null);

  useFocusEffect(
    useCallback(() => {
      api
        .billing()
        .then(setData)
        .catch((cause) => {
          if (handleTenantError(cause)) return;
          setError(cause instanceof ApiClientError ? cause.message : "Falha ao carregar.");
        });
    }, []),
  );

  async function cancel() {
    setBusy(true);
    setError("");
    try {
      const result = await api.cancelSubscription();
      setDone(result);
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : "Não foi possível cancelar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: Math.max(insets.top, 12) }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28 }}>
        <BackButton fallback="/assinatura" />
        <ScreenTitle style={{ marginBottom: 4 }}>Cancelar assinatura</ScreenTitle>
        <Text style={{ color: colors.textSecondary, fontSize: fonts.body, fontWeight: "500", marginBottom: 14 }}>
          Confirmação, data de encerramento e retenção dos dados.
        </Text>
        {!data && !error ? <ActivityIndicator color={colors.primary} /> : null}
        {data ? (
          <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 14, marginBottom: 14 }}>
            <Text style={{ color: colors.text, fontSize: fonts.subtitle, fontWeight: "700" }}>Antes de cancelar</Text>
            <Text style={{ color: colors.textSecondary, fontSize: fonts.body, marginTop: 8, lineHeight: 18 }}>
              Você mantém o plano até {formatDate(data.subscription?.currentPeriodEnd)}.
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: fonts.body, marginTop: 8, lineHeight: 18 }}>
              Produtos, anúncios e mídias permanecem disponíveis conforme a política de retenção.
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: fonts.body, marginTop: 8, lineHeight: 18 }}>
              É possível reativar antes do fim do período em Minha assinatura.
            </Text>
          </View>
        ) : null}
        {done ? (
          <View style={{ borderRadius: 14, backgroundColor: colors.primarySoft, padding: 14, marginBottom: 14 }}>
            <Text style={{ color: colors.text, fontSize: fonts.subtitle, fontWeight: "700" }}>Encerramento em {formatDate(done.endsAt)}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: fonts.body, marginTop: 8, lineHeight: 18 }}>{done.retention}</Text>
          </View>
        ) : null}
        {error ? <HelperText error>{error}</HelperText> : null}
        {!done ? (
          <PrimaryButton
            label={data?.states.cancelScheduled ? "Cancelamento já agendado" : busy ? "Confirmando…" : "Confirmar cancelamento"}
            busy={busy}
            disabled={Boolean(data?.states.cancelScheduled)}
            onPress={() => void cancel()}
          />
        ) : (
          <PrimaryButton label="Voltar para Minha assinatura" onPress={() => router.replace("/assinatura")} />
        )}
        <View style={{ height: 10 }} />
        <SecondaryButton label="Manter plano" onPress={() => router.back()} />
      </ScrollView>
    </View>
  );
}
