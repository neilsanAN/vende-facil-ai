import { useState } from "react";
import { Image, Pressable, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { parseBrlToCents } from "@vendefacil/validation";
import { colors, fonts } from "@vendefacil/ui-tokens";
import { ApiClientError } from "@vendefacil/api-client";
import { api } from "../../src/api";
import { uploadLocalImage } from "../../src/upload";
import { BackButton } from "../../src/back-button";
import { handleTenantError } from "../../src/session";
import { useFeedback } from "../../src/feedback";
import { KeyboardScreen } from "../../src/keyboard-screen";
import { Field, HelperText, PrimaryButton, ScreenTitle } from "../../src/ui";

export default function NewProductScreen() {
  const feedback = useFeedback();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [promo, setPromo] = useState("");
  const [published, setPublished] = useState(false);
  const [uri, setUri] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState("image/jpeg");
  const [message, setMessage] = useState("");

  async function pick(camera: boolean) {
    const permission = camera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      feedback.showToast(camera ? "Autorize a câmera." : "Autorize a galeria.", "error");
      return;
    }
    const result = camera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.85, allowsEditing: true, aspect: [1, 1] })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85, allowsEditing: true, aspect: [1, 1] });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset?.uri) return;
    setUri(asset.uri);
    setMimeType(asset.mimeType || "image/jpeg");
  }

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
      await feedback.run("Salvando produto…", async () => {
        const product = await api.createProduct({
          name: name.trim(),
          description: description.trim(),
          priceCents,
          promoPriceCents: promoCents,
          status: published ? "ACTIVE" : "DRAFT",
          published,
          variants: [],
        });
        if (uri) {
          const asset = await uploadLocalImage(uri, mimeType, `${name.slice(0, 40)}.jpg`);
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

      <Pressable
        onPress={() => void pick(false)}
        style={{
          height: 180,
          borderRadius: 18,
          borderWidth: 2,
          borderStyle: uri ? "solid" : "dashed",
          borderColor: uri ? colors.border : "#D9CFFF",
          backgroundColor: uri ? colors.surface : "#F7F4FF",
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {uri ? (
          <Image source={{ uri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        ) : (
          <>
            <Ionicons name="camera-outline" size={28} color={colors.primary} />
            <Text style={{ marginTop: 8, color: colors.textSecondary, fontSize: fonts.body }}>Toque para adicionar foto</Text>
          </>
        )}
      </Pressable>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable
          onPress={() => void pick(true)}
          style={{ flex: 1, height: 44, borderRadius: 999, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ color: "#fff", fontSize: fonts.body, fontWeight: "700" }}>Câmera</Text>
        </Pressable>
        <Pressable
          onPress={() => void pick(false)}
          style={{ flex: 1, height: 44, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ color: colors.text, fontSize: fonts.body, fontWeight: "700" }}>Galeria</Text>
        </Pressable>
      </View>

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
