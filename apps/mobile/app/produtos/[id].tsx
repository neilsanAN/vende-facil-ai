import { useEffect, useState } from "react";
import { ActivityIndicator, Switch, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { parseBrlToCents } from "@vendefacil/validation";
import { colors, fonts } from "@vendefacil/ui-tokens";
import { ApiClientError } from "@vendefacil/api-client";
import { api } from "../../src/api";
import { BackButton } from "../../src/back-button";
import { handleTenantError } from "../../src/session";
import { useFeedback } from "../../src/feedback";
import { KeyboardScreen } from "../../src/keyboard-screen";
import { Field, HelperText, PrimaryButton, ScreenTitle } from "../../src/ui";

function centsToInput(cents?: number | null) {
  if (cents == null) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

export default function EditProductScreen() {
  const feedback = useFeedback();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [promo, setPromo] = useState("");
  const [published, setPublished] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!id) return;
    api
      .getProduct(id)
      .then((product) => {
        setName(product.name);
        setDescription(product.description || "");
        setPrice(centsToInput(product.priceCents));
        setPromo(centsToInput(product.promoPriceCents));
        setPublished(Boolean(product.published));
      })
      .catch((cause) => {
        if (handleTenantError(cause)) return;
        setMessage(cause instanceof ApiClientError ? cause.message : "Falha ao carregar.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function save() {
    if (!id) return;
    const priceCents = parseBrlToCents(price);
    const promoCents = promo.trim() ? parseBrlToCents(promo) : null;
    if (name.trim().length < 2 || priceCents == null) {
      setMessage("Nome e preço válidos são obrigatórios.");
      return;
    }
    try {
      await feedback.run("Salvando alterações…", async () => {
        await api.updateProduct(id, {
          name: name.trim(),
          description: description.trim(),
          priceCents,
          promoPriceCents: promoCents,
          status: published ? "ACTIVE" : "DRAFT",
          published,
          variants: [],
        });
      });
      feedback.showToast("Produto atualizado.", "success");
      router.replace("/produtos");
    } catch (cause) {
      if (handleTenantError(cause)) return;
      const text = cause instanceof ApiClientError ? cause.message : "Não foi possível salvar.";
      setMessage(text);
      feedback.showToast(text, "error");
    }
  }

  return (
    <KeyboardScreen contentContainerStyle={{ gap: 12 }}>
      <BackButton fallback="/produtos" />
      <ScreenTitle>Editar produto</ScreenTitle>
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <>
          <Field label="Nome" value={name} onChangeText={setName} />
          <Field label="Descrição" value={description} onChangeText={setDescription} multiline />
          <Field label="Preço" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
          <Field label="Preço promocional" value={promo} onChangeText={setPromo} keyboardType="decimal-pad" />
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          >
            <Text style={{ color: colors.text, fontSize: fonts.body, fontWeight: "600" }}>Publicar na vitrine</Text>
            <Switch value={published} onValueChange={setPublished} trackColor={{ true: colors.primary, false: "#E0E3EA" }} />
          </View>
          {message ? <HelperText error>{message}</HelperText> : null}
          <PrimaryButton label="Salvar" onPress={() => void save()} />
        </>
      )}
    </KeyboardScreen>
  );
}
