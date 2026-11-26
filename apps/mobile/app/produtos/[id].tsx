import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, Switch, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { parseBrlToCents } from "@vendefacil/validation";
import { colors, fonts } from "@vendefacil/ui-tokens";
import { ApiClientError } from "@vendefacil/api-client";
import { api, apiBase } from "../../src/api";
import { uploadLocalImage } from "../../src/upload";
import { BackButton } from "../../src/back-button";
import { handleTenantError } from "../../src/session";
import { useFeedback } from "../../src/feedback";
import { KeyboardScreen } from "../../src/keyboard-screen";
import { LocalPhoto, MAX_PRODUCT_PHOTOS, PhotoGallery } from "../../src/photo-gallery";
import { Field, HelperText, PrimaryButton, ScreenTitle } from "../../src/ui";

function centsToInput(cents?: number | null) {
  if (cents == null) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

function mediaUrl(path?: string) {
  if (!path) return null;
  return path.startsWith("http") ? path : `${apiBase}${path}`;
}

type RemoteImage = { id: string; url: string };

export default function EditProductScreen() {
  const feedback = useFeedback();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [promo, setPromo] = useState("");
  const [published, setPublished] = useState(false);
  const [remoteImages, setRemoteImages] = useState<RemoteImage[]>([]);
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
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
        setRemoteImages(
          (product.images || []).map((image) => ({
            id: image.id,
            url: mediaUrl(image.url) || image.url,
          })),
        );
      })
      .catch((cause) => {
        if (handleTenantError(cause)) return;
        setMessage(cause instanceof ApiClientError ? cause.message : "Falha ao carregar.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const totalPhotos = remoteImages.length + photos.length;

  async function save() {
    if (!id) return;
    const priceCents = parseBrlToCents(price);
    const promoCents = promo.trim() ? parseBrlToCents(promo) : null;
    if (name.trim().length < 2 || priceCents == null) {
      setMessage("Nome e preço válidos são obrigatórios.");
      return;
    }
    if (totalPhotos > MAX_PRODUCT_PHOTOS) {
      setMessage(`Limite de ${MAX_PRODUCT_PHOTOS} fotos por produto.`);
      return;
    }
    try {
      await feedback.run(photos.length ? `Salvando e enviando ${photos.length} foto(s)…` : "Salvando alterações…", async () => {
        await api.updateProduct(id, {
          name: name.trim(),
          description: description.trim(),
          priceCents,
          promoPriceCents: promoCents,
          status: published ? "ACTIVE" : "DRAFT",
          published,
          variants: [],
        });
        for (const [index, photo] of photos.entries()) {
          const asset = await uploadLocalImage(photo.uri, photo.mimeType, `${name.slice(0, 40)}-${index + 1}.jpg`);
          await api.addProductImage(id, asset.id);
        }
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

  async function removeRemote(imageId: string) {
    if (!id) return;
    try {
      await feedback.run("Removendo foto…", async () => {
        await api.removeProductImage(id, imageId);
      });
      setRemoteImages((current) => current.filter((item) => item.id !== imageId));
      feedback.showToast("Foto removida.", "success");
    } catch (cause) {
      if (handleTenantError(cause)) return;
      feedback.showToast(cause instanceof ApiClientError ? cause.message : "Não foi possível remover.", "error");
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
          {remoteImages.length ? (
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
                <Text style={{ color: colors.text, fontSize: fonts.subtitle, fontWeight: "700" }}>Fotos salvas</Text>
                <Text style={{ color: colors.textSecondary, fontSize: fonts.caption, fontWeight: "600" }}>
                  {totalPhotos}/{MAX_PRODUCT_PHOTOS}
                </Text>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {remoteImages.map((image, index) => (
                  <View
                    key={image.id}
                    style={{
                      width: "31.5%",
                      aspectRatio: 1,
                      borderRadius: 14,
                      overflow: "hidden",
                      backgroundColor: "#EEF0F5",
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Image source={{ uri: image.url }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                    {index === 0 ? (
                      <View
                        style={{
                          position: "absolute",
                          left: 6,
                          bottom: 6,
                          borderRadius: 999,
                          backgroundColor: "rgba(23,24,39,0.72)",
                          paddingHorizontal: 7,
                          paddingVertical: 3,
                        }}
                      >
                        <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700" }}>Capa</Text>
                      </View>
                    ) : null}
                    <Pressable
                      onPress={() => void removeRemote(image.id)}
                      hitSlop={8}
                      style={{
                        position: "absolute",
                        top: 6,
                        right: 6,
                        width: 26,
                        height: 26,
                        borderRadius: 999,
                        backgroundColor: "rgba(15,12,30,0.72)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name="close" size={14} color="#fff" />
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {remoteImages.length < MAX_PRODUCT_PHOTOS ? (
            <PhotoGallery
              photos={photos}
              onChange={setPhotos}
              max={MAX_PRODUCT_PHOTOS - remoteImages.length}
              emptyLabel={remoteImages.length ? "Adicionar mais fotos" : "Adicione até 30 fotos do produto"}
              onError={(text) => feedback.showToast(text, "error")}
            />
          ) : null}

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
