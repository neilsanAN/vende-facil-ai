import { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "@vendefacil/ui-tokens";
import { ApiClientError } from "@vendefacil/api-client";
import { formatBrl } from "@vendefacil/types";
import { api } from "../src/api";
import {
  FALLBACK_PLANS,
  displayMonthlyCents,
  normalizePlans,
  type PlanCard,
} from "../src/billing-catalog";
import { goBack } from "../src/back-button";
import { useFeedback } from "../src/feedback";
import { HelperText } from "../src/ui";

type BillingInterval = "MONTH" | "YEAR";

function planVisual(icon?: string): { name: keyof typeof Ionicons.glyphMap; bg: string; fg: string } {
  if (icon === "rocket") return { name: "rocket-outline", bg: "#DBEAFE", fg: "#2563EB" };
  if (icon === "crown") return { name: "diamond-outline", bg: "#FEF3C7", fg: "#D97706" };
  if (icon === "building") return { name: "business-outline", bg: "#EDE9FE", fg: "#7C3AED" };
  return { name: "sparkles-outline", bg: colors.primarySoft, fg: colors.primary };
}

export default function PlansScreen() {
  const insets = useSafeAreaInsets();
  const feedback = useFeedback();
  const [plans, setPlans] = useState<PlanCard[]>(FALLBACK_PLANS);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("MONTH");
  const [selected, setSelected] = useState("pro");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let alive = true;
    void api
      .billing()
      .then((result) => {
        if (!alive) return;
        const next = normalizePlans(result.plans);
        setPlans(next);
        const current = result.subscription?.plan.code;
        if (current && current !== "free" && next.some((plan) => plan.code === current)) {
          setSelected(current);
        }
      })
      .catch(() => {
        // Mantém FALLBACK_PLANS — não redireciona nem fecha a tela.
      });
    return () => {
      alive = false;
    };
  }, []);

  async function subscribe() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api.checkout({ planCode: selected, interval: billingInterval });
      if (result.url) await Linking.openURL(result.url);
      else {
        setMessage("Plano ativado.");
        feedback.showToast("Plano atualizado.", "success");
        router.replace("/mais");
      }
    } catch (cause) {
      const text = cause instanceof ApiClientError ? cause.message : "Não foi possível abrir o checkout.";
      setError(text);
      feedback.showToast(text, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <View style={{ paddingTop: Math.max(insets.top, 8), backgroundColor: "#FFFFFF" }}>
        <View style={{ height: 48, justifyContent: "center", marginBottom: 4 }}>
          <Pressable
            onPress={() => goBack("/mais")}
            hitSlop={12}
            style={{ position: "absolute", left: 8, zIndex: 2, width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={{ textAlign: "center", color: colors.text, fontSize: fonts.hero, fontWeight: "700" }}>Planos e Assinatura</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ color: colors.textSecondary, fontSize: fonts.body, fontWeight: "500", textAlign: "center", marginBottom: 16 }}>
          Escolha o plano ideal para o seu negócio
        </Text>

        <View
          style={{
            flexDirection: "row",
            borderRadius: 12,
            backgroundColor: "#F3F4F6",
            padding: 4,
            marginBottom: 18,
          }}
        >
          <Pressable
            onPress={() => setBillingInterval("MONTH")}
            style={{
              flex: 1,
              minHeight: 44,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: billingInterval === "MONTH" ? colors.primary : "transparent",
            }}
          >
            <Text style={{ color: billingInterval === "MONTH" ? "#fff" : colors.textSecondary, fontSize: fonts.subtitle, fontWeight: "700" }}>
              Mensal
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setBillingInterval("YEAR")}
            style={{
              flex: 1,
              minHeight: 44,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: billingInterval === "YEAR" ? colors.primary : "transparent",
              paddingVertical: 6,
            }}
          >
            <Text style={{ color: billingInterval === "YEAR" ? "#fff" : colors.textSecondary, fontSize: fonts.subtitle, fontWeight: "700" }}>
              Anual
            </Text>
            <Text
              style={{
                color: billingInterval === "YEAR" ? "#FDE68A" : colors.text,
                fontSize: fonts.tiny,
                fontWeight: "800",
                marginTop: 1,
              }}
            >
              Até 20% OFF
            </Text>
          </Pressable>
        </View>

        {plans.map((plan) => {
          const active = selected === plan.code;
          const amount = displayMonthlyCents(plan, billingInterval);
          const visual = planVisual(plan.icon);
          return (
            <Pressable
              key={plan.code}
              onPress={() => setSelected(plan.code)}
              style={{
                borderRadius: 16,
                borderWidth: active ? 2 : 1,
                borderColor: active ? colors.primary : "#E5E7EB",
                backgroundColor: "#FFFFFF",
                padding: 14,
                paddingTop: plan.badge ? 18 : 14,
                marginBottom: 12,
              }}
            >
              {plan.badge ? (
                <View
                  style={{
                    alignSelf: "flex-end",
                    marginBottom: 8,
                    borderRadius: 999,
                    backgroundColor: "#FDBA74",
                    paddingHorizontal: 10,
                    paddingVertical: 3,
                  }}
                >
                  <Text style={{ color: "#7C2D12", fontSize: fonts.caption, fontWeight: "800" }}>{plan.badge}</Text>
                </View>
              ) : null}

              <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    backgroundColor: visual.bg,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name={visual.name} size={20} color={visual.fg} />
                </View>

                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                    <Text style={{ color: colors.text, fontSize: fonts.display, fontWeight: "700", flexShrink: 1 }}>{plan.name}</Text>
                    <Text style={{ color: colors.text, fontSize: fonts.display, fontWeight: "800" }}>
                      {formatBrl(amount)}
                      <Text style={{ color: colors.textSecondary, fontSize: fonts.body2, fontWeight: "600" }}>/mês</Text>
                    </Text>
                  </View>

                  {plan.features.map((feature) => (
                    <View key={feature} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
                      <Ionicons name="checkmark" size={14} color={colors.primary} />
                      <Text style={{ color: colors.textSecondary, fontSize: fonts.body, fontWeight: "500", flex: 1 }}>{feature}</Text>
                    </View>
                  ))}
                </View>

                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 999,
                    borderWidth: 2,
                    borderColor: active ? colors.primary : "#D1D5DB",
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
      </ScrollView>

      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: Math.max(insets.bottom, 16),
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#F3F4F6",
        }}
      >
        <Pressable
          disabled={busy}
          onPress={() => void subscribe()}
          style={{
            minHeight: 48,
            borderRadius: 14,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
            opacity: busy ? 0.7 : 1,
          }}
        >
          <Text style={{ color: "#fff", fontSize: fonts.subtitle, fontWeight: "700" }}>
            {busy ? "Abrindo checkout…" : "Assinar agora"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
