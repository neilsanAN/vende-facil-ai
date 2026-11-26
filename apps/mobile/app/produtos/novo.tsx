import { useState } from "react";
import { Switch, Text, View } from "react-native";
import { router } from "expo-router";
import { parseBrlToCents } from "@vendefacil/validation";
import { colors, fonts } from "@vendefacil/ui-tokens";
import { ApiClientError } from "@vendefacil/api-client";
import { api } from "../../src/api";
import { uploadLocalImage } from "../../src/upload";
import { BackButton } from "../../src/back-button";
import { handleTenantError } from "../../src/session";
import { useFeedback } from "../../src/feedback";
import { KeyboardScreen } from "../../src/keyboard-screen";
import { LocalPhoto, MAX_PRODUCT_PHOTOS, PhotoGallery } from "../../src/photo-gallery";
import { Field, HelperText, PrimaryButton, ScreenTitle } from "../../src/ui";

export default function NewProductScreen() {
  const feedback = useFeedback();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [promo, setPromo] = useState("");
  const [published, setPublished] = useState(false);
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [message, setMessage] = useState("");

  async function save() {
    const priceCents = parseBrlToCents(price);
    const promoCents = promo.trim() ? parseBrlToCents(promo) : null;
    if (name.trim().length < 2) {
      setMessage("Informe o nome do produto.");
      return;
    }
    if (priceCents == null) {
      setMessage("Informe um preço válido, ex.: 29,90.");
      return;
    }
    if (promo.trim() && promoCents == null) {
      setMessage("Preço promocional inválido.");
      return;
    }
    try {
      await feedback.run(photos.length ? `Salvando produto e ${photos.length} foto(s)…` : "Salvando produto…", async () => {
        const product = await api.createProduct({
          name: name.trim(),
          description: description.trim(),
          priceCents,
          promoPriceCents: promoCents,
          status: published ? "ACTIVE" : "DRAFT",
          published,
          variants: [],
        });
        for (const [index, photo] of photos.slice(0, MAX_PRODUCT_PHOTOS).entries()) {
          const asset = await uploadLocalImage(photo.uri, photo.mimeType, `${name.slice(0, 40)}-${index + 1}.jpg`);
          await api.addProductImage(product.id, asset.id);
        }
        return product;
      });
      feedback.showToast("Produto salvo.", "success");
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
      <ScreenTitle>Novo produto</ScreenTitle>

      <PhotoGallery
        photos={photos}
        onChange={setPhotos}
        emptyLabel="Adicione até 30 fotos do produto"
        onError={(text) => feedback.showToast(text, "error")}
      />

      <Field label="Nome" value={name} onChangeText={setName} placeholder="Ex.: Fone Bluetooth" />
      <Field label="Descrição" value={description} onChangeText={setDescription} multiline placeholder="Detalhes do produto" />
      <Field label="Preço" value={price} onChangeText={setPrice} placeholder="299,90" keyboardType="decimal-pad" />
      <Field label="Preço promocional" value={promo} onChangeText={setPromo} placeholder="opcional" keyboardType="decimal-pad" />

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
      <PrimaryButton label="Salvar produto" onPress={() => void save()} />
    </KeyboardScreen>
  );
}
