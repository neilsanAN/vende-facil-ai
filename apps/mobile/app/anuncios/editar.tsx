import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ApiClientError } from "@vendefacil/api-client";
import { normalizeHashtags } from "@vendefacil/types";
import { api } from "../../src/api";
import { handleTenantError } from "../../src/session";
import { BackButton } from "../../src/back-button";
import { Field, HelperText, PrimaryButton, ScreenTitle } from "../../src/ui";
import { HashtagField } from "../../src/hashtag-field";
import { KeyboardScreen } from "../../src/keyboard-screen";
import { useFeedback } from "../../src/feedback";

type Draft = { id: string; title: string; description: string; hashtags: string[]; tone: string };

export default function EditAdScreen() {
  const feedback = useFeedback();
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
          hashtags: normalizeHashtags(row.hashtags, row.title),
          tone: row.tone || "PROFESSIONAL",
        });
        setMessage("Edite o texto e as hashtags, depois salve.");
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
      await feedback.run("Salvando anúncio…", async () => {
        await api.updateAd(draft.id, {
          title: draft.title.trim(),
          description: draft.description.trim(),
          hashtags: normalizeHashtags(draft.hashtags, draft.title),
          tone: (draft.tone as "PROFESSIONAL" | "FRIENDLY" | "URGENT" | "ELEGANT") || "PROFESSIONAL",
          status: "DRAFT",
        });
      });
      feedback.showToast("Anúncio salvo.", "success");
      router.replace("/produtos");
    } catch (cause) {
      if (handleTenantError(cause)) return;
      const text = cause instanceof ApiClientError ? cause.message : "Não foi possível salvar.";
      setMessage(text);
      feedback.showToast(text, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardScreen contentContainerStyle={{ gap: 12 }}>
      <BackButton fallback="/produtos" />
      <ScreenTitle style={{ marginBottom: 6 }}>Editar anúncio</ScreenTitle>
      <HelperText>{message}</HelperText>

      {!draft ? (
        <ActivityIndicator color="#7C5CFF" />
      ) : (
        <View style={{ gap: 12 }}>
          <Field label="Título" value={draft.title} onChangeText={(title) => setDraft({ ...draft, title })} />
          <Field label="Descrição" value={draft.description} onChangeText={(description) => setDraft({ ...draft, description })} multiline />
          <HashtagField value={draft.hashtags} onChange={(hashtags) => setDraft({ ...draft, hashtags })} />
          <PrimaryButton label="Salvar" busy={saving} onPress={() => void save()} />
        </View>
      )}
    </KeyboardScreen>
  );
}
