import { useEffect, useMemo, useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";
import { brand, colors, control, fonts } from "@vendefacil/ui-tokens";
import { WelcomeCarousel } from "../src/welcome-carousel";
import { ApiClientError, createApiClient } from "@vendefacil/api-client";
import { BootScreen } from "../src/boot-screen";
import { getItem, setItem } from "../src/storage";
import { routeAfterAuth } from "../src/session";

const apiBase =
  Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
const api = createApiClient({ baseUrl: apiBase });

function openLegal(path: "/termos" | "/privacidade") {
  Linking.openURL(`${apiBase}${path}`).catch(() => undefined);
}

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function passwordReady(value: string) {
  return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

function AuthField({
  label,
  required,
  icon,
  error,
  trailing,
  children,
}: {
  label: string;
  required?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  error?: string;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 11, fontWeight: "600", marginBottom: 6 }}>
        {label}
        {required ? <Text style={{ color: "#FFB4BE" }}> *</Text> : null}
      </Text>
      <View
        style={{
          height: 40,
          borderRadius: 10,
          backgroundColor: "#fff",
          paddingHorizontal: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          borderWidth: error ? 2 : 0,
          borderColor: error ? "#FF6B7A" : "transparent",
        }}
      >
        <Ionicons name={icon} size={16} color="#9A96AB" />
        <View style={{ flex: 1 }}>{children}</View>
        {trailing}
      </View>
      {error ? <Text style={{ color: "#FFE0E4", fontSize: 11, fontWeight: "500", marginTop: 6 }}>{error}</Text> : null}
    </View>
  );
}

