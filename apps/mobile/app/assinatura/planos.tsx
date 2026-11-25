import { useCallback, useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, control, fonts } from "@vendefacil/ui-tokens";
import { ApiClientError } from "@vendefacil/api-client";
import { formatBrl } from "@vendefacil/types";
import { api } from "../../src/api";
import { FALLBACK_PLANS, normalizePlans, priceFor, type PlanCard } from "../../src/billing-catalog";
import { BackButton } from "../../src/back-button";
import { useFeedback } from "../../src/feedback";
import { handleTenantError } from "../../src/session";
import { HelperText, PrimaryButton, ScreenTitle } from "../../src/ui";

function planVisual(icon?: string): { name: keyof typeof Ionicons.glyphMap; bg: string; fg: string } {
  if (icon === "rocket") return { name: "rocket-outline", bg: "#FFEDD5", fg: "#EA580C" };
  if (icon === "crown") return { name: "diamond-outline", bg: "#FEF3C7", fg: "#D97706" };
  if (icon === "building") return { name: "business-outline", bg: "#DBEAFE", fg: "#2563EB" };
  return { name: "sparkles-outline", bg: colors.primarySoft, fg: colors.primary };
}

export default function PlansScreen() {
  const insets = useSafeAreaInsets();
  const feedback = useFeedback();
  const [plans, setPlans] = useState<PlanCard[]>(FALLBACK_PLANS);
  const [interval, setInterval] = useState<"MONTH" | "YEAR">("MONTH");
  const [selected, setSelected] = useState("pro");
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setSyncing(true);
    try {
      const result = await api.billing();
      const next = normalizePlans(result.plans);
      setPlans(next);
      const current = result.subscription?.plan.code;
      if (current && current !== "free" && next.some((plan) => plan.code === current)) {
        setSelected(current);
      }
      setError("");
    } catch (cause) {
      if (handleTenantError(cause)) return;
      // Mantém catálogo local — não trava a tela em spinner.
      setError(cause instanceof ApiClientError ? cause.message : "Não foi possível sincronizar os planos. Mostrando valores locais.");
    } finally {
      setSyncing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function subscribe() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api.checkout({ planCode: selected, interval });
      if (result.url) await Linking.openURL(result.url);
      else {
        setMessage("Plano ativado.");
        feedback.showToast("Plano atualizado.", "success");
        router.replace("/assinatura");
      }
    } catch (cause) {
      if (handleTenantError(cause)) return;
      const text = cause instanceof ApiClientError ? cause.message : "Não foi possível abrir o checkout.";
      setError(text);
      feedback.showToast(text, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: Math.max(insets.top, 12) }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 28) }}>
        <BackButton fallback="/mais" />
        <ScreenTitle style={{ marginBottom: 4 }}>Planos e Assinatura</ScreenTitle>
        <Text style={{ color: colors.textSecondary, fontSize: fonts.body, fontWeight: "500", marginBottom: 14 }}>
          Escolha o plano ideal para o seu negócio.
        </Text>

        {syncing ? (
          <Text style={{ color: colors.textSecondary, fontSize: fonts.caption, fontWeight: "600", marginBottom: 10 }}>
            Atualizando preços…
          </Text>
        ) : null}

        <View
          style={{
            flexDirection: "row",
            borderRadius: control.radiusCard,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 4,
            marginBottom: 14,
          }}
        >
          {(["MONTH", "YEAR"] as const).map((value) => {
            const active = interval === value;
            return (
              <Pressable
                key={value}
                onPress={() => setInterval(value)}
                style={{
                  flex: 1,
                  minHeight: control.height,
                  borderRadius: 8,
                  paddingHorizontal: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  backgroundColor: active ? colors.primary : "transparent",
                }}
              >
                <Text style={{ color: active ? "#fff" : colors.textSecondary, fontSize: fonts.body, fontWeight: "700" }}>
                  {value === "MONTH" ? "Mensal" : "Anual"}
                </Text>
                {value === "YEAR" ? (
                  <View style={{ borderRadius: 999, backgroundColor: "#FDBA74", paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ color: "#7C2D12", fontSize: fonts.tiny, fontWeight: "700" }}>Até 20% OFF</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {plans.map((plan) => {
          const active = selected === plan.code;
          const amount = priceFor(plan, interval);
          const visual = planVisual(plan.icon);
          return (
            <Pressable
              key={plan.code}
              onPress={() => setSelected(plan.code)}
              style={{
                borderRadius: control.radiusSheet,
                borderWidth: active ? 2 : 1,
                borderColor: active ? colors.primary : colors.border,
                backgroundColor: active ? "#F7F4FF" : colors.surface,
                padding: 14,
                marginBottom: 10,
              }}
            >
              <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: control.radiusCard,
                    backgroundColor: visual.bg,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name={visual.name} size={18} color={visual.fg} />
                </View>

                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                    <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <Text style={{ color: colors.text, fontSize: fonts.title, fontWeight: "700" }}>{plan.name}</Text>
                      {plan.badge ? (
                        <View style={{ borderRadius: 999, backgroundColor: "#FFEDD5", paddingHorizontal: 8, paddingVertical: 2 }}>
                          <Text style={{ color: "#C2410C", fontSize: fonts.tiny, fontWeight: "700" }}>{plan.badge}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={{ color: colors.text, fontSize: fonts.title, fontWeight: "700" }}>
                      {formatBrl(amount)}
                      <Text style={{ color: colors.textSecondary, fontSize: fonts.caption, fontWeight: "600" }}>
                        /{interval === "YEAR" ? "ano" : "mês"}
                      </Text>
                    </Text>
                  </View>

                  {plan.features.map((feature) => (
                    <View key={feature} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
                      <Ionicons name="checkmark" size={12} color={colors.primary} />
                      <Text style={{ color: colors.textSecondary, fontSize: fonts.body2, fontWeight: "500", flex: 1 }}>{feature}</Text>
                    </View>
                  ))}
                </View>

                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 999,
                    borderWidth: 2,
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? colors.primary : "transparent",
                    marginTop: 2,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {active ? <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: "#fff" }} /> : null}
                </View>
              </View>
            </Pressable>
          );
        })}

        {error ? <HelperText error>{error}</HelperText> : null}
        {message ? <HelperText>{message}</HelperText> : null}
        <PrimaryButton label={busy ? "Abrindo checkout…" : "Assinar agora"} busy={busy} onPress={() => void subscribe()} />
      </ScrollView>
    </View>
  );
}
