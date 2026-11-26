import { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Easing, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, control, fonts } from "@vendefacil/ui-tokens";
import { ApiClientError } from "@vendefacil/api-client";
import { normalizeHashtags } from "@vendefacil/types";
import { api, apiBase } from "../../src/api";
import { goBack as goBackNav } from "../../src/back-button";
import { uploadLocalImage } from "../../src/upload";
import { handleTenantError } from "../../src/session";
import { Field, PrimaryButton } from "../../src/ui";
import { HashtagField } from "../../src/hashtag-field";
import { useKeyboardBottomInset } from "../../src/keyboard-screen";
import { useFeedback } from "../../src/feedback";
import { setItem } from "../../src/storage";
import { LocalPhoto, MAX_PRODUCT_PHOTOS, PhotoGallery } from "../../src/photo-gallery";

type Draft = { id: string; title: string; description: string; hashtags: string[] };
type Step = 0 | 1 | 2;

const STEPS = [
  { key: "foto", label: "Foto" },
  { key: "ia", label: "IA" },
  { key: "ajustes", label: "Ajustes" },
] as const;

const PAGE_WIDTH = Dimensions.get("window").width;

function Stepper({ active }: { active: Step }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "center", marginTop: 8, marginBottom: 18, paddingHorizontal: 12 }}>
      {STEPS.map((step, index) => {
        const done = index < active;
        const current = index === active;
        const filled = done || current;
        return (
          <View key={step.key} style={{ flex: 1, alignItems: "center", position: "relative" }}>
            {index < STEPS.length - 1 ? (
              <View
                style={{
                  position: "absolute",
                  top: 15,
                  left: "50%",
                  right: -PAGE_WIDTH,
                  width: "100%",
                  height: 2,
                  backgroundColor: index < active ? colors.primary : "#E6E8F0",
                  zIndex: 0,
                }}
              />
            ) : null}
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: filled ? colors.primary : "#EEF0F5",
                zIndex: 1,
              }}
            >
              {done ? (
                <Ionicons name="checkmark" size={16} color="#fff" />
              ) : (
                <Text style={{ color: filled ? "#fff" : "#9AA0B4", fontSize: fonts.body, fontWeight: "700" }}>{index + 1}</Text>
              )}
            </View>
            <Text
              style={{
                marginTop: 8,
                color: current ? colors.primary : done ? colors.text : colors.textSecondary,
                fontSize: fonts.caption,
                fontWeight: current ? "700" : "600",
              }}
            >
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function ScreenHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4, minHeight: 44 }}>
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
        numberOfLines={1}
      >
        {title}
      </Text>
    </View>
  );
}

