import { useCallback, useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "@vendefacil/ui-tokens";
import { ApiClientError } from "@vendefacil/api-client";
import { formatBrl } from "@vendefacil/types";
import { api } from "../../src/api";
import { FALLBACK_PLANS, normalizePlans, priceFor, type PlanCard } from "../../src/billing-catalog";
import { BackButton } from "../../src/back-button";
import { useFeedback } from "../../src/feedback";
import { handleTenantError } from "../../src/session";
import { HelperText, PrimaryButton, ScreenTitle } from "../../src/ui";

export default function ChangePlanScreen() {
  const insets = useSafeAreaInsets();
  const feedback = useFeedback();
  const [plans, setPlans] = useState<PlanCard[]>(FALLBACK_PLANS);
  const [interval, setInterval] = useState<"MONTH" | "YEAR">("MONTH");
  const [selected, setSelected] = useState("pro");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    try {
      const result = await api.billing();
      setPlans(normalizePlans(result.plans));
      setInterval(result.subscription?.billingInterval || "MONTH");
      setSelected(result.subscription?.plan.code || "pro");
      setError("");
    } catch (cause) {
      if (handleTenantError(cause)) return;
      setError(cause instanceof ApiClientError ? cause.message : "Não sincronizou. Usando catálogo local.");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const result = await api.changePlan({ planCode: selected, interval });
      if (result.prorationNote) setNote(result.prorationNote);
      if (result.url) await Linking.openURL(result.url);
      else {
        feedback.showToast("Plano atualizado.", "success");
        router.replace("/assinatura");
      }
    } catch (cause) {
      if (handleTenantError(cause)) return;
      const text = cause instanceof ApiClientError ? cause.message : "Não foi possível alterar o plano.";
      setError(text);
      feedback.showToast(text, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: Math.max(insets.top, 12) }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 28) }}>
        <BackButton fallback="/assinatura" />
        <ScreenTitle style={{ marginBottom: 4 }}>Alterar plano</ScreenTitle>
        <Text style={{ color: colors.textSecondary, fontSize: fonts.body, fontWeight: "500", marginBottom: 12 }}>
          Upgrade, downgrade e cobrança do novo ciclo após confirmação do pagamento.
        </Text>

        <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
          {(["MONTH", "YEAR"] as const).map((value) => (
            <Pressable
              key={value}
              onPress={() => setInterval(value)}
              style={{
                flex: 1,
                borderRadius: 999,
                paddingVertical: 10,
                alignItems: "center",
                backgroundColor: interval === value ? colors.primary : colors.surface,
                borderWidth: interval === value ? 0 : 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ color: interval === value ? "#fff" : colors.text, fontSize: fonts.body, fontWeight: "700" }}>
                {value === "MONTH" ? "Mensal" : "Anual"}
              </Text>
            </Pressable>
          ))}
        </View>

        {plans.map((plan) => {
          const active = selected === plan.code;
          return (
            <Pressable
              key={plan.code}
              onPress={() => setSelected(plan.code)}
              style={{
                borderRadius: 14,
                borderWidth: active ? 2 : 1,
                borderColor: active ? colors.primary : colors.border,
                backgroundColor: colors.surface,
                padding: 14,
                marginBottom: 8,
                flexDirection: "row",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: fonts.subtitle, fontWeight: "700" }}>{plan.name}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: fonts.caption, marginTop: 4 }}>{plan.description}</Text>
              </View>
              <Text style={{ color: colors.text, fontSize: fonts.subtitle, fontWeight: "700" }}>{formatBrl(priceFor(plan, interval))}</Text>
            </Pressable>
          );
        })}

        {note ? <HelperText>{note}</HelperText> : null}
        {error ? <HelperText error>{error}</HelperText> : null}
        <PrimaryButton label={busy ? "Confirmando…" : "Confirmar mudança"} busy={busy} onPress={() => void submit()} />
        <View style={{ marginTop: 12, flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
          <Text style={{ flex: 1, color: colors.textSecondary, fontSize: fonts.caption, lineHeight: 16 }}>
            Planos pagos abrem checkout. O novo plano começa após o webhook aprovar o pagamento.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
