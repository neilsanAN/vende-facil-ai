import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ASPECT_DIMENSIONS, PIPELINE_LABEL, type PipelineStatus } from "@vendefacil/types";
import { colors, control, fonts } from "@vendefacil/ui-tokens";
import { ApiClientError } from "@vendefacil/api-client";
import { api, apiBase } from "../../../src/api";
import { handleTenantError } from "../../../src/session";
import { Chip, Field, HelperText } from "../../../src/ui";

type Scene = {
  mediaAssetId?: string | null;
  durationMs: number;
  transition: "CUT" | "FADE" | "SLIDE" | "WIPE";
  zoom: number;
  panX: number;
  panY: number;
  headline: string;
  caption: string;
  cta: string;
};

type Project = {
  id: string;
  title: string;
  script: string;
  durationSec: number;
  aspectRatio: keyof typeof ASPECT_DIMENSIONS;
  showPrice: boolean;
  showLogo: boolean;
  cta: string;
  narrationVolume: number;
  musicVolume: number;
  scenes: Scene[];
  renders: Array<{ id: string; status: string; progress: number; errorMessage?: string | null; outputAssetId?: string | null }>;
  product?: { id: string; name: string } | null;
};

type Tab = "cenas" | "texto" | "audio" | "transicao" | "velocidade";

const TABS: Array<{ key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: "cenas", label: "Cenas", icon: "copy-outline" },
  { key: "texto", label: "Texto", icon: "text-outline" },
  { key: "audio", label: "Áudio", icon: "musical-notes-outline" },
  { key: "transicao", label: "Transição", icon: "swap-horizontal-outline" },
  { key: "velocidade", label: "Velocidade", icon: "timer-outline" },
];

function mediaUrl(assetId?: string | null) {
  if (!assetId) return null;
  return `${apiBase}/api/media/${assetId}`;
}

