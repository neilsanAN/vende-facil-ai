import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Linking, Platform, Pressable, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Ionicons } from "@expo/vector-icons";
import { brand, colors, control, fonts } from "@vendefacil/ui-tokens";
import { WelcomeCarousel } from "../src/welcome-carousel";
import { ApiClientError, createApiClient } from "@vendefacil/api-client";

const apiBase = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
const api = createApiClient({ baseUrl: apiBase });

function openLegal(path: "/termos" | "/privacidade") {
  Linking.openURL(`${apiBase}${path}`).catch(() => undefined);
}

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
          const response = await fetch(`${apiBase}/api/auth/refresh`, {
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
          <Text style={{ marginTop: 8, color: "rgba(255,255,255,0.75)", fontSize: fonts.body, textAlign: "center", maxWidth: 280 }}>
            {brand.tagline}
          </Text>
        </View>
        <WelcomeCarousel />
        <View style={{ marginTop: "auto", gap: 12, paddingTop: 20 }}>
          <Pressable onPress={() => setScreen("register")} style={{ height: control.height, borderRadius: 999, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#fff", fontSize: fonts.body, fontWeight: "600" }}>Começar</Text>
          </Pressable>
          <Pressable onPress={() => setScreen("login")} style={{ height: control.height, borderRadius: 999, borderWidth: 1, borderColor: "rgba(255,255,255,0.35)", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#fff", fontSize: fonts.body, fontWeight: "600" }}>Já tenho conta</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (screen === "otp") {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: 24, justifyContent: "center" }}>
        <Pressable
          onPress={() => {
            setError("");
            setMessage("");
            setScreen("login");
          }}
          style={{ position: "absolute", left: 16, top: 48, flexDirection: "row", alignItems: "center", gap: 4 }}
        >
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
          <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "600" }}>Voltar</Text>
        </Pressable>
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
        {message ? <Text style={{ color: colors.primary, marginBottom: 8, textAlign: "center", fontSize: 12 }}>{message}</Text> : null}
        <Pressable
          disabled={busy || code.length !== 6}
          style={{ height: control.height, borderRadius: 999, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}
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
        <Pressable
          disabled={busy}
          style={{ marginTop: 12, alignItems: "center" }}
          onPress={async () => {
            setBusy(true);
            setError("");
            try {
              const response = await fetch(`${apiBase}/api/auth/resend`, {
                method: "POST",
                headers: { "content-type": "application/json", "x-vendefacil-client": "mobile" },
                body: JSON.stringify({ email }),
              });
              if (!response.ok) throw new Error("Falha");
              const payload = (await response.json()) as { devCode?: string | null };
              if (payload.devCode) setDevCode(payload.devCode);
              setMessage("Novo código enviado por e-mail.");
            } catch {
              setError("Não foi possível reenviar o código.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "600" }}>Reenviar código</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#2A1760", paddingHorizontal: 24, paddingTop: 48, paddingBottom: 28 }}>
      <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "#E9E4F8", opacity: 0 }} />
      <Pressable
        onPress={() => {
          setError("");
          setMessage("");
          setScreen("welcome");
        }}
        style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8 }}
      >
        <Ionicons name="chevron-back" size={22} color="#D4C8FF" />
        <Text style={{ color: "#D4C8FF", fontSize: 13, fontWeight: "600" }}>Início</Text>
      </Pressable>
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
          <Pressable
            style={{ alignSelf: "flex-end", marginTop: 12 }}
            onPress={async () => {
              if (!email.trim()) {
                setError("Informe o e-mail para recuperar a senha.");
                return;
              }
              setBusy(true);
              setError("");
              setMessage("");
              try {
                await fetch(`${apiBase}/api/auth/forgot`, {
                  method: "POST",
                  headers: { "content-type": "application/json", "x-vendefacil-client": "mobile" },
                  body: JSON.stringify({ email }),
                });
                setMessage("Se o e-mail existir, enviamos as instruções de recuperação.");
              } catch {
                setError("Não foi possível solicitar a recuperação agora.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <Text style={{ color: "#6D4AFF", fontSize: 12, fontWeight: "600" }}>Esqueci minha senha</Text>
          </Pressable>
        ) : (
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12, alignItems: "flex-start" }}>
            <Pressable onPress={() => setAcceptTerms((v) => !v)} hitSlop={8}>
              <View style={{ width: 18, height: 18, marginTop: 2, borderRadius: 4, borderWidth: 1, borderColor: "#fff", backgroundColor: acceptTerms ? colors.primary : "transparent" }} />
            </Pressable>
            <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, flex: 1 }}>
              Li e aceito os{" "}
              <Text onPress={() => openLegal("/termos")} style={{ color: "#D4C8FF", fontWeight: "700" }}>
                termos
              </Text>{" "}
              e a{" "}
              <Text onPress={() => openLegal("/privacidade")} style={{ color: "#D4C8FF", fontWeight: "700" }}>
                política de privacidade
              </Text>
              .
            </Text>
          </View>
        )}

        {error ? <Text style={{ color: "#FF6B7A", marginTop: 10, textAlign: "center" }}>{error}</Text> : null}
        {message ? <Text style={{ color: "#fff", marginTop: 10, textAlign: "center", fontSize: 12 }}>{message}</Text> : null}
        {devCode ? <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 6, textAlign: "center", fontSize: 11 }}>Local: {devCode}</Text> : null}

        <Pressable
          disabled={busy}
          style={{ marginTop: 20, height: control.height, borderRadius: 999, backgroundColor: "#6D4AFF", alignItems: "center", justifyContent: "center", opacity: busy ? 0.7 : 1 }}
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
          <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>
            {busy ? "Aguarde…" : screen === "register" ? "Criar conta" : "Entrar"}
          </Text>
        </Pressable>

        <View style={{ marginTop: 20, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.25)" }} />
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>ou</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.25)" }} />
        </View>

        <Pressable
          onPress={() => {
            setError("");
            setMessage("O acesso com Google entra quando o aplicativo estiver configurado.");
          }}
          style={{ marginTop: 14, height: control.height, borderRadius: 16, backgroundColor: "#fff", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          <Ionicons name="logo-google" size={16} color={colors.text} />
          <Text style={{ color: colors.text, fontSize: 13, fontWeight: "600" }}>Continuar com Google</Text>
        </Pressable>
        {Platform.OS === "ios" ? (
          <Pressable
            onPress={() => {
              setError("");
              setMessage("O acesso com Apple entra quando o aplicativo estiver configurado.");
            }}
            style={{ marginTop: 10, height: control.height, borderRadius: 16, backgroundColor: "#fff", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            <Ionicons name="logo-apple" size={16} color={colors.text} />
            <Text style={{ color: colors.text, fontSize: 13, fontWeight: "600" }}>Continuar com Apple</Text>
          </Pressable>
        ) : null}

        <Pressable
          style={{ marginTop: "auto", paddingTop: 24 }}
          onPress={() => {
            setError("");
            setMessage("");
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
