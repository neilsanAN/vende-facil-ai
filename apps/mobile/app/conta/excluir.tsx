import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { colors, control, fonts } from "@vendefacil/ui-tokens";
import { ApiClientError } from "@vendefacil/api-client";
import { api } from "../../src/api";
import { BackButton } from "../../src/back-button";
import { ConfirmSheet } from "../../src/feedback";
import { KeyboardScreen } from "../../src/keyboard-screen";
import { deleteItem, getItem } from "../../src/storage";
import { Card, Field, HelperText, ScreenTitle } from "../../src/ui";

export default function DeleteAccountScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void getItem("vf_last_email").then((saved) => {
      if (saved) setEmail(saved);
    });
  }, []);

  async function remove() {
    setBusy(true);
    setError("");
    try {
      await api.deleteAccount({ email: email.trim().toLowerCase(), password });
      await deleteItem("vf_access");
      await deleteItem("vf_refresh");
      await deleteItem("vf_last_email");
      router.replace("/");
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : "Não foi possível excluir a conta. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardScreen>
      <BackButton fallback="/mais" />
      <ScreenTitle>Excluir conta</ScreenTitle>

      <Card style={{ gap: 6, marginBottom: 14, borderColor: "#FECACA", backgroundColor: "#FEF2F2" }}>
        <Text style={{ color: colors.error, fontSize: fonts.subtitle, fontWeight: "700" }}>Essa ação não pode ser desfeita</Text>
        <Text style={{ color: colors.text, fontSize: fonts.body, lineHeight: 20 }}>
          Sua conta é anonimizada, a loja sai do ar, as fotos são apagadas e as conexões com Facebook e Instagram são removidas.
        </Text>
      </Card>

      <View style={{ gap: 10, marginBottom: 14 }}>
        <Field label="E-mail da conta" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <Field label="Senha" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" placeholder="••••••••" />
      </View>

      {error ? <HelperText error>{error}</HelperText> : null}

      <Pressable
        disabled={busy || !email.trim() || !password}
        onPress={() => setConfirm(true)}
        style={{
          height: control.buttonHeight,
          borderRadius: control.radiusButton,
          backgroundColor: colors.error,
          alignItems: "center",
          justifyContent: "center",
          opacity: busy || !email.trim() || !password ? 0.5 : 1,
        }}
      >
        <Text style={{ color: "#fff", fontSize: fonts.subtitle, fontWeight: "700" }}>{busy ? "Excluindo…" : "Excluir minha conta"}</Text>
      </Pressable>

      <ConfirmSheet
        open={confirm}
        title="Excluir conta de vez?"
        message="Todos os dados da loja serão apagados e você não poderá recuperar."
        confirmLabel="Excluir"
        destructive
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          void remove();
        }}
      />
    </KeyboardScreen>
  );
}
