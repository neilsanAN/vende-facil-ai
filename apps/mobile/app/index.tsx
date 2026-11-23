import { useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { colors, control, fonts } from "@vendefacil/ui-tokens";
import { createApiClient } from "@vendefacil/api-client";

const api = createApiClient({ baseUrl: process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000" });

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const field = { height: control.height, borderWidth: 1, borderColor: colors.border, borderRadius: control.radiusInput, paddingHorizontal: 12, color: colors.text, fontSize: control.fontSize, marginBottom: 8, backgroundColor: "#0C1222" };
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: 16, justifyContent: "center" }}>
      <Text style={{ color: colors.text, fontSize: fonts.brand, fontWeight: "700", textAlign: "center" }}>VendeFácil AI</Text>
      <Text style={{ color: colors.textSecondary, marginTop: 4, marginBottom: 16, fontSize: fonts.body, textAlign: "center" }}>Acesse sua conta</Text>
      <TextInput autoCapitalize="none" keyboardType="email-address" placeholder="E-mail" placeholderTextColor={colors.textSecondary} value={email} onChangeText={setEmail} style={field} />
      <TextInput secureTextEntry placeholder="Senha" placeholderTextColor={colors.textSecondary} value={password} onChangeText={setPassword} style={field} />
      {error ? <Text style={{ color: colors.error, fontSize: fonts.caption, marginBottom: 8 }}>{error}</Text> : null}
      <Pressable style={{ backgroundColor: colors.primary, borderRadius: 999, height: control.height, alignItems: "center", justifyContent: "center" }} onPress={async () => {
        try {
          const session = await api.login({ email, password });
          await SecureStore.setItemAsync("vf_access", session.accessToken);
          await SecureStore.setItemAsync("vf_refresh", session.refreshToken);
          router.replace("/inicio");
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Falha no acesso.");
        }
      }}><Text style={{ color: "white", fontSize: fonts.body, fontWeight: "600" }}>Entrar</Text></Pressable>
      <Pressable style={{ marginTop: 10, height: control.height, borderRadius: 999, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }} onPress={() => setError("O acesso com Google entra quando o aplicativo estiver configurado.")}>
        <Text style={{ color: colors.text, fontSize: fonts.body, fontWeight: "600" }}>Continuar com Google</Text>
      </Pressable>
      {Platform.OS === "ios" ? (
        <Pressable style={{ marginTop: 8, height: control.height, borderRadius: 999, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }} onPress={() => setError("O acesso com Apple entra quando o aplicativo estiver configurado.")}>
          <Text style={{ color: colors.text, fontSize: fonts.body, fontWeight: "600" }}>Continuar com Apple</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
