import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, control, fonts } from "@vendefacil/ui-tokens";
import { ApiClientError } from "@vendefacil/api-client";
import { api, apiBase } from "../../../src/api";
import { BackButton } from "../../../src/back-button";
import { handleTenantError } from "../../../src/session";

type Product = { id: string; name: string; images?: Array<{ url: string }> };
type Objective = "SELL" | "OFFER" | "PRESENT" | "SOCIAL";
type Style = "ELEGANT" | "OFFER" | "SHOWCASE" | "PREMIUM" | "MINIMAL" | "SOCIAL";
type Aspect = "R9_16" | "R1_1" | "R16_9";

const OBJECTIVES: Array<{ value: Objective; label: string }> = [
  { value: "SELL", label: "Vender o produto" },
  { value: "OFFER", label: "Destacar oferta" },
  { value: "PRESENT", label: "Apresentar o produto" },
  { value: "SOCIAL", label: "Redes sociais" },
];

const STYLES: Array<{ value: Style; label: string }> = [
  { value: "ELEGANT", label: "Comercial" },
  { value: "OFFER", label: "Oferta" },
  { value: "SHOWCASE", label: "Apresentação" },
  { value: "PREMIUM", label: "Vitrine" },
  { value: "MINIMAL", label: "Minimalista" },
  { value: "SOCIAL", label: "Redes sociais" },
];

const DURATIONS = [15, 30, 45, 60] as const;

const RATIOS: Array<{ value: Aspect; ratio: string; label: string }> = [
  { value: "R9_16", ratio: "9:16", label: "Reels/Stories" },
  { value: "R1_1", ratio: "1:1", label: "Feed" },
  { value: "R16_9", ratio: "16:9", label: "YouTube" },
];

function mediaUrl(path?: string) {
  if (!path) return null;
  return path.startsWith("http") ? path : `${apiBase}${path}`;
}

