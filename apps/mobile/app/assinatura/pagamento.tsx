import { ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "@vendefacil/ui-tokens";
import { BackButton } from "../../src/back-button";
import { PrimaryButton, ScreenTitle, SecondaryButton } from "../../src/ui";

export default function PaymentScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ pagamento?: string }>();
  const status = typeof params.pagamento === "string" ? params.pagamento : undefined;

  let title = "Checkout seguro";
  let body = "PIX e cartão são processados pelo provedor. O MeuVende+ nunca armazena dados de cartão.";
  let tone: "ok" | "warn" | "err" | "neutral" = "neutral";
  if (status === "ok") {
    title = "Retorno do checkout recebido";
    body = "O plano só libera depois que o webhook do provedor confirmar o pagamento. Atualize Minha assinatura em instantes.";
    tone = "ok";
  } else if (status === "pendente") {
    title = "Pagamento pendente";
    body = "PIX e cartão podem levar alguns minutos. Não consideramos pago só por este retorno.";
    tone = "warn";
  } else if (status === "falha") {
    title = "Pagamento não concluído";
    body = "Tente de novo em Planos e preços.";
    tone = "err";
  }

  const bg = tone === "ok" ? "#ECFDF5" : tone === "warn" ? "#FFFBEB" : tone === "err" ? "#FEF2F2" : colors.surface;
  const fg = tone === "ok" ? "#166534" : tone === "warn" ? "#92400E" : tone === "err" ? colors.error : colors.text;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: Math.max(insets.top, 12) }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28 }}>
        <BackButton fallback="/assinatura" />
        <ScreenTitle style={{ marginBottom: 4 }}>Pagamento</ScreenTitle>
        <Text style={{ color: colors.textSecondary, fontSize: fonts.body, fontWeight: "500", marginBottom: 14 }}>PIX e cartão quando disponíveis.</Text>
        <View style={{ borderRadius: 16, backgroundColor: bg, borderWidth: 1, borderColor: colors.border, padding: 16 }}>
          <Text style={{ color: fg, fontSize: fonts.subtitle, fontWeight: "700" }}>{title}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: fonts.body, marginTop: 8, lineHeight: 18 }}>{body}</Text>
        </View>
        <View style={{ height: 14 }} />
        <PrimaryButton label="Ir para Minha assinatura" onPress={() => router.replace("/assinatura")} />
        <View style={{ height: 10 }} />
        <SecondaryButton label="Ver planos" onPress={() => router.push("/assinatura/planos")} />
      </ScrollView>
    </View>
  );
}
