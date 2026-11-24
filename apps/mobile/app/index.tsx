import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, Pressable, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { colors, control, fonts } from "@vendefacil/ui-tokens";
import { ApiClientError, createApiClient } from "@vendefacil/api-client";

const api = createApiClient({ baseUrl: process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000" });

export default function LoginScreen() {
  const [booting, setBooting] = useState(true);
  const [mode, setMode] = useState<"login" | "register" | "otp">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [devCode, setDevCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const access = await SecureStore.getItemAsync("vf_access");
        const refresh = await SecureStore.getItemAsync("vf_refresh");
        if (!access && !refresh) return;
        if (access) {
          router.replace("/inicio");
          return;
        }
        if (refresh) {
          const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000"}/api/auth/refresh`, {
            method: "POST",
            headers: { "content-type": "application/json", "x-vendefacil-client": "mobile" },
            body: JSON.stringify({ refreshToken: refresh }),
          });
          if (response.ok) {
            const payload = (await response.json()) as { accessToken?: string; refreshToken?: string };
            if (payload.accessToken && payload.refreshToken) {
              await SecureStore.setItemAsync("vf_access", payload.accessToken);
              await SecureStore.setItemAsync("vf_refresh", payload.refreshToken);
              if (alive) router.replace("/inicio");
            }
          }
        }
      } finally {
        if (alive) setBooting(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const field = useMemo(
    () => ({
      height: control.height,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: control.radiusInput,
      paddingHorizontal: 12,
      color: colors.text,
      fontSize: control.fontSize,
      marginBottom: 8,
      backgroundColor: colors.surface,
    }),
    [],
  );

  async function persistSession(accessToken: string, refreshToken: string) {
    await SecureStore.setItemAsync("vf_access", accessToken);
    await SecureStore.setItemAsync("vf_refresh", refreshToken);
    router.replace("/inicio");
  }

  if (booting) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: 16, justifyContent: "center" }}>
      <Text style={{ color: colors.text, fontSize: fonts.brand, fontWeight: "700", textAlign: "center" }}>VendeFácil AI</Text>
      <Text style={{ color: colors.textSecondary, marginTop: 4, marginBottom: 16, fontSize: fonts.body, textAlign: "center" }}>
        {mode === "otp" ? "Confirme seu e-mail" : mode === "register" ? "Criar conta com e-mail" : "Acesse sua conta"}
      </Text>

      {mode === "otp" ? (
        <>
          <Text style={{ color: colors.textSecondary, fontSize: fonts.body, marginBottom: 12 }}>
            Enviamos um código de 6 dígitos para {email}. Confira a caixa de entrada e o spam.
          </Text>
          <TextInput
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            maxLength={6}
            placeholder="000000"
            placeholderTextColor={colors.textSecondary}
            value={code}
            onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
            style={[field, { letterSpacing: 6 }]}
          />
          {devCode ? <Text style={{ color: colors.textSecondary, fontSize: fonts.caption, marginBottom: 8 }}>Ambiente local: {devCode}</Text> : null}
          {message ? <Text style={{ color: colors.primary, fontSize: fonts.caption, marginBottom: 8 }}>{message}</Text> : null}
          {error ? <Text style={{ color: colors.error, fontSize: fonts.caption, marginBottom: 8 }}>{error}</Text> : null}
          <Pressable
            disabled={busy || code.length !== 6}
            style={{ backgroundColor: colors.primary, borderRadius: 999, height: control.height, alignItems: "center", justifyContent: "center", opacity: busy ? 0.7 : 1 }}
            onPress={async () => {
              setBusy(true);
              setError("");
              try {
                const session = await api.verifyEmail({ email, code });
                await persistSession(session.accessToken, session.refreshToken);
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : "Código inválido.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <Text style={{ color: "white", fontSize: fonts.body, fontWeight: "600" }}>Confirmar e-mail</Text>
          </Pressable>
          <Pressable
            disabled={busy}
            style={{ marginTop: 12, alignItems: "center" }}
            onPress={async () => {
              setBusy(true);
              setError("");
              try {
                const result = await api.resendVerification(email);
                setMessage(result.message);
                if (result.devCode) setDevCode(result.devCode);
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : "Não foi possível reenviar.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <Text style={{ color: colors.primary, fontSize: fonts.body, fontWeight: "600" }}>Reenviar código por e-mail</Text>
          </Pressable>
        </>
      ) : (
        <>
          {mode === "register" ? (
            <TextInput placeholder="Nome" placeholderTextColor={colors.textSecondary} value={name} onChangeText={setName} style={field} />
          ) : null}
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="E-mail"
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            style={field}
          />
          <TextInput secureTextEntry placeholder="Senha" placeholderTextColor={colors.textSecondary} value={password} onChangeText={setPassword} style={field} />
          {mode === "register" ? (
            <Pressable onPress={() => setAcceptTerms((value) => !value)} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <View style={{ width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: colors.border, backgroundColor: acceptTerms ? colors.primary : colors.surface }} />
              <Text style={{ color: colors.textSecondary, fontSize: fonts.caption, flex: 1 }}>Li e aceito os termos e a política de privacidade.</Text>
            </Pressable>
          ) : null}
          {error ? <Text style={{ color: colors.error, fontSize: fonts.caption, marginBottom: 8 }}>{error}</Text> : null}
          <Pressable
            disabled={busy}
            style={{ backgroundColor: colors.primary, borderRadius: 999, height: control.height, alignItems: "center", justifyContent: "center", opacity: busy ? 0.7 : 1 }}
            onPress={async () => {
              setBusy(true);
              setError("");
              setMessage("");
              try {
                if (mode === "register") {
                  if (!acceptTerms) {
                    setError("Aceite os termos e a política de privacidade.");
                    return;
                  }
                  const result = await api.register({ name, email, password, acceptTerms: true });
                  setEmail(result.email);
                  if (result.devCode) setDevCode(result.devCode);
                  setMode("otp");
                  setMessage(result.message);
                  return;
                }
                const session = await api.login({ email, password });
                await persistSession(session.accessToken, session.refreshToken);
              } catch (cause) {
                if (cause instanceof ApiClientError && cause.code === "EMAIL_UNVERIFIED") {
                  const details = cause.details as { email?: string; devCode?: string | null } | undefined;
                  setEmail(details?.email || email);
                  if (details?.devCode) setDevCode(details.devCode);
                  setMode("otp");
                  setMessage(cause.message);
                  return;
                }
                setError(cause instanceof Error ? cause.message : "Falha no acesso.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <Text style={{ color: "white", fontSize: fonts.body, fontWeight: "600" }}>{mode === "register" ? "Criar conta" : "Entrar"}</Text>
          </Pressable>
          <Pressable
            style={{ marginTop: 10, height: control.height, borderRadius: 999, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}
            onPress={() => setError("O acesso com Google entra quando o aplicativo estiver configurado.")}
          >
            <Text style={{ color: colors.text, fontSize: fonts.body, fontWeight: "600" }}>Continuar com Google</Text>
          </Pressable>
          {Platform.OS === "ios" ? (
            <Pressable
              style={{ marginTop: 8, height: control.height, borderRadius: 999, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}
              onPress={() => setError("O acesso com Apple entra quando o aplicativo estiver configurado.")}
            >
              <Text style={{ color: colors.text, fontSize: fonts.body, fontWeight: "600" }}>Continuar com Apple</Text>
            </Pressable>
          ) : null}
          <Pressable
            style={{ marginTop: 16, alignItems: "center" }}
            onPress={() => {
              setError("");
              setMessage("");
              setMode(mode === "register" ? "login" : "register");
            }}
          >
            <Text style={{ color: colors.primary, fontSize: fonts.body, fontWeight: "600" }}>
              {mode === "register" ? "Já tenho conta — entrar" : "Criar conta com e-mail"}
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
