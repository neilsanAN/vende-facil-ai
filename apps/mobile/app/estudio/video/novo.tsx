import { useEffect, useMemo, useState } from "react";
import { Image, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, control, fonts } from "@vendefacil/ui-tokens";
import { ApiClientError } from "@vendefacil/api-client";
import { api, apiBase } from "../../../src/api";
import { BackButton } from "../../../src/back-button";
import { KeyboardScreen } from "../../../src/keyboard-screen";
import { handleTenantError } from "../../../src/session";
import { Chip, HelperText, PrimaryButton, ScreenTitle, SectionLabel, SelectRow } from "../../../src/ui";

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
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [objective, setObjective] = useState<Objective>("SELL");
  const [style, setStyle] = useState<Style>("ELEGANT");
  const [durationSec, setDurationSec] = useState<(typeof DURATIONS)[number]>(30);
  const [aspectRatio, setAspectRatio] = useState<Aspect>("R9_16");
  const [picker, setPicker] = useState<"product" | "objective" | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .products()
      .then((result) => {
        const rows = ((result as { data?: Product[] }).data || []).filter((item) => (item.images?.length || 0) > 0);
        setProducts(rows);
        if (rows[0]) setProductId(rows[0].id);
        if (!rows.length) {
          setMessage("Cadastre um produto com foto para gerar o vídeo.");
          setError(true);
        }
      })
      .catch((cause) => {
        if (handleTenantError(cause)) return;
        setError(true);
        setMessage(cause instanceof ApiClientError ? cause.message : "Falha ao carregar produtos.");
      });
  }, []);

  const selected = useMemo(() => products.find((item) => item.id === productId), [products, productId]);
  const image = mediaUrl(selected?.images?.[0]?.url);
  const objectiveLabel = OBJECTIVES.find((item) => item.value === objective)?.label || "";

  async function create() {
    if (!productId) {
      setError(true);
      setMessage("Escolha um produto com foto.");
      return;
    }
    setBusy(true);
    setError(false);
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
      setError(true);
      setMessage(cause instanceof ApiClientError ? cause.message : "Não foi possível gerar o vídeo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardScreen>
      <BackButton fallback="/estudio" />
      <ScreenTitle>Gerar vídeo com IA</ScreenTitle>

      <Pressable
        onPress={() => setPicker("product")}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          borderRadius: control.radiusSheet,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          padding: 12,
          marginBottom: 16,
        }}
      >
        <View style={{ width: 56, height: 56, borderRadius: control.radiusCard, overflow: "hidden", backgroundColor: "#F3F4F8" }}>
          {image ? (
            <Image source={{ uri: image }} style={{ width: "100%", height: "100%" }} />
          ) : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="image-outline" size={control.tabIcon} color={colors.textSecondary} />
            </View>
          )}
        </View>
        <Text style={{ flex: 1, color: colors.text, fontSize: fonts.subtitle, fontWeight: "700" }} numberOfLines={2}>
          {selected?.name || "Escolher produto"}
        </Text>
        <Ionicons name="chevron-down" size={control.icon} color={colors.textSecondary} />
      </Pressable>

      <SectionLabel>Objetivo do vídeo</SectionLabel>
      <View style={{ marginBottom: 16 }}>
        <SelectRow value={objectiveLabel} onPress={() => setPicker("objective")} />
      </View>

      <SectionLabel>Estilo do vídeo</SectionLabel>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {STYLES.map((item) => (
          <Chip key={item.value} label={item.label} active={style === item.value} onPress={() => setStyle(item.value)} />
        ))}
      </View>

      <SectionLabel>Duração</SectionLabel>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
        {DURATIONS.map((item) => (
          <Chip key={item} label={`${item}s`} active={durationSec === item} onPress={() => setDurationSec(item)} />
        ))}
      </View>

      <SectionLabel>Formato</SectionLabel>
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
              <Text style={{ color: active ? colors.primary : colors.text, fontSize: fonts.subtitle, fontWeight: "700" }}>{item.ratio}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: fonts.tiny, fontWeight: "600", marginTop: 2 }}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {message ? <HelperText error={error}>{message}</HelperText> : null}
      <PrimaryButton label="Gerar vídeo com IA" busy={busy} disabled={!productId} onPress={() => void create()} />

      <Modal visible={picker !== null} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
        <Pressable onPress={() => setPicker(null)} style={{ flex: 1, backgroundColor: "rgba(15,12,30,0.45)", justifyContent: "flex-end" }}>
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: "70%" }}
          >
            <Text style={{ color: colors.text, fontSize: fonts.title, fontWeight: "700", marginBottom: 12 }}>
              {picker === "product" ? "Escolher produto" : "Objetivo do vídeo"}
            </Text>
            <ScrollView>
              {(picker === "product"
                ? products.map((item) => ({ key: item.id, label: item.name, onPress: () => setProductId(item.id) }))
                : OBJECTIVES.map((item) => ({ key: item.value, label: item.label, onPress: () => setObjective(item.value) }))
              ).map((item) => (
                <Pressable
                  key={item.key}
                  onPress={() => {
                    item.onPress();
                    setPicker(null);
                  }}
                  style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}
                >
                  <Text style={{ color: colors.text, fontSize: fonts.title, fontWeight: "600" }}>{item.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardScreen>
  );
}
