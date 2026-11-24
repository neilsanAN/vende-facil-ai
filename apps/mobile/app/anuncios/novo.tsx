import { useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, control, fonts } from "@vendefacil/ui-tokens";
import { ApiClientError } from "@vendefacil/api-client";
import { api } from "../../src/api";
import { uploadLocalImage } from "../../src/upload";
import { handleTenantError } from "../../src/session";
import { BackButton } from "../../src/back-button";

type Draft = { id: string; title: string; description: string; hashtags: string[] };

export default function AdScreen() {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState("Tire uma foto ou escolha da galeria para a IA criar o anúncio.");
  const [uri, setUri] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState("image/jpeg");
  const [productName, setProductName] = useState("Produto");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [phase, setPhase] = useState<"pick" | "generating" | "done">("pick");
  const [draft, setDraft] = useState<Draft | null>(null);

  async function open(camera: boolean) {
    setBusy(true);
    try {
      const permission = camera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setMessage(camera ? "Autorize a câmera nas configurações do aparelho." : "Autorize a galeria nas configurações do aparelho.");
        return;
      }
      const result = camera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.85, allowsEditing: true, aspect: [4, 5] })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85, allowsEditing: true, aspect: [4, 5] });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.uri) return;
      setUri(asset.uri);
      setMimeType(asset.mimeType || "image/jpeg");
      setDraft(null);
      setPhase("pick");
      setMessage("Foto pronta. Informe o nome e toque em Gerar com IA.");
    } catch {
      setMessage("Não foi possível abrir a câmera ou a galeria neste aparelho.");
    } finally {
      setBusy(false);
    }
  }

  async function generate() {
    if (!uri) {
      setMessage("Tire ou escolha uma foto primeiro.");
      return;
    }
    const name = productName.trim();
    if (name.length < 2) {
      setMessage("Informe o nome do produto (mínimo 2 letras).");
      return;
    }
    setBusy(true);
    setPhase("generating");
    setMessage("Enviando a foto e gerando o anúncio com IA…");
    try {
      const asset = await uploadLocalImage(uri, mimeType, `${name.slice(0, 40)}.jpg`);
      const ad = await api.generateAd({
        assetIds: [asset.id],
        tone: "PROFESSIONAL",
        productId: null,
        facts: { name, brand: "", facts: "", audience: "", priceCents: null },
      });
      setDraft(ad);
      setPhase("done");
      setMessage("Anúncio gerado. Edite o texto se quiser e salve.");
    } catch (cause) {
      if (handleTenantError(cause)) return;
      setPhase("pick");
      setMessage(cause instanceof ApiClientError ? cause.message : "Não foi possível gerar o anúncio.");
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    if (!draft) return;
    if (draft.title.trim().length < 2 || draft.description.trim().length < 2) {
      setMessage("Título e descrição precisam ter pelo menos 2 caracteres.");
      return;
    }
    setSaving(true);
    setMessage("Salvando anúncio…");
    try {
      await api.updateAd(draft.id, {
        title: draft.title.trim(),
        description: draft.description.trim(),
        hashtags: draft.hashtags,
        tone: "PROFESSIONAL",
        status: "DRAFT",
      });
      setMessage("Anúncio salvo.");
      router.replace("/anuncios");
    } catch (cause) {
      if (handleTenantError(cause)) return;
      setMessage(cause instanceof ApiClientError ? cause.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: Math.max(insets.top, 12), paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 28) }}
      keyboardShouldPersistTaps="handled"
    >
      <BackButton fallback="/inicio" />

      <Text style={{ color: colors.text, fontSize: fonts.heading, fontWeight: "700" }}>Criar anúncio com IA</Text>
      <Text style={{ color: colors.textSecondary, fontSize: fonts.body, marginTop: 6, marginBottom: 16 }}>{message}</Text>

      {phase === "generating" ? (
        <View style={{ borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 28, alignItems: "center", marginBottom: 16 }}>
          {uri ? <Image source={{ uri }} style={{ width: 112, height: 112, borderRadius: 16, marginBottom: 16 }} /> : null}
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={{ marginTop: 14, color: colors.text, fontWeight: "700", fontSize: 15 }}>Gerando seu anúncio…</Text>
          <Text style={{ marginTop: 8, color: colors.textSecondary, fontSize: 12, textAlign: "center" }}>
            Analisando a foto e escrevendo título, descrição e hashtags.
          </Text>
        </View>
      ) : null}

      {phase === "pick" ? (
        <>
          <View
            style={{
              aspectRatio: 4 / 5,
              borderRadius: 22,
              borderWidth: 2,
              borderStyle: uri ? "solid" : "dashed",
              borderColor: uri ? colors.border : "#D9CFFF",
              backgroundColor: uri ? colors.surface : "#F7F4FF",
              overflow: "hidden",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
            }}
          >
            {uri ? (
              <Image source={{ uri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
            ) : (
              <>
                <Ionicons name="camera-outline" size={36} color={colors.primary} />
                <Text style={{ marginTop: 10, color: colors.text, fontSize: fonts.subtitle, fontWeight: "500", textAlign: "center", maxWidth: 220 }}>
                  Tire uma foto do produto ou escolha da galeria
                </Text>
              </>
            )}
          </View>

          <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
            <Pressable
              disabled={busy}
              onPress={() => void open(true)}
              style={{
                flex: 1,
                minHeight: 88,
                borderRadius: 16,
                backgroundColor: colors.primary,
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                opacity: busy ? 0.7 : 1,
              }}
            >
              <Ionicons name="camera" size={22} color="#fff" />
              <Text style={{ color: "#fff", fontSize: fonts.body, fontWeight: "600" }}>Câmera</Text>
            </Pressable>
            <Pressable
              disabled={busy}
              onPress={() => void open(false)}
              style={{
                flex: 1,
                minHeight: 88,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                opacity: busy ? 0.7 : 1,
              }}
            >
              <Ionicons name="images-outline" size={22} color={colors.text} />
              <Text style={{ color: colors.text, fontSize: fonts.body, fontWeight: "600" }}>Galeria</Text>
            </Pressable>
          </View>

          <View style={{ borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 11, marginBottom: 4 }}>Nome do produto</Text>
            <TextInput
              value={productName}
              onChangeText={setProductName}
              placeholder="Ex.: Fone Bluetooth"
              placeholderTextColor="#9A96AB"
              style={{ color: colors.text, fontSize: 14, paddingVertical: 4, minHeight: 28 }}
            />
          </View>

          <Pressable
            disabled={!uri || busy}
            onPress={() => void generate()}
            style={{
              height: control.height,
              borderRadius: 999,
              backgroundColor: uri ? colors.primary : "#E8EAF0",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: uri ? "#fff" : colors.textSecondary, fontSize: fonts.body, fontWeight: "600" }}>Gerar com IA</Text>
          </Pressable>
        </>
      ) : null}

      {phase === "done" && draft ? (
        <View style={{ gap: 12 }}>
          {uri ? (
            <View style={{ position: "relative" }}>
              <Image source={{ uri }} style={{ width: "100%", aspectRatio: 4 / 5, borderRadius: 18 }} resizeMode="cover" />
              <Pressable
                onPress={() => {
                  setPhase("pick");
                  setMessage("Troque a foto ou gere de novo.");
                }}
                style={{
                  position: "absolute",
                  right: 12,
                  top: 12,
                  height: 36,
                  width: 36,
                  borderRadius: 999,
                  backgroundColor: "#fff",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="pencil" size={14} color={colors.text} />
              </Pressable>
            </View>
          ) : null}

          <View style={{ borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 10 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 11, marginBottom: 4 }}>Título</Text>
            <TextInput
              value={draft.title}
              onChangeText={(title) => setDraft({ ...draft, title })}
              placeholder="Título do anúncio"
              placeholderTextColor="#9A96AB"
              style={{ color: colors.text, fontSize: 15, fontWeight: "600", paddingVertical: 4, minHeight: 32 }}
            />
          </View>

          <View style={{ borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 10 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 11, marginBottom: 4 }}>Descrição</Text>
            <TextInput
              value={draft.description}
              onChangeText={(description) => setDraft({ ...draft, description })}
              placeholder="Descrição do anúncio"
              placeholderTextColor="#9A96AB"
              multiline
              textAlignVertical="top"
              style={{ color: colors.text, fontSize: 14, lineHeight: 20, paddingVertical: 4, minHeight: 120 }}
            />
          </View>

          {draft.hashtags.length ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {draft.hashtags.map((tag) => (
                <Text
                  key={tag}
                  style={{
                    color: colors.primary,
                    backgroundColor: "#F3EEFF",
                    overflow: "hidden",
                    borderRadius: 999,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    fontSize: 11,
                    fontWeight: "600",
                  }}
                >
                  {tag.startsWith("#") ? tag : `#${tag}`}
                </Text>
              ))}
            </View>
          ) : null}

          <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
            <Pressable
              disabled={busy || saving}
              onPress={() => void generate()}
              style={{
                flex: 1,
                height: control.height,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 6,
              }}
            >
              <Ionicons name="refresh" size={16} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: "600", fontSize: 13 }}>Regenerar</Text>
            </Pressable>
            <Pressable
              disabled={saving}
              onPress={() => void saveDraft()}
              style={{
                flex: 1,
                height: control.height,
                borderRadius: 999,
                backgroundColor: colors.primary,
                alignItems: "center",
                justifyContent: "center",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>Salvar</Text>}
            </Pressable>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}