export default function GenerateVideoScreen() {
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [objective, setObjective] = useState<Objective>("SELL");
  const [style, setStyle] = useState<Style>("ELEGANT");
  const [durationSec, setDurationSec] = useState<(typeof DURATIONS)[number]>(30);
  const [aspectRatio, setAspectRatio] = useState<Aspect>("R9_16");
  const [picker, setPicker] = useState<"product" | "objective" | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api
      .products()
      .then((result) => {
        const rows = ((result as { data?: Product[] }).data || []).filter((item) => (item.images?.length || 0) > 0);
        setProducts(rows);
        if (rows[0]) setProductId(rows[0].id);
        if (!rows.length) setMessage("Cadastre um produto com foto para gerar o vídeo.");
      })
      .catch((cause) => {
        if (handleTenantError(cause)) return;
        setMessage(cause instanceof ApiClientError ? cause.message : "Falha ao carregar produtos.");
      });
  }, []);

  const selected = useMemo(() => products.find((item) => item.id === productId), [products, productId]);
  const image = mediaUrl(selected?.images?.[0]?.url);
  const objectiveLabel = OBJECTIVES.find((item) => item.value === objective)?.label || "";

  async function create() {
    if (!productId) {
      setMessage("Escolha um produto com foto.");
      return;
    }
    setBusy(true);
    setMessage("Gerando projeto de vídeo…");
    try {
      const project = await api.createVideo({
        productId,
        objective,
        style,
        durationSec,
        aspectRatio,
        motionMode: "PHOTO",
      });
      router.replace(`/estudio/video/${project.id}`);
    } catch (cause) {
      if (handleTenantError(cause)) return;
      setMessage(cause instanceof ApiClientError ? cause.message : "Não foi possível gerar o vídeo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: Math.max(insets.top, 12), paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 28) }}
    >
      <BackButton fallback="/estudio" />
      <Text style={{ color: colors.text, fontSize: fonts.heading, fontWeight: "700", marginBottom: 16 }}>Gerar vídeo com IA</Text>

      <Pressable
        onPress={() => setPicker("product")}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          padding: 12,
          marginBottom: 16,
        }}
      >
        <View style={{ width: 56, height: 56, borderRadius: 12, overflow: "hidden", backgroundColor: "#F3F4F8" }}>
          {image ? <Image source={{ uri: image }} style={{ width: "100%", height: "100%" }} /> : <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><Ionicons name="image-outline" size={20} color={colors.textSecondary} /></View>}
        </View>
        <Text style={{ flex: 1, color: colors.text, fontSize: 13, fontWeight: "700" }} numberOfLines={2}>
          {selected?.name || "Escolher produto"}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
      </Pressable>

      <Text style={{ color: colors.text, fontSize: 12, fontWeight: "700", marginBottom: 8 }}>Objetivo do vídeo</Text>
      <Pressable
        onPress={() => setPicker("objective")}
        style={{
          height: control.height,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          paddingHorizontal: 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <Text style={{ color: colors.text, fontSize: 13, fontWeight: "600" }}>{objectiveLabel}</Text>
        <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
      </Pressable>

      <Text style={{ color: colors.text, fontSize: 12, fontWeight: "700", marginBottom: 8 }}>Estilo do vídeo</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {STYLES.map((item) => {
          const active = style === item.value;
          return (
            <Pressable
              key={item.value}
              onPress={() => setStyle(item.value)}
              style={{
                borderRadius: 999,
                paddingHorizontal: 14,
                paddingVertical: 8,
                backgroundColor: active ? colors.primary : colors.surface,
                borderWidth: active ? 0 : 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ color: active ? "#fff" : colors.text, fontSize: 12, fontWeight: "600" }}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={{ color: colors.text, fontSize: 12, fontWeight: "700", marginBottom: 8 }}>Duração</Text>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
        {DURATIONS.map((item) => {
          const active = durationSec === item;
          return (
            <Pressable
              key={item}
              onPress={() => setDurationSec(item)}
              style={{
                borderRadius: 999,
                paddingHorizontal: 16,
                paddingVertical: 8,
                backgroundColor: active ? colors.primary : colors.surface,
                borderWidth: active ? 0 : 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ color: active ? "#fff" : colors.text, fontSize: 12, fontWeight: "600" }}>{item}s</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={{ color: colors.text, fontSize: 12, fontWeight: "700", marginBottom: 8 }}>Formato</Text>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
        {RATIOS.map((item) => {
          const active = aspectRatio === item.value;
          return (
            <Pressable
              key={item.value}
              onPress={() => setAspectRatio(item.value)}
              style={{
                flex: 1,
                alignItems: "center",
                borderRadius: 14,
                paddingVertical: 12,
                backgroundColor: active ? colors.primarySoft : colors.surface,
                borderWidth: active ? 2 : 1,
                borderColor: active ? colors.primary : colors.border,
              }}
            >
              <Text style={{ color: active ? colors.primary : colors.text, fontSize: 13, fontWeight: "700" }}>{item.ratio}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 9, fontWeight: "600", marginTop: 2 }}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {message ? <Text style={{ color: message.includes("Gerando") ? colors.textSecondary : colors.error, fontSize: 12, marginBottom: 12 }}>{message}</Text> : null}

      <Pressable
        disabled={busy || !productId}
        onPress={() => void create()}
        style={{
          height: control.height,
          borderRadius: 999,
          backgroundColor: colors.primary,
          alignItems: "center",
          justifyContent: "center",
          opacity: busy || !productId ? 0.7 : 1,
        }}
      >
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>Gerar vídeo com IA</Text>}
      </Pressable>

      <Modal visible={picker !== null} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
        <Pressable onPress={() => setPicker(null)} style={{ flex: 1, backgroundColor: "rgba(15,12,30,0.45)", justifyContent: "flex-end" }}>
          <Pressable onPress={(event) => event.stopPropagation()} style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: "70%" }}>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700", marginBottom: 12 }}>
              {picker === "product" ? "Escolher produto" : "Objetivo do vídeo"}
            </Text>
            <ScrollView>
              {(picker === "product" ? products.map((item) => ({ key: item.id, label: item.name, onPress: () => setProductId(item.id) })) : OBJECTIVES.map((item) => ({ key: item.value, label: item.label, onPress: () => setObjective(item.value) }))).map((item) => (
                <Pressable
                  key={item.key}
                  onPress={() => {
                    item.onPress();
                    setPicker(null);
                  }}
                  style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}
                >
                  <Text style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}>{item.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}