function formatClock(totalSec: number) {
  const safe = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function VideoEditorScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [draft, setDraft] = useState<Project | null>(null);
  const [index, setIndex] = useState(0);
  const [tab, setTab] = useState<Tab>("cenas");
  const [status, setStatus] = useState<Project["renders"][0] | undefined>();
  const [message, setMessage] = useState("Carregando editor…");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const project = await api.getVideo(id);
      setDraft(project);
      setStatus(project.renders[0]);
      setMessage("");
    } catch (cause) {
      if (handleTenantError(cause)) return;
      setMessage(cause instanceof ApiClientError ? cause.message : "Falha ao carregar o projeto.");
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const scene = draft?.scenes[index];
  const ratio = draft ? ASPECT_DIMENSIONS[draft.aspectRatio] : ASPECT_DIMENSIONS.R9_16;
  const previewAspect = useMemo(() => ratio.width / ratio.height, [ratio.height, ratio.width]);
  const previewImage = mediaUrl(scene?.mediaAssetId);

  function updateScene(patch: Partial<Scene>) {
    if (!draft || !scene) return;
    setDraft({
      ...draft,
      scenes: draft.scenes.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    });
  }

  async function save() {
    if (!draft) return;
    await api.updateVideo(draft.id, {
      title: draft.title,
      script: draft.script,
      cta: draft.cta,
      showPrice: draft.showPrice,
      showLogo: draft.showLogo,
      narrationVolume: Math.round(draft.narrationVolume),
      musicVolume: Math.round(draft.musicVolume),
      scenes: draft.scenes,
    });
  }

  async function exportVideo() {
    if (!draft) return;
    setBusy(true);
    setMessage("Exportando vídeo…");
    try {
      await save();
      const render = await api.renderVideo(draft.id);
      setStatus(render);
      const timer = setInterval(() => {
        void api
          .getVideo(draft.id)
          .then((fresh) => {
            const latest = fresh.renders[0];
            if (latest) setStatus(latest);
            if (latest && ["COMPLETED", "FAILED", "CANCELLED"].includes(latest.status)) {
              clearInterval(timer);
              setBusy(false);
              setMessage(latest.status === "COMPLETED" ? "Vídeo pronto para baixar." : latest.errorMessage || "Exportação encerrada.");
            }
          })
          .catch(() => clearInterval(timer));
      }, 3000);
    } catch (cause) {
      if (handleTenantError(cause)) return;
      setBusy(false);
      setMessage(cause instanceof ApiClientError ? cause.message : "Exportação indisponível.");
    }
  }

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace("/estudio");
  }

  if (!draft || !scene) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: Math.max(insets.top, 12), paddingHorizontal: 16 }}>
        <EditorHeader onBack={goBack} />
        <ActivityIndicator color={colors.primary} style={{ marginTop: 28 }} />
        {message ? <HelperText>{message}</HelperText> : null}
      </View>
    );
  }

  const outputUrl = status?.outputAssetId ? `${apiBase}/api/media/${status.outputAssetId}` : null;
  const pipelineLabel = status?.status ? PIPELINE_LABEL[status.status as PipelineStatus] || status.status : null;
  const headline = scene.headline || draft.title || draft.product?.name || "Seu produto";
  const caption = scene.caption || scene.cta || draft.cta;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: Math.max(insets.top, 12) }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 24) }}
        keyboardShouldPersistTaps="handled"
      >
        <EditorHeader onBack={goBack} />

        {/* Preview — mock: imagem + overlays + barra de player */}
        <View
          style={{
            alignSelf: "center",
            width: "100%",
            maxWidth: 360,
            aspectRatio: Math.min(previewAspect, 4 / 5),
            maxHeight: 360,
            borderRadius: 18,
            overflow: "hidden",
            backgroundColor: "#111827",
            marginTop: 8,
            marginBottom: 12,
          }}
        >
          {previewImage ? (
            <Image source={{ uri: previewImage }} style={{ position: "absolute", width: "100%", height: "100%" }} resizeMode="cover" />
          ) : null}
          <View style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(10,8,24,0.28)" }} />

          <View style={{ flex: 1, padding: 16, justifyContent: "flex-end" }}>
            <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700", textShadowColor: "rgba(0,0,0,0.35)", textShadowRadius: 6 }}>
              {headline}
            </Text>
            {caption ? (
              <View
                style={{
                  alignSelf: "flex-start",
                  marginTop: 10,
                  borderRadius: 999,
                  backgroundColor: "#EC4899",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
              >
                <Text style={{ color: "#fff", fontSize: fonts.body2, fontWeight: "700" }} numberOfLines={2}>
                  {caption}
                </Text>
              </View>
            ) : null}

            <View
              style={{
                marginTop: 16,
                borderRadius: 12,
                backgroundColor: "rgba(0,0,0,0.45)",
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            >
              <View style={{ height: 3, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.25)", marginBottom: 10 }}>
                <View style={{ width: "18%", height: "100%", borderRadius: 999, backgroundColor: "#fff" }} />
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Ionicons name="play" size={16} color="#fff" />
                <Text style={{ color: "rgba(255,255,255,0.92)", fontSize: fonts.caption, fontWeight: "600" }}>
                  0:00 / {formatClock(draft.durationSec)}
                </Text>
                <View style={{ flex: 1 }} />
                <Ionicons name="volume-medium-outline" size={16} color="rgba(255,255,255,0.9)" />
                <Ionicons name="expand-outline" size={16} color="rgba(255,255,255,0.9)" />
              </View>
            </View>
          </View>
        </View>

        {/* Thumbnails das cenas */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }} style={{ marginBottom: 14 }}>
          {draft.scenes.map((item, itemIndex) => {
            const thumb = mediaUrl(item.mediaAssetId);
            const active = itemIndex === index;
            return (
              <Pressable
                key={`${item.mediaAssetId || "scene"}-${itemIndex}`}
                onPress={() => setIndex(itemIndex)}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 12,
                  overflow: "hidden",
                  backgroundColor: "#1F2937",
                  borderWidth: active ? 2.5 : 1,
                  borderColor: active ? colors.primary : colors.border,
                }}
              >
                {thumb ? (
                  <Image source={{ uri: thumb }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                ) : (
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: fonts.tiny, fontWeight: "700" }}>{itemIndex + 1}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Toolbar */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 14, paddingHorizontal: 2 }}>
          {TABS.map((item) => {
            const active = tab === item.key;
            return (
              <Pressable key={item.key} onPress={() => setTab(item.key)} style={{ width: "18%", alignItems: "center", gap: 6 }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: active ? colors.primarySoft : colors.surface,
                    borderWidth: 1,
                    borderColor: active ? colors.primary : colors.border,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name={item.icon} size={18} color={active ? colors.primary : colors.textSecondary} />
                </View>
                <Text style={{ color: active ? colors.primary : colors.textSecondary, fontSize: fonts.tiny, fontWeight: "700" }}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {pipelineLabel ? (
          <Text style={{ color: colors.textSecondary, fontSize: fonts.body2, fontWeight: "600", marginBottom: 10 }}>
            {pipelineLabel} · {status?.progress ?? 0}% {status?.errorMessage || ""}
          </Text>
        ) : null}

        {tab === "cenas" ? (
          <View style={{ gap: 10, marginBottom: 14 }}>
            <Field label="Título da cena" value={scene.headline} onChangeText={(headlineValue) => updateScene({ headline: headlineValue })} />
            <Field label="Legenda" value={scene.caption} onChangeText={(captionValue) => updateScene({ caption: captionValue })} />
          </View>
        ) : null}

        {tab === "texto" ? (
          <View style={{ gap: 10, marginBottom: 14 }}>
            <Field label="Roteiro" value={draft.script} onChangeText={(script) => setDraft({ ...draft, script })} multiline />
            <CheckRow label="Mostrar preço" value={draft.showPrice} onChange={(showPrice) => setDraft({ ...draft, showPrice })} />
            <CheckRow label="Logo da loja" value={draft.showLogo} onChange={(showLogo) => setDraft({ ...draft, showLogo })} />
          </View>
        ) : null}

        {tab === "audio" ? (
          <View style={{ gap: 10, marginBottom: 14 }}>
            <Field
              label={`Volume narração (${Math.round(draft.narrationVolume)})`}
              value={String(draft.narrationVolume)}
              onChangeText={(value) => setDraft({ ...draft, narrationVolume: Math.min(100, Math.max(0, Number(value) || 0)) })}
              keyboardType="numeric"
            />
            <Field
              label={`Volume música (${Math.round(draft.musicVolume)})`}
              value={String(draft.musicVolume)}
              onChangeText={(value) => setDraft({ ...draft, musicVolume: Math.min(100, Math.max(0, Number(value) || 0)) })}
              keyboardType="numeric"
            />
          </View>
        ) : null}

        {tab === "transicao" ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            {(["CUT", "FADE", "SLIDE", "WIPE"] as const).map((item) => (
              <Chip key={item} label={item} active={scene.transition === item} onPress={() => updateScene({ transition: item })} />
            ))}
          </View>
        ) : null}

        {tab === "velocidade" ? (
          <View style={{ gap: 10, marginBottom: 14 }}>
            <Field
              label="Zoom"
              value={String(scene.zoom)}
              onChangeText={(value) => updateScene({ zoom: Math.min(1.4, Math.max(1, Number(value) || 1)) })}
              keyboardType="decimal-pad"
            />
            <Field
              label="Pan horizontal"
              value={String(scene.panX)}
              onChangeText={(value) => updateScene({ panX: Math.min(1, Math.max(-1, Number(value) || 0)) })}
              keyboardType="decimal-pad"
            />
          </View>
        ) : null}

        {message ? <HelperText>{message}</HelperText> : null}

        <Pressable
          disabled={busy}
          onPress={() => {
            if (outputUrl) void Linking.openURL(outputUrl);
            else void exportVideo();
          }}
          style={{
            height: control.buttonHeight,
            borderRadius: control.radiusButton,
            backgroundColor: colors.primary,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name={outputUrl ? "download-outline" : "download-outline"} size={18} color="#fff" />
              <Text style={{ color: "#fff", fontSize: control.buttonFontSize, fontWeight: "700" }}>
                {outputUrl ? "Baixar vídeo" : "Exportar vídeo"}
              </Text>
            </>
          )}
        </Pressable>

        <Pressable onPress={() => router.push("/estudio/publicar")} style={{ marginTop: 14, alignItems: "center" }}>
          <Text style={{ color: colors.primary, fontSize: fonts.body, fontWeight: "700" }}>Publicar nas redes</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function EditorHeader({ onBack }: { onBack: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", minHeight: 44, marginBottom: 4 }}>
      <Pressable
        onPress={onBack}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        style={{
          height: 44,
          width: 44,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </Pressable>
      <Text
        style={{
          flex: 1,
          textAlign: "center",
          color: colors.text,
          fontSize: fonts.title,
          fontWeight: "700",
          marginRight: 44,
        }}
      >
        Editor de vídeo
      </Text>
    </View>
  );
}

function CheckRow({ label, value, onChange }: { label: string; value: boolean; onChange: (next: boolean) => void }) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        minHeight: control.height,
        borderRadius: control.radiusInput,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        paddingHorizontal: control.paddingH,
      }}
    >
      <Ionicons name={value ? "checkbox" : "square-outline"} size={control.icon} color={value ? colors.primary : colors.textSecondary} />
      <Text style={{ color: colors.text, fontSize: control.fontSize, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}