export default function AdScreen() {
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardBottomInset();
  const feedback = useFeedback();
  const slide = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  const [step, setStep] = useState<Step>(0);
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [assetIds, setAssetIds] = useState<string[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const coverUri = photos[0]?.uri || null;
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Gerando com IA…");
  const generatingRef = useRef(false);
  /** Incrementa a cada cancelamento/nova geração para ignorar respostas atrasadas. */
  const generationSeq = useRef(0);
  /** Rascunho criado nesta sessão (para arquivar se o usuário cancelar no meio). */
  const sessionDraftId = useRef<string | null>(null);

  useEffect(() => {
    Animated.timing(slide, {
      toValue: -step * PAGE_WIDTH,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [slide, step]);

  useEffect(() => {
    if (step !== 1) {
      spin.stopAnimation();
      spin.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin, step]);

  function goBack() {
    if (step === 2) {
      setStep(0);
      setError("");
      return;
    }
    if (step === 1) {
      // Cancela geração em andamento e evita que a resposta atrasada crie outro anúncio.
      generationSeq.current += 1;
      generatingRef.current = false;
      const orphanId = sessionDraftId.current;
      sessionDraftId.current = null;
      if (orphanId && orphanId !== draft?.id) {
        void api.archiveAd(orphanId).catch(() => undefined);
      }
      setStep(0);
      setError("Geração cancelada.");
      return;
    }
    goBackNav("/inicio");
  }

  function withTimeout<T>(promise: Promise<T>, ms: number, message: string) {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(message)), ms);
      promise.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (cause) => {
          clearTimeout(timer);
          reject(cause);
        },
      );
    });
  }

  async function runGenerate() {
    if (!photos.length) {
      setError("Tire ou escolha ao menos uma foto primeiro.");
      return;
    }
    if (generatingRef.current) return;
    generatingRef.current = true;
    const seq = ++generationSeq.current;
    setError("");
    setStatus(photos.length > 1 ? `Enviando ${photos.length} fotos…` : "Enviando foto…");
    setStep(1);
    const previousId = draft?.id || null;
    let workingId = previousId;
    try {
      let ids = assetIds;
      if (ids.length !== photos.length) {
        ids = [];
        for (const [index, photo] of photos.slice(0, MAX_PRODUCT_PHOTOS).entries()) {
          if (seq !== generationSeq.current) return;
          setStatus(`Enviando foto ${index + 1} de ${photos.length}…`);
          const asset = await withTimeout(
            uploadLocalImage(photo.uri, photo.mimeType, `anuncio-${index + 1}.jpg`),
            60_000,
            "O envio da foto demorou demais. Tente de novo.",
          );
          ids.push(asset.id);
        }
        if (seq !== generationSeq.current) return;
        setAssetIds(ids);
      }

      // Garante um único ID antes da IA: timeout/late response atualizam o mesmo anúncio.
      if (!workingId) {
        setStatus("Preparando rascunho…");
        const placeholder = await api.createAd({
          title: "Gerando anúncio…",
          description: "Aguarde enquanto a IA monta o texto do seu anúncio.",
          hashtags: ["produto", "oferta", "loja"],
          tone: "PROFESSIONAL",
          status: "DRAFT",
        });
        if (seq !== generationSeq.current) {
          await api.archiveAd(placeholder.id).catch(() => undefined);
          return;
        }
        workingId = placeholder.id;
        sessionDraftId.current = placeholder.id;
      }

      setStatus("Gerando título e descrição…");
      let created: { id: string; title: string; description: string; hashtags: string[] };
      try {
        created = await withTimeout(
          api.generateAd({
            assetIds: ids,
            tone: "PROFESSIONAL",
            productId: null,
            replaceAdId: workingId,
            facts: { name: "Produto", brand: "", facts: "", audience: "", priceCents: null },
          }),
          75_000,
          "A IA demorou demais. Abrimos um rascunho para você editar.",
        );
      } catch (aiCause) {
        if (seq !== generationSeq.current) return;
        // Fallback: atualiza o mesmo rascunho — nunca cria um segundo anúncio.
        setStatus("Preparando rascunho…");
        created = await api.updateAd(workingId!, {
          title: "Seu produto em destaque",
          description: "Edite o título, a descrição e as hashtags do seu anúncio. Inclua benefícios e como comprar.",
          hashtags: ["produto", "oferta", "loja"],
          tone: "PROFESSIONAL",
          status: "DRAFT",
          imageAssetIds: ids,
        });
        const hint = aiCause instanceof ApiClientError || aiCause instanceof Error ? aiCause.message : "A IA não respondeu.";
        feedback.showToast(hint.includes("demorou") || hint.includes("rascunho") ? "Rascunho pronto para editar." : hint, "info");
      }
      if (seq !== generationSeq.current) return;
      // Se a IA ignorou replaceAdId e criou outro, arquiva o placeholder.
      if (workingId && workingId !== created.id) {
        await api.archiveAd(workingId).catch(() => undefined);
      }
      sessionDraftId.current = null;
      const localUris = photos.map((photo) => photo.uri).filter(Boolean);
      if (localUris.length) await setItem(`ad_images_${created.id}`, JSON.stringify(localUris));
      if (localUris[0]) await setItem(`ad_cover_${created.id}`, localUris[0]);
      else if (ids[0]) await setItem(`ad_cover_${created.id}`, `${apiBase}/api/media/${ids[0]}`);
      setDraft({
        ...created,
        hashtags: normalizeHashtags(created.hashtags, created.title),
      });
      setStep(2);
      feedback.showToast(previousId ? "Anúncio atualizado." : "Anúncio pronto.", "success");
    } catch (cause) {
      if (seq !== generationSeq.current) return;
      if (handleTenantError(cause)) {
        setStep(0);
        return;
      }
      setStep(0);
      const text = cause instanceof ApiClientError ? cause.message : cause instanceof Error ? cause.message : "Não foi possível gerar o anúncio.";
      setError(text);
      feedback.showToast(text, "error");
    } finally {
      if (seq === generationSeq.current) {
        generatingRef.current = false;
        setStatus("Gerando com IA…");
      }
    }
  }

  async function saveDraft() {
    if (!draft) return;
    if (draft.title.trim().length < 2 || draft.description.trim().length < 2) {
      setError("Título e descrição precisam ter pelo menos 2 caracteres.");
      return;
    }
    try {
      await feedback.run("Salvando anúncio…", async () => {
        await api.updateAd(draft.id, {
          title: draft.title.trim(),
          description: draft.description.trim(),
          hashtags: normalizeHashtags(draft.hashtags, draft.title),
          tone: "PROFESSIONAL",
          status: "DRAFT",
          ...(assetIds.length ? { imageAssetIds: assetIds } : {}),
        });
        const localUris = photos.map((photo) => photo.uri).filter(Boolean);
        if (localUris.length) await setItem(`ad_images_${draft.id}`, JSON.stringify(localUris));
        if (localUris[0]) await setItem(`ad_cover_${draft.id}`, localUris[0]);
        else if (assetIds[0]) await setItem(`ad_cover_${draft.id}`, `${apiBase}/api/media/${assetIds[0]}`);
        else if (coverUri) await setItem(`ad_cover_${draft.id}`, coverUri);
      });
      feedback.showToast("Anúncio salvo.", "success");
      router.replace("/anuncios");
    } catch (cause) {
      if (handleTenantError(cause)) return;
      const text = cause instanceof ApiClientError ? cause.message : "Não foi possível salvar.";
      setError(text);
      feedback.showToast(text, "error");
    }
  }

  const title = step === 2 ? "Anúncio gerado pela IA" : "Criar anúncio com IA";
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background, paddingTop: Math.max(insets.top, 12) }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={8}
    >
      <View style={{ paddingHorizontal: 16 }}>
        <ScreenHeader title={title} onBack={goBack} />
        <Stepper active={step} />
      </View>

      <View style={{ flex: 1, overflow: "hidden", paddingBottom: keyboardInset }}>
        <Animated.View
          style={{
            flex: 1,
            width: PAGE_WIDTH * 3,
            flexDirection: "row",
            transform: [{ translateX: slide }],
          }}
        >
          {/* Step 1 — Foto */}
          <View style={{ width: PAGE_WIDTH, flex: 1, paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 20) }}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, paddingBottom: 12, gap: 14 }}>
              <PhotoGallery
                photos={photos}
                onChange={(next) => {
                  setPhotos(next);
                  setAssetIds([]);
                  setDraft(null);
                  sessionDraftId.current = null;
                  setError("");
                }}
                emptyLabel="Escolha até 30 fotos do produto"
                onError={(text) => feedback.showToast(text, "error")}
              />

              <View
                style={{
                  borderRadius: 14,
                  backgroundColor: colors.primarySoft,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 10,
                }}
              >
                <Ionicons name="sparkles" size={16} color={colors.primary} style={{ marginTop: 1 }} />
                <Text style={{ flex: 1, color: colors.text, fontSize: fonts.body2, fontWeight: "500", lineHeight: 16 }}>
                  A IA analisa as fotos e sugere título, descrição e hashtags. A primeira foto vira a capa.
                </Text>
              </View>

              {error ? <Text style={{ color: colors.error, fontSize: fonts.body, fontWeight: "600" }}>{error}</Text> : null}
            </ScrollView>

            <PrimaryButton label="Avançar" disabled={!photos.length} onPress={() => void runGenerate()} />
          </View>

          {/* Step 2 — IA */}
          <View style={{ width: PAGE_WIDTH, flex: 1, paddingHorizontal: 16, alignItems: "center", justifyContent: "center", paddingBottom: Math.max(insets.bottom, 28) }}>
            <Animated.View style={{ transform: [{ rotate }] }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  borderWidth: 3,
                  borderColor: colors.primarySoft,
                  borderTopColor: colors.primary,
                }}
              />
            </Animated.View>
            <Text style={{ marginTop: 20, color: colors.text, fontSize: fonts.title, fontWeight: "700" }}>{status}</Text>
            <Text style={{ marginTop: 8, color: colors.textSecondary, fontSize: fonts.body, fontWeight: "500", textAlign: "center", maxWidth: 260, lineHeight: 18 }}>
              Montando título, descrição e hashtags. Se demorar, toque em Voltar e tente de novo.
            </Text>
          </View>

          {/* Step 3 — Ajustes */}
          <View style={{ width: PAGE_WIDTH, flex: 1, paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 20) }}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24, gap: 12 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
            >
              {coverUri ? (
                <View>
                  <View style={{ borderRadius: 18, overflow: "hidden", backgroundColor: colors.surface }}>
                    <Image source={{ uri: coverUri }} style={{ width: "100%", aspectRatio: 4 / 5 }} resizeMode="cover" />
                    <Pressable
                      onPress={() => {
                        setStep(0);
                        setError("");
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
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Ionicons name="pencil" size={14} color={colors.text} />
                    </Pressable>
                  </View>
                  {photos.length > 1 ? (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                      {photos.slice(0, 8).map((photo) => (
                        <Image
                          key={photo.key}
                          source={{ uri: photo.uri }}
                          style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: "#EEF0F5" }}
                          resizeMode="cover"
                        />
                      ))}
                      {photos.length > 8 ? (
                        <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ color: colors.primary, fontSize: fonts.caption, fontWeight: "700" }}>+{photos.length - 8}</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              ) : null}

              {draft ? (
                <>
                  <Field label="Título" value={draft.title} onChangeText={(titleValue) => setDraft({ ...draft, title: titleValue })} placeholder="Título do anúncio" />
                  <Field
                    label="Descrição"
                    value={draft.description}
                    onChangeText={(description) => setDraft({ ...draft, description })}
                    placeholder="Descrição do anúncio"
                    multiline
                  />
                  <HashtagField
                    label="Hashtags (sugeridas)"
                    value={draft.hashtags}
                    onChange={(hashtags) => setDraft({ ...draft, hashtags })}
                  />
                </>
              ) : null}

              {error ? <Text style={{ color: colors.error, fontSize: fonts.body, fontWeight: "600" }}>{error}</Text> : null}
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
              <Pressable
                onPress={() => void runGenerate()}
                style={{
                  flex: 1,
                  height: control.buttonHeight,
                  borderRadius: control.radiusButton,
                  borderWidth: 1.5,
                  borderColor: colors.primary,
                  backgroundColor: colors.surface,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Ionicons name="refresh" size={16} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: control.buttonFontSize, fontWeight: "700" }}>Regenerar</Text>
              </Pressable>
              <View style={{ flex: 1 }}>
                <PrimaryButton label="Salvar" onPress={() => void saveDraft()} />
              </View>
            </View>
          </View>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}
