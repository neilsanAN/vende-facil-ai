import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, control, fonts } from "@vendefacil/ui-tokens";
import { ApiClientError } from "@vendefacil/api-client";
import { api } from "../../src/api";
import { handleTenantError } from "../../src/session";
import { BackButton } from "../../src/back-button";

type Draft = { id: string; title: string; description: string; hashtags: string[]; tone: string };

export default function EditAdScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [message, setMessage] = useState("Carregando anúncio…");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) {
      setMessage("Anúncio não encontrado.");
      return;
    }
    api
      .listAds()
      .then((rows) => {
        const row = rows.find((item) => item.id === id);
        if (!row) {
          setMessage("Anúncio não encontrado.");
          return;
        }
        setDraft({
          id: row.id,
          title: row.title,
          description: row.description,
          hashtags: row.hashtags,
          tone: row.tone || "PROFESSIONAL",
        });
        setMessage("Edite e salve as alterações.");
      })
      .catch((cause) => {
        if (handleTenantError(cause)) return;
        setMessage(cause instanceof ApiClientError ? cause.message : "Falha ao carregar.");
      });
  }, [id]);

  async function save() {
    if (!draft) return;
    if (draft.title.trim().length < 2 || draft.description.trim().length < 2) {
      setMessage("Título e descrição precisam ter pelo menos 2 caracteres.");
      return;
    }
    setSaving(true);
    try {
      await api.updateAd(draft.id, {
        title: draft.title.trim(),
        description: draft.description.trim(),
        hashtags: draft.hashtags,
        tone: (draft.tone as "PROFESSIONAL" | "FRIENDLY" | "URGENT" | "ELEGANT") || "PROFESSIONAL",
        status: "DRAFT",
      });
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
      <BackButton fallback="/anuncios" />
      <Text style={{ color: colors.text, fontSize: fonts.heading, fontWeight: "700" }}>Editar anúncio</Text>
      <Text style={{ color: colors.textSecondary, fontSize: fonts.body, marginTop: 6, marginBottom: 16 }}>{message}</Text>

      {!draft ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <View style={{ gap: 12 }}>
          <View style={{ borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 10 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 11, marginBottom: 4 }}>Título</Text>
            <TextInput
              value={draft.title}
              onChangeText={(title) => setDraft({ ...draft, title })}
              style={{ color: colors.text, fontSize: 15, fontWeight: "600", paddingVertical: 4, minHeight: 32 }}
            />
          </View>
          <View style={{ borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 10 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 11, marginBottom: 4 }}>Descrição</Text>
            <TextInput
              value={draft.description}
              onChangeText={(description) => setDraft({ ...draft, description })}
              multiline
              textAlignVertical="top"
              style={{ color: colors.text, fontSize: 14, lineHeight: 20, paddingVertical: 4, minHeight: 120 }}
            />
          </View>
          <Pressable
            disabled={saving}
            onPress={() => void save()}
            style={{
              height: control.height,
              borderRadius: 999,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>Salvar</Text>}
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}
