import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@vendefacil/ui-tokens";
import { ApiClientError } from "@vendefacil/api-client";
import { api } from "../../src/api";
import { handleTenantError } from "../../src/session";
import { BackButton } from "../../src/back-button";
import { Field, HelperText, PrimaryButton, ScreenTitle } from "../../src/ui";

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
      <ScreenTitle style={{ marginBottom: 6 }}>Editar anúncio</ScreenTitle>
      <HelperText>{message}</HelperText>

      {!draft ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <View style={{ gap: 12 }}>
          <Field label="Título" value={draft.title} onChangeText={(title) => setDraft({ ...draft, title })} />
          <Field label="Descrição" value={draft.description} onChangeText={(description) => setDraft({ ...draft, description })} multiline />
          <PrimaryButton label="Salvar" busy={saving} onPress={() => void save()} />
        </View>
      )}
    </ScrollView>
  );
}
