import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, control, fonts } from "@vendefacil/ui-tokens";
import { ApiClientError } from "@vendefacil/api-client";
import { api } from "../src/api";

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [storeName, setStoreName] = useState("");
  const [description, setDescription] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: "#2A1760", paddingTop: Math.max(insets.top, 24), paddingHorizontal: 24, paddingBottom: Math.max(insets.bottom, 24) }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 20 }}>
        <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="bag-handle" size={22} color="#fff" />
        </View>
        <Text style={{ color: "#fff", fontSize: 22, fontWeight: "700" }}>
          VendeFácil <Text style={{ color: "#D4C8FF" }}>AI</Text>
        </Text>
      </View>
      <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700", textAlign: "center" }}>Configure sua loja</Text>
      <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, textAlign: "center", marginTop: 8, marginBottom: 20, lineHeight: 16 }}>
        Informe o nome da loja para liberar o painel, a vitrine e os anúncios com IA.
      </Text>

      <View style={{ borderRadius: 16, overflow: "hidden", backgroundColor: "#fff" }}>
        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 11, marginBottom: 4 }}>Nome da loja</Text>
          <TextInput
            value={storeName}
            onChangeText={setStoreName}
            placeholder="Ex.: José Variedades"
            placeholderTextColor="#9A96AB"
            style={{ color: colors.text, fontSize: 14, paddingVertical: 4 }}
          />
        </View>
        <View style={{ height: 1, backgroundColor: "#ECEAF3", marginHorizontal: 16 }} />
        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 11, marginBottom: 4 }}>Descrição</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="O que você vende"
            placeholderTextColor="#9A96AB"
            multiline
            style={{ color: colors.text, fontSize: 14, minHeight: 64, textAlignVertical: "top" }}
          />
        </View>
        <View style={{ height: 1, backgroundColor: "#ECEAF3", marginHorizontal: 16 }} />
        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 11, marginBottom: 4 }}>WhatsApp</Text>
          <TextInput
            value={whatsapp}
            onChangeText={setWhatsapp}
            placeholder="11999999999"
            placeholderTextColor="#9A96AB"
            keyboardType="phone-pad"
            style={{ color: colors.text, fontSize: 14, paddingVertical: 4 }}
          />
        </View>
      </View>

      {error ? <Text style={{ color: "#FF6B7A", marginTop: 12, textAlign: "center", fontSize: 12 }}>{error}</Text> : null}

      <Pressable
        disabled={busy || storeName.trim().length < 2}
        onPress={async () => {
          setBusy(true);
          setError("");
          try {
            await api.onboard({
              storeName: storeName.trim(),
              description: description.trim(),
              whatsapp: whatsapp.trim(),
            });
            router.replace("/inicio");
          } catch (cause) {
            if (cause instanceof ApiClientError && cause.code === "CONFLICT") {
              router.replace("/inicio");
              return;
            }
            setError(cause instanceof Error ? cause.message : "Não foi possível criar a loja.");
          } finally {
            setBusy(false);
          }
        }}
        style={{
          marginTop: 20,
          height: control.height,
          borderRadius: 999,
          backgroundColor: colors.primary,
          alignItems: "center",
          justifyContent: "center",
          opacity: busy || storeName.trim().length < 2 ? 0.7 : 1,
        }}
      >
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>Criar loja e continuar</Text>}
      </Pressable>
    </View>
  );
}
