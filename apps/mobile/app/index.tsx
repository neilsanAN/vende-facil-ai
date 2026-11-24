import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, Pressable, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Ionicons } from "@expo/vector-icons";
import { colors, control, fonts } from "@vendefacil/ui-tokens";
import { ApiClientError, createApiClient } from "@vendefacil/api-client";

const api = createApiClient({ baseUrl: process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000" });

const features = [
  { icon: "camera-outline" as const, title: "Tire foto do produto" },
  { icon: "sparkles-outline" as const, title: "IA cria o anúncio" },
  { icon: "play-outline" as const, title: "Gere vídeos com voz" },
  { icon: "share-social-outline" as const, title: "Publique nas redes" },
];

export default function AuthGate() {
  const [booting, setBooting] = useState(true);
  const [screen, setScreen] = useState<"welcome" | "login" | "register" | "otp">("welcome");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [visible, setVisible] = useState(false);
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

  const fieldRow = useMemo(
    () => ({
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: "#fff",
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
      <View style={{ flex: 1, backgroundColor: "#070617", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (screen === "welcome") {
    return (
      <View style={{ flex: 1, backgroundColor: "#070617", paddingHorizontal: 24, paddingTop: 56, paddingBottom: 28 }}>
        <View style={{ alignItems: "center" }}>
          <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="bag-handle" size={30} color="#fff" />
          </View>
          <Text style={{ marginTop: 18, color: "#fff", fontSize: 28, fontWeight: "700" }}>
            VendeFácil <Text style={{ color: "#C4B5FD" }}>AI</Text>
          </Text>
          <Text style={{ marginTop: 8, color: "rgba(255,255,255,0.75)", fontSize: fonts.body, textAlign: "center", maxWidth: 250 }}>
            Crie, divulgue e venda seus produtos com IA
          </Text>
        </View>
        <View style={{ marginTop: 36, gap: 14 }}>
          {features.map((item) => (
            <View key={item.title} style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={item.icon} size={20} color="#fff" />
              </View>
              <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>{item.title}</Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, marginTop: 28 }}>
          <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: "#fff" }} />
          <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.3)" }} />
          <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.3)" }} />
        </View>
        <View style={{ marginTop: "auto", gap: 12 }}>
          <Pressable onPress={() => setScreen("register")} style={{ height: 48, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>Começar</Text>
          </Pressable>
          <Pressable onPress={() => setScreen("login")} style={{ height: 48, borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.35)", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>Já tenho conta</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (screen === "otp") {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: 24, justifyContent: "center" }}>
        <Text style={{ color: colors.text, fontSize: fonts.heading, fontWeight: "700", textAlign: "center" }}>Confirme seu e-mail</Text>
        <Text style={{ color: colors.textSecondary, fontSize: fonts.body, marginTop: 8, marginBottom: 16, textAlign: "center" }}>Código enviado para {email}</Text>
        <TextInput
          keyboardType="number-pad"
          maxLength={6}
          value={code}
          onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          placeholderTextColor={colors.textSecondary}
          style={{ height: control.height, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface, color: colors.text, textAlign: "center", letterSpacing: 8, fontSize: 18, marginBottom: 12 }}
        />
        {error ? <Text style={{ color: colors.error, marginBottom: 8 }}>{error}</Text> : null}
        <Pressable
          disabled={busy || code.length !== 6}
          style={{ height: 48, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}
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
          <Text style={{ color: "#fff", fontWeight: "600" }}>Confirmar e-mail</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#2A1760", paddingHorizontal: 24, paddingTop: 48, paddingBottom: 28 }}>
      <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "#E9E4F8", opacity: 0 }} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="bag-handle" size={22} color="#fff" />
          </View>
          <Text style={{ color: "#fff", fontSize: 22, fontWeight: "700" }}>
            VendeFácil <Text style={{ color: "#D4C8FF" }}>AI</Text>
          </Text>
        </View>
        <Text style={{ marginTop: 28, color: "#fff", fontSize: 24, fontWeight: "700", textAlign: "center" }}>
          {screen === "register" ? "Criar conta" : "Acesse sua conta"}
        </Text>

        <View style={{ marginTop: 24, borderRadius: 16, overflow: "hidden", backgroundColor: "#fff" }}>
          {screen === "register" ? (
            <>
              <View style={fieldRow}>
                <Ionicons name="person-outline" size={18} color="#9A96AB" />
                <TextInput placeholder="Nome" placeholderTextColor="#9A96AB" value={name} onChangeText={setName} style={{ flex: 1, color: colors.text, fontSize: 13 }} />
              </View>
              <View style={{ height: 1, backgroundColor: "#ECEAF3", marginHorizontal: 16 }} />
            </>
          ) : null}
          <View style={fieldRow}>
            <Ionicons name="mail-outline" size={18} color="#9A96AB" />
            <TextInput autoCapitalize="none" keyboardType="email-address" placeholder="seu@email.com" placeholderTextColor="#9A96AB" value={email} onChangeText={setEmail} style={{ flex: 1, color: colors.text, fontSize: 13 }} />
          </View>
          <View style={{ height: 1, backgroundColor: "#ECEAF3", marginHorizontal: 16 }} />
          <View style={fieldRow}>
            <Ionicons name="lock-closed-outline" size={18} color="#9A96AB" />
            <TextInput secureTextEntry={!visible} placeholder="••••••••" placeholderTextColor="#9A96AB" value={password} onChangeText={setPassword} style={{ flex: 1, color: colors.text, fontSize: 13 }} />
            <Pressable onPress={() => setVisible((v) => !v)}>
              <Ionicons name={visible ? "eye-off-outline" : "eye-outline"} size={18} color="#9A96AB" />
            </Pressable>
          </View>
        </View>

        {screen === "login" ? (
          <Pressable style={{ alignSelf: "flex-end", marginTop: 12 }}>
            <Text style={{ color: "#6D4AFF", fontSize: 12, fontWeight: "600" }}>Esqueci minha senha</Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => setAcceptTerms((v) => !v)} style={{ flexDirection: "row", gap: 8, marginTop: 12, alignItems: "center" }}>
            <View style={{ width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: "#fff", backgroundColor: acceptTerms ? colors.primary : "transparent" }} />
            <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, flex: 1 }}>Li e aceito os termos e a política de privacidade.</Text>
          </Pressable>
        )}

        {error ? <Text style={{ color: "#FF6B7A", marginTop: 10, textAlign: "center" }}>{error}</Text> : null}
        {message ? <Text style={{ color: "#fff", marginTop: 10, textAlign: "center", fontSize: 12 }}>{message}</Text> : null}
        {devCode ? <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 6, textAlign: "center", fontSize: 11 }}>Local: {devCode}</Text> : null}

        <Pressable
          disabled={busy}
          style={{ marginTop: 20, height: 48, borderRadius: 16, backgroundColor: "#6D4AFF", alignItems: "center", justifyContent: "center", opacity: busy ? 0.7 : 1 }}
          onPress={async () => {
            setBusy(true);
            setError("");
            setMessage("");
            try {
              if (screen === "register") {
                if (!acceptTerms) {
                  setError("Aceite os termos e a política de privacidade.");
                  return;
                }
                const result = await api.register({ name, email, password, acceptTerms: true });
                setEmail(result.email);
                if (result.devCode) setDevCode(result.devCode);
                setScreen("otp");
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
                setScreen("otp");
                setMessage(cause.message);
                return;
              }
              setError(cause instanceof Error ? cause.message : "Falha no acesso.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>{screen === "register" ? "Criar conta" : "Entrar"}</Text>
        </Pressable>

        <View style={{ marginTop: 20, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.25)" }} />
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>ou</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.25)" }} />
        </View>

        <Pressable onPress={() => setError("O acesso com Google entra quando o aplicativo estiver configurado.")} style={{ marginTop: 14, height: 48, borderRadius: 16, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.text, fontSize: 13, fontWeight: "600" }}>Continuar com Google</Text>
        </Pressable>
        {(Platform.OS === "ios" || true) && (
          <Pressable onPress={() => setError("O acesso com Apple entra quando o aplicativo estiver configurado.")} style={{ marginTop: 10, height: 48, borderRadius: 16, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: colors.text, fontSize: 13, fontWeight: "600" }}>Continuar com Apple</Text>
          </Pressable>
        )}

        <Pressable
          style={{ marginTop: "auto", paddingTop: 24 }}
          onPress={() => {
            setError("");
            setScreen(screen === "register" ? "login" : "register");
          }}
        >
          <Text style={{ textAlign: "center", color: "rgba(255,255,255,0.85)", fontSize: 13 }}>
            {screen === "register" ? "Já tem conta? " : "Não tem uma conta? "}
            <Text style={{ color: "#D4C8FF", fontWeight: "700" }}>{screen === "register" ? "Entrar" : "Cadastre-se"}</Text>
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
