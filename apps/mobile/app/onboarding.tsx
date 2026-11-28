import { useMemo, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, control, fonts } from "@vendefacil/ui-tokens";
import { ApiClientError } from "@vendefacil/api-client";
import { api } from "../src/api";
import { AuthField } from "../src/auth-field";
import { useKeyboardBottomInset } from "../src/keyboard-screen";
import { formatWhatsAppMask, whatsappForApi, whatsappIsValidOptional } from "../src/phone";

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardBottomInset();
  const [storeName, setStoreName] = useState("");
  const [description, setDescription] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [touched, setTouched] = useState({ storeName: false, whatsapp: false });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const storeNameError = useMemo(() => {
    if (!touched.storeName) return "";
    if (!storeName.trim()) return "Informe o nome do canal.";
    if (storeName.trim().length < 2) return "O nome precisa ter pelo menos 2 caracteres.";
    return "";
  }, [storeName, touched.storeName]);

  const whatsappError = useMemo(() => {
    if (!touched.whatsapp) return "";
    if (!whatsappIsValidOptional(whatsapp)) return "Informe um WhatsApp válido com DDD, ex.: (11) 99999-9999.";
    return "";
  }, [touched.whatsapp, whatsapp]);

  const canSubmit = storeName.trim().length >= 2 && whatsappIsValidOptional(whatsapp);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#2A1760" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: Math.max(insets.top, 24),
          paddingHorizontal: 24,
          paddingBottom: Math.max(insets.bottom, 24) + keyboardInset + 16,
          flexGrow: 1,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 20 }}>
          <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="bag-handle" size={22} color="#fff" />
          </View>
          <Text style={{ color: "#fff", fontSize: 22, fontWeight: "700" }}>
            VendeFácil <Text style={{ color: "#D4C8FF" }}>AI</Text>
          </Text>
        </View>
        <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700", textAlign: "center" }}>Seu canal de divulgação</Text>
        <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, textAlign: "center", marginTop: 8, marginBottom: 20, lineHeight: 16 }}>
          Não é loja física. É o nome do seu perfil/canal para criar anúncios, postar nas redes e receber contatos.
        </Text>

        <AuthField label="Nome do canal / marca" required icon="storefront-outline" error={storeNameError}>
          <TextInput
            value={storeName}
            onChangeText={setStoreName}
            onBlur={() => setTouched((current) => ({ ...current, storeName: true }))}
            placeholder="Ex.: José Variedades"
            placeholderTextColor="#9A96AB"
            style={{ color: colors.text, fontSize: 13, fontWeight: "500", padding: 0 }}
          />
        </AuthField>

        <AuthField label="O que você divulga" icon="pricetags-outline" multiline>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Produtos, serviços ou nicho"
            placeholderTextColor="#9A96AB"
            multiline
            textAlignVertical="top"
            style={{ color: colors.text, fontSize: 13, fontWeight: "500", padding: 0, minHeight: 64 }}
          />
        </AuthField>

        <AuthField label="WhatsApp" icon="logo-whatsapp" error={whatsappError}>
          <TextInput
            value={whatsapp}
            onChangeText={(value) => setWhatsapp(formatWhatsAppMask(value))}
            onBlur={() => setTouched((current) => ({ ...current, whatsapp: true }))}
            placeholder="(11) 99999-9999"
            placeholderTextColor="#9A96AB"
            keyboardType="phone-pad"
            maxLength={15}
            style={{ color: colors.text, fontSize: 13, fontWeight: "500", padding: 0 }}
          />
        </AuthField>
        <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, marginTop: -6, marginBottom: 8, lineHeight: 15 }}>
          Opcional. Usado no botão de contato da vitrine. Digite DDD + número.
        </Text>

        {error ? <Text style={{ color: "#FFE0E4", marginTop: 4, textAlign: "center", fontSize: 12, fontWeight: "500" }}>{error}</Text> : null}

        <Pressable
          disabled={busy || !canSubmit}
          onPress={async () => {
            setTouched({ storeName: true, whatsapp: true });
            if (!canSubmit) return;
            setBusy(true);
            setError("");
            try {
              await api.onboard({
                storeName: storeName.trim(),
                description: description.trim(),
                whatsapp: whatsappForApi(whatsapp),
              });
              router.replace("/inicio");
            } catch (cause) {
              if (cause instanceof ApiClientError && cause.code === "CONFLICT") {
                router.replace("/inicio");
                return;
              }
              setError(cause instanceof ApiClientError ? cause.message : cause instanceof Error ? cause.message : "Não foi possível criar o canal.");
            } finally {
              setBusy(false);
            }
          }}
          style={{
            marginTop: 16,
            height: control.height,
            borderRadius: 999,
            backgroundColor: canSubmit && !busy ? "#6D4AFF" : "#D9D0F5",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {busy ? (
            <ActivityIndicator color="#6E6890" />
          ) : (
            <Text style={{ color: canSubmit ? "#fff" : "#6E6890", fontWeight: "600", fontSize: fonts.body }}>Continuar</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
