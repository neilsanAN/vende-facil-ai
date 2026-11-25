import { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Easing, Image, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, control, fonts } from "@vendefacil/ui-tokens";
import { ApiClientError } from "@vendefacil/api-client";
import { normalizeHashtags } from "@vendefacil/types";
import { api, apiBase } from "../../src/api";
import { uploadLocalImage } from "../../src/upload";
import { handleTenantError } from "../../src/session";
import { Field, PrimaryButton } from "../../src/ui";
import { HashtagField } from "../../src/hashtag-field";
import { useFeedback } from "../../src/feedback";
import { setItem } from "../../src/storage";

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
  const feedback = useFeedback();
  const slide = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  const [step, setStep] = useState<Step>(0);
  const [uri, setUri] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState("image/jpeg");
  const [coverAssetId, setCoverAssetId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");

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
    if (step === 1) return;
    if (router.canGoBack()) router.back();
    else router.replace("/inicio");
  }

  async function open(camera: boolean) {
    try {
      const permission = camera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        feedback.showToast(camera ? "Autorize a câmera." : "Autorize a galeria.", "error");
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
      setCoverAssetId(null);
      setError("");
    } catch {
      feedback.showToast("Não foi possível abrir a câmera/galeria.", "error");
    }
  }

  async function runGenerate() {
    if (!uri) {
      setError("Tire ou escolha uma foto primeiro.");
      return;
    }
    setError("");
    setStep(1);
    try {
      const ad = await (async () => {
        const asset = await uploadLocalImage(uri, mimeType, "produto.jpg");
        setCoverAssetId(asset.id);
        const created = await api.generateAd({
          assetIds: [asset.id],
          tone: "PROFESSIONAL",
          productId: null,
          facts: { name: "Produto", brand: "", facts: "", audience: "", priceCents: null },
        });
        await setItem(`ad_cover_${created.id}`, `${apiBase}/api/media/${asset.id}`);
        return created;
      })();
      setDraft({
        ...ad,
        hashtags: normalizeHashtags(ad.hashtags, ad.title),
      });
      setStep(2);
      feedback.showToast("Anúncio gerado.", "success");
    } catch (cause) {
      if (handleTenantError(cause)) return;
      setStep(0);
      const text = cause instanceof ApiClientError ? cause.message : "Não foi possível gerar o anúncio.";
      setError(text);
      feedback.showToast(text, "error");
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
        });
        if (coverAssetId) await setItem(`ad_cover_${draft.id}`, `${apiBase}/api/media/${coverAssetId}`);
        else if (uri) await setItem(`ad_cover_${draft.id}`, uri);
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
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: Math.max(insets.top, 12) }}>
      <View style={{ paddingHorizontal: 16 }}>
        <ScreenHeader title={title} onBack={goBack} />
        <Stepper active={step} />
      </View>

      <View style={{ flex: 1, overflow: "hidden" }}>
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
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, paddingBottom: 12 }}>
              <View
                style={{
                  borderRadius: 20,
                  borderWidth: 1.5,
                  borderStyle: "dashed",
                  borderColor: uri ? colors.primary : "#D7D0EA",
                  backgroundColor: "#F7F4FF",
                  padding: 20,
                  alignItems: "center",
                  minHeight: 280,
                  justifyContent: "center",
                }}
              >
                {uri ? (
                  <Image source={{ uri }} style={{ width: "100%", aspectRatio: 4 / 5, borderRadius: 14 }} resizeMode="cover" />
                ) : (
                  <>
                    <View
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 16,
                        backgroundColor: colors.primarySoft,
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 12,
                      }}
                    >
                      <Ionicons name="camera" size={26} color={colors.primary} />
                    </View>
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: fonts.subtitle,
                        fontWeight: "600",
                        textAlign: "center",
                        lineHeight: 18,
                        maxWidth: 240,
                        marginBottom: 18,
                      }}
                    >
                      Tire uma foto do produto ou escolha da galeria
                    </Text>
                  </>
                )}

                <View style={{ flexDirection: "row", gap: 10, width: "100%", marginTop: uri ? 14 : 0 }}>
                  <Pressable
                    onPress={() => void open(true)}
                    style={{
                      flex: 1,
                      height: 48,
                      borderRadius: 14,
                      backgroundColor: colors.primary,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <Ionicons name="camera" size={18} color="#fff" />
                    <Text style={{ color: "#fff", fontSize: fonts.body, fontWeight: "700" }}>Câmera</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void open(false)}
                    style={{
                      flex: 1,
                      height: 48,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <Ionicons name="images-outline" size={18} color={colors.text} />
                    <Text style={{ color: colors.text, fontSize: fonts.body, fontWeight: "700" }}>Galeria</Text>
                  </Pressable>
                </View>
              </View>

              <View
                style={{
                  marginTop: 14,
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
                  A IA vai analisar a imagem e sugerir título, descrição, categoria e hashtags.
                </Text>
              </View>

              {error ? <Text style={{ color: colors.error, fontSize: fonts.body, marginTop: 10, fontWeight: "600" }}>{error}</Text> : null}
            </ScrollView>

            <PrimaryButton label="Avançar" disabled={!uri} onPress={() => void runGenerate()} />
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
            <Text style={{ marginTop: 20, color: colors.text, fontSize: fonts.title, fontWeight: "700" }}>Gerando com IA…</Text>
            <Text style={{ marginTop: 8, color: colors.textSecondary, fontSize: fonts.body, fontWeight: "500", textAlign: "center", maxWidth: 260, lineHeight: 18 }}>
              Analisando a foto e montando título, descrição e hashtags para o seu anúncio.
            </Text>
          </View>

          {/* Step 3 — Ajustes */}
          <View style={{ width: PAGE_WIDTH, flex: 1, paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 20) }}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12, gap: 12 }} keyboardShouldPersistTaps="handled">
              {uri ? (
                <View>
                  <View style={{ borderRadius: 18, overflow: "hidden", backgroundColor: colors.surface }}>
                    <Image source={{ uri }} style={{ width: "100%", aspectRatio: 4 / 5 }} resizeMode="cover" />
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
                  <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 10 }}>
                    {[0, 1, 2, 3].map((dot) => (
                      <View
                        key={dot}
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 999,
                          backgroundColor: dot === 0 ? colors.primary : "#D8DBE6",
                        }}
                      />
                    ))}
                  </View>
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
    </View>
  );
}