export default function AuthGate() {
  const [booting, setBooting] = useState(true);
  const [screen, setScreen] = useState<"welcome" | "login" | "register" | "forgot" | "otp">("welcome");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [visible, setVisible] = useState(false);
  const [touched, setTouched] = useState({ name: false, email: false, password: false, terms: false });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [devCode, setDevCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [bootMessage, setBootMessage] = useState("Preparando o app…");
  const [bootDetail, setBootDetail] = useState("Isso leva só alguns segundos");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setBootMessage("Verificando sessão…");
        setBootDetail("Confirmando se você já está conectado");
        const savedEmail = await getItem("vf_last_email");
        if (alive && savedEmail) setEmail(savedEmail);
        const access = await getItem("vf_access");
        const refresh = await getItem("vf_refresh");
        if (access) {
          if (alive) {
            setBootMessage("Entrando…");
            setBootDetail("Abrindo seu painel");
            await routeAfterAuth();
          }
          return;
        }
        if (refresh) {
          if (alive) {
            setBootMessage("Renovando acesso…");
            setBootDetail("Atualizando sua sessão com segurança");
          }
          const response = await fetch(`${apiBase}/api/auth/refresh`, {
            method: "POST",
            headers: { "content-type": "application/json", "x-vendefacil-client": "mobile" },
            body: JSON.stringify({ refreshToken: refresh }),
          });
          if (response.ok) {
            const payload = (await response.json()) as { accessToken?: string; refreshToken?: string };
            if (payload.accessToken && payload.refreshToken) {
              await setItem("vf_access", payload.accessToken);
              await setItem("vf_refresh", payload.refreshToken);
              if (alive) {
                setBootMessage("Entrando…");
                setBootDetail("Abrindo seu painel");
                await routeAfterAuth();
              }
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

  const nameError = useMemo(() => {
    if (!touched.name) return "";
    if (!name.trim()) return "Informe seu nome.";
    if (name.trim().length < 2) return "O nome precisa ter pelo menos 2 caracteres.";
    return "";
  }, [name, touched.name]);

  const emailError = useMemo(() => {
    if (!touched.email) return "";
    if (!email.trim()) return "Informe seu e-mail.";
    if (!looksLikeEmail(email)) return "Informe um e-mail válido.";
    return "";
  }, [email, touched.email]);

  const passwordError = useMemo(() => {
    if (!touched.password) return "";
    if (!password) return screen === "register" ? "Crie uma senha." : "Informe sua senha.";
    if (screen === "register" && !passwordReady(password)) return "Use ao menos 8 caracteres, com letras e números.";
    return "";
  }, [password, screen, touched.password]);

  const canSubmitLogin = looksLikeEmail(email) && password.length > 0;
  const canSubmitRegister = name.trim().length >= 2 && looksLikeEmail(email) && passwordReady(password) && acceptTerms;
  const canSubmitForgot = looksLikeEmail(email);
  const canSubmit = screen === "register" ? canSubmitRegister : screen === "forgot" ? canSubmitForgot : canSubmitLogin;

  async function rememberEmail(value: string) {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return;
    await setItem("vf_last_email", normalized);
  }

  async function persistSession(accessToken: string, refreshToken: string, loginEmail?: string) {
    if (loginEmail) await rememberEmail(loginEmail);
    await setItem("vf_access", accessToken);
    await setItem("vf_refresh", refreshToken);
    await routeAfterAuth();
  }

  async function goLogin() {
    const saved = (await getItem("vf_last_email")) || email;
    if (saved) setEmail(saved);
    setPassword("");
    setError("");
    setMessage("");
    setTouched({ name: false, email: false, password: false, terms: false });
    setScreen("login");
  }

  function goRegister() {
    setError("");
    setMessage("");
    setTouched({ name: false, email: false, password: false, terms: false });
    setScreen("register");
  }

  function goForgot() {
    setError("");
    setMessage("");
    setTouched({ name: false, email: true, password: false, terms: false });
    setScreen("forgot");
  }

  if (booting) {
    return <BootScreen message={bootMessage} detail={bootDetail} />;
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
          <Pressable onPress={() => void goLogin()} style={{ height: control.height, borderRadius: 999, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#fff", fontSize: fonts.body, fontWeight: "600" }}>Já tenho conta</Text>
          </Pressable>
          <Pressable onPress={goRegister} style={{ height: control.height, borderRadius: 999, borderWidth: 1, borderColor: "rgba(255,255,255,0.35)", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#fff", fontSize: fonts.body, fontWeight: "600" }}>Começar</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (screen === "otp") {
    return (
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: "center" }} keyboardShouldPersistTaps="handled">
          <Pressable
            onPress={() => void goLogin()}
            style={{ position: "absolute", left: 0, top: 24, flexDirection: "row", alignItems: "center", gap: 4 }}
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
                await persistSession(session.accessToken, session.refreshToken, email);
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
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  const title = screen === "register" ? "Criar conta" : screen === "forgot" ? "Recuperar senha" : "Acesse sua conta";
  const submitLabel = busy ? "Aguarde…" : screen === "register" ? "Criar conta" : screen === "forgot" ? "Enviar" : "Entrar";

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#2A1760" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 48, paddingBottom: 28 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Pressable
          onPress={() => {
            setError("");
            setMessage("");
            if (screen === "forgot") {
              void goLogin();
              return;
            }
            setScreen("welcome");
          }}
          style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color="#D4C8FF" />
          <Text style={{ color: "#D4C8FF", fontSize: 13, fontWeight: "600" }}>{screen === "forgot" ? "Voltar" : "Início"}</Text>
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
          <Text style={{ marginTop: 28, color: "#fff", fontSize: 24, fontWeight: "700", textAlign: "center" }}>{title}</Text>
          {screen === "forgot" ? (
            <Text style={{ marginTop: 10, color: "rgba(255,255,255,0.8)", fontSize: 12, textAlign: "center", lineHeight: 16 }}>
              Se o e-mail existir, enviaremos as instruções. A resposta não revela se a conta existe.
            </Text>
          ) : null}

          <View style={{ marginTop: 24 }}>
            {screen === "register" ? (
              <AuthField label="Nome" required icon="person-outline" error={nameError}>
                <TextInput
                  placeholder="Seu nome"
                  placeholderTextColor="#9A96AB"
                  value={name}
                  onChangeText={setName}
                  onBlur={() => setTouched((current) => ({ ...current, name: true }))}
                  style={{ color: colors.text, fontSize: 13, fontWeight: "500", padding: 0 }}
                />
              </AuthField>
            ) : null}

            <AuthField label="E-mail" required icon="mail-outline" error={emailError}>
              <TextInput
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="seu@email.com"
                placeholderTextColor="#9A96AB"
                value={email}
                onChangeText={setEmail}
                onBlur={() => setTouched((current) => ({ ...current, email: true }))}
                style={{ color: colors.text, fontSize: 13, fontWeight: "500", padding: 0 }}
              />
            </AuthField>

            {screen !== "forgot" ? (
              <AuthField
                label="Senha"
                required
                icon="lock-closed-outline"
                error={passwordError}
                trailing={
                  <Pressable onPress={() => setVisible((v) => !v)} hitSlop={8}>
                    <Ionicons name={visible ? "eye-off-outline" : "eye-outline"} size={16} color="#9A96AB" />
                  </Pressable>
                }
              >
                <TextInput
                  secureTextEntry={!visible}
                  placeholder={screen === "register" ? "Crie uma senha" : "Sua senha"}
                  placeholderTextColor="#9A96AB"
                  value={password}
                  onChangeText={setPassword}
                  onBlur={() => setTouched((current) => ({ ...current, password: true }))}
                  style={{ color: colors.text, fontSize: 13, fontWeight: "500", padding: 0 }}
                />
              </AuthField>
            ) : null}
          </View>

          {screen === "login" ? (
            <Pressable style={{ alignSelf: "flex-end", marginTop: 2 }} onPress={goForgot}>
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600", textDecorationLine: "underline" }}>Esqueci minha senha</Text>
            </Pressable>
          ) : null}

          {screen === "register" ? (
            <View style={{ marginTop: 4 }}>
              <Pressable
                onPress={() => {
                  setAcceptTerms((v) => !v);
                  setTouched((current) => ({ ...current, terms: true }));
                }}
                style={{
                  flexDirection: "row",
                  gap: 8,
                  alignItems: "flex-start",
                  backgroundColor: "#fff",
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                }}
              >
                <View
                  style={{
                    width: 18,
                    height: 18,
                    marginTop: 1,
                    borderRadius: 4,
                    borderWidth: 1,
                    borderColor: colors.primary,
                    backgroundColor: acceptTerms ? colors.primary : "transparent",
                  }}
                />
                <Text style={{ color: "#3A3650", fontSize: 12, flex: 1, lineHeight: 16 }}>
                  <Text style={{ color: "#E11D48" }}>* </Text>
                  Li e aceito os{" "}
                  <Text onPress={() => openLegal("/termos")} style={{ color: "#6D4AFF", fontWeight: "700" }}>
                    termos
                  </Text>{" "}
                  e a{" "}
                  <Text onPress={() => openLegal("/privacidade")} style={{ color: "#6D4AFF", fontWeight: "700" }}>
                    política de privacidade
                  </Text>
                  .
                </Text>
              </Pressable>
              {touched.terms && !acceptTerms ? (
                <Text style={{ color: "#FFE0E4", fontSize: 11, fontWeight: "500", marginTop: 6 }}>Aceite os termos e a política de privacidade.</Text>
              ) : null}
            </View>
          ) : null}

          {error ? <Text style={{ color: "#FFE0E4", marginTop: 10, textAlign: "center", fontSize: 12, fontWeight: "500" }}>{error}</Text> : null}
          {message ? <Text style={{ color: "#fff", marginTop: 10, textAlign: "center", fontSize: 12 }}>{message}</Text> : null}
          {devCode ? <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 6, textAlign: "center", fontSize: 11 }}>Local: {devCode}</Text> : null}

          <Pressable
            disabled={busy || !canSubmit}
            style={{
              marginTop: 16,
              height: control.height,
              borderRadius: 999,
              backgroundColor: canSubmit && !busy ? "#6D4AFF" : "#D9D0F5",
              alignItems: "center",
              justifyContent: "center",
            }}
            onPress={async () => {
              setTouched({
                name: true,
                email: true,
                password: screen !== "forgot",
                terms: screen === "register",
              });
              if (!canSubmit) return;
              setBusy(true);
              setError("");
              setMessage("");
              try {
                if (screen === "forgot") {
                  await fetch(`${apiBase}/api/auth/forgot`, {
                    method: "POST",
                    headers: { "content-type": "application/json", "x-vendefacil-client": "mobile" },
                    body: JSON.stringify({ email }),
                  });
                  setMessage("Se o e-mail existir, enviamos as instruções de recuperação.");
                  return;
                }
                if (screen === "register") {
                  const result = await api.register({ name, email, password, acceptTerms: true });
                  setEmail(result.email);
                  await rememberEmail(result.email);
                  if (result.devCode) setDevCode(result.devCode);
                  setScreen("otp");
                  setMessage(result.message);
                  return;
                }
                const session = await api.login({ email, password });
                await persistSession(session.accessToken, session.refreshToken, email);
              } catch (cause) {
                if (cause instanceof ApiClientError && cause.code === "EMAIL_UNVERIFIED") {
                  const details = cause.details as { email?: string; devCode?: string | null } | undefined;
                  const nextEmail = details?.email || email;
                  setEmail(nextEmail);
                  await rememberEmail(nextEmail);
                  if (details?.devCode) setDevCode(details.devCode);
                  setScreen("otp");
                  setMessage(cause.message);
                  return;
                }
                setError(cause instanceof ApiClientError ? cause.message : cause instanceof Error ? cause.message : "Falha no acesso.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <Text style={{ color: canSubmit && !busy ? "#fff" : "#6E6890", fontSize: 14, fontWeight: "600" }}>{submitLabel}</Text>
          </Pressable>

          {screen !== "forgot" ? (
            <>
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
                  if (screen === "register") void goLogin();
                  else goRegister();
                }}
              >
                <Text style={{ textAlign: "center", color: "rgba(255,255,255,0.85)", fontSize: 13 }}>
                  {screen === "register" ? "Já tem conta? " : "Não tem uma conta? "}
                  <Text style={{ color: "#D4C8FF", fontWeight: "700" }}>{screen === "register" ? "Entrar" : "Cadastre-se"}</Text>
                </Text>
              </Pressable>
            </>
          ) : (
            <Pressable style={{ marginTop: "auto", paddingTop: 24 }} onPress={() => void goLogin()}>
              <Text style={{ textAlign: "center", color: "#D4C8FF", fontSize: 13, fontWeight: "700" }}>Voltar para entrar</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
