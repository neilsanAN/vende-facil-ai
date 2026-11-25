import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ASPECT_DIMENSIONS, PIPELINE_LABEL, type PipelineStatus } from "@vendefacil/types";
import { colors, control, fonts } from "@vendefacil/ui-tokens";
import { ApiClientError } from "@vendefacil/api-client";
import { api, apiBase } from "../../../src/api";
import { BackButton } from "../../../src/back-button";
import { handleTenantError } from "../../../src/session";
import { Chip, Field, HelperText, PrimaryButton, ScreenTitle } from "../../../src/ui";

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
};

type Tab = "cenas" | "texto" | "audio" | "transicao" | "velocidade";

const TABS: Array<{ key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: "cenas", label: "Cenas", icon: "layers-outline" },
  { key: "texto", label: "Texto", icon: "text-outline" },
  { key: "audio", label: "Áudio", icon: "mic-outline" },
  { key: "transicao", label: "Transição", icon: "film-outline" },
  { key: "velocidade", label: "Velocidade", icon: "speedometer-outline" },
];

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

  if (!draft || !scene) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: Math.max(insets.top, 12), paddingHorizontal: 16 }}>
        <BackButton fallback="/estudio" />
        <ScreenTitle>Editor de vídeo</ScreenTitle>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        {message ? <HelperText>{message}</HelperText> : null}
      </View>
    );
  }

  const outputUrl = status?.outputAssetId ? `${apiBase}/api/media/${status.outputAssetId}` : null;
  const pipelineLabel = status?.status ? PIPELINE_LABEL[status.status as PipelineStatus] || status.status : null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: Math.max(insets.top, 12), paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 28) }}
      keyboardShouldPersistTaps="handled"
    >
      <BackButton fallback="/estudio" />
      <ScreenTitle>Editor de vídeo</ScreenTitle>

      <View
        style={{
          alignSelf: "center",
          width: "100%",
          maxWidth: 360,
          aspectRatio: previewAspect,
          maxHeight: 420,
          borderRadius: 20,
          overflow: "hidden",
          backgroundColor: "#1A1240",
          marginBottom: 12,
        }}
      >
        <View style={{ flex: 1, padding: 18, justifyContent: "space-between" }}>
          <View>
            <Text style={{ color: "#fff", fontSize: fonts.hero, fontWeight: "700" }}>{scene.headline || draft.title}</Text>
            {scene.caption ? <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: fonts.body, marginTop: 6 }}>{scene.caption}</Text> : null}
          </View>
          <View>
            <View style={{ height: 4, borderRadius: control.radiusButton, backgroundColor: "rgba(255,255,255,0.25)", marginBottom: 10 }}>
              <View style={{ width: "33%", height: "100%", borderRadius: control.radiusButton, backgroundColor: "#fff" }} />
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 28, height: 28, borderRadius: control.radiusButton, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="play" size={14} color="#fff" />
              </View>
              <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: fonts.body2, fontWeight: "600" }}>
                0:00 / 0:{String(draft.durationSec).padStart(2, "0")}
              </Text>
              <View style={{ flex: 1 }} />
              <Ionicons name="volume-medium-outline" size={control.icon} color="rgba(255,255,255,0.85)" />
              <Ionicons name="expand-outline" size={control.icon} color="rgba(255,255,255,0.85)" />
            </View>
          </View>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 8 }}>
        {draft.scenes.map((item, itemIndex) => (
          <Pressable
            key={`${item.headline}-${itemIndex}`}
            onPress={() => setIndex(itemIndex)}
            style={{
              width: 64,
              height: 56,
              borderRadius: control.radiusCard,
              backgroundColor: "#1A1240",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: itemIndex === index ? 2 : 1,
              borderColor: itemIndex === index ? colors.primary : colors.border,
            }}
          >
            <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: fonts.tiny, fontWeight: "700" }}>Cena {itemIndex + 1}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {pipelineLabel ? (
        <Text style={{ color: colors.textSecondary, fontSize: fonts.body2, fontWeight: "600", marginBottom: 10 }}>
          {pipelineLabel} · {status?.progress ?? 0}% {status?.errorMessage || ""}
        </Text>
      ) : null}

      <View
        style={{
          flexDirection: "row",
          borderRadius: 18,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          padding: 6,
          marginBottom: 12,
        }}
      >
        {TABS.map((item) => {
          const active = tab === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => setTab(item.key)}
              style={{
                flex: 1,
                alignItems: "center",
                gap: 2,
                paddingVertical: 8,
                borderRadius: control.radiusCard,
                backgroundColor: active ? colors.primarySoft : "transparent",
              }}
            >
              <Ionicons name={item.icon} size={control.icon} color={active ? colors.primary : colors.textSecondary} />
              <Text style={{ color: active ? colors.primary : colors.textSecondary, fontSize: fonts.tiny, fontWeight: "700" }}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {tab === "cenas" ? (
        <View style={{ gap: 10, marginBottom: 14 }}>
          <Field label="Título da cena" value={scene.headline} onChangeText={(headline) => updateScene({ headline })} />
          <Field label="Legenda" value={scene.caption} onChangeText={(caption) => updateScene({ caption })} />
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

      <PrimaryButton
        label={outputUrl ? "Baixar vídeo" : "Exportar vídeo"}
        busy={busy}
        onPress={() => {
          if (outputUrl) void Linking.openURL(outputUrl);
          else void exportVideo();
        }}
      />

      <Pressable onPress={() => router.push("/estudio/publicar")} style={{ marginTop: 12, alignItems: "center" }}>
        <Text style={{ color: colors.primary, fontSize: fonts.body, fontWeight: "700" }}>Publicar nas redes</Text>
      </Pressable>
    </ScrollView>
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
