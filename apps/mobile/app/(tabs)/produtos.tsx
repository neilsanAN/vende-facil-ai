import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, SectionList, Text, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatHashtag } from "@vendefacil/types";
import { colors, control, fonts } from "@vendefacil/ui-tokens";
import { ApiClientError } from "@vendefacil/api-client";
import { api, apiBase } from "../../src/api";
import { handleTenantError } from "../../src/session";
import { ActionMenu } from "../../src/action-menu";
import { ConfirmSheet, useFeedback } from "../../src/feedback";
import { deleteItem, getItem } from "../../src/storage";

type Ad = {
  id: string;
  title: string;
  description: string;
  hashtags: string[];
  tone?: string;
  status: string;
  aiCategory?: string | null;
  product: string | null;
  updatedAt: string;
  coverUrl?: string | null;
  imageUrls?: string[];
};

function resolveCover(ad: Ad, local?: string | null) {
  if (local) return local;
  if (ad.coverUrl) return ad.coverUrl.startsWith("http") ? ad.coverUrl : `${apiBase}${ad.coverUrl}`;
  const first = ad.imageUrls?.[0];
  if (first) return first.startsWith("http") ? first : `${apiBase}${first}`;
  return null;
}

export default function AnunciosTabScreen() {
  const insets = useSafeAreaInsets();
  const feedback = useFeedback();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [menuAd, setMenuAd] = useState<Ad | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Ad | null>(null);
  const deletingRef = useRef(false);

  const load = useCallback(async (soft = false) => {
    if (!soft) setLoading(true);
    setError("");
    try {
      const rows = await api.listAds();
      const withCovers = await Promise.all(
        rows.map(async (row) => ({
          ...row,
          coverUrl: (await getItem(`ad_cover_${row.id}`)) || row.coverUrl || null,
        })),
      );
      setAds(withCovers);
    } catch (cause) {
      if (handleTenantError(cause)) return;
      setError(cause instanceof ApiClientError ? cause.message : "Falha ao carregar anúncios.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const sections = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = ads.filter((item) => {
      if (!needle) return true;
      const hay = `${item.title} ${item.description} ${item.aiCategory || ""} ${item.hashtags?.join(" ") || ""}`.toLowerCase();
      return hay.includes(needle);
    });
    const map = new Map<string, Ad[]>();
    for (const ad of filtered) {
      const key = (ad.aiCategory || "Outros").trim() || "Outros";
      const bucket = map.get(key) || [];
      bucket.push(ad);
      map.set(key, bucket);
    }
    return [...map.entries()]
      .map(([title, data]) => ({
        title,
        data,
        latestAt: data[0]?.updatedAt ? new Date(data[0].updatedAt).getTime() : 0,
      }))
      .sort((a, b) => b.latestAt - a.latestAt)
      .map(({ title, data }) => ({ title, data }));
  }, [ads, q]);

  async function removeAd(ad: Ad) {
    if (deletingRef.current) return;
    deletingRef.current = true;
    setError("");
    setConfirmDelete(null);
    setMenuAd(null);
    const previous = ads;
    setAds((current) => current.filter((item) => item.id !== ad.id));
    try {
      await feedback.run("Excluindo anúncio…", async () => {
        try {
          await api.archiveAd(ad.id);
        } catch (cause) {
          if (cause instanceof ApiClientError && (cause.status === 404 || cause.status === 405)) {
            try {
              await api.deleteAd(ad.id);
            } catch {
              await api.softArchiveAd({
                id: ad.id,
                title: ad.title,
                description: ad.description,
                hashtags: ad.hashtags?.length ? ad.hashtags : ["loja"],
                tone: (ad.tone as "PROFESSIONAL" | "FRIENDLY" | "URGENT" | "ELEGANT") || "PROFESSIONAL",
              });
            }
          } else {
            throw cause;
          }
        }
        await deleteItem(`ad_cover_${ad.id}`).catch(() => undefined);
      });
      feedback.showToast("Anúncio excluído.", "success");
      void load(true);
    } catch (cause) {
      setAds(previous);
      if (handleTenantError(cause)) return;
      const text = cause instanceof ApiClientError ? cause.message : "Não foi possível excluir.";
      setError(text);
      feedback.showToast(text, "error");
    } finally {
      deletingRef.current = false;
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: Math.max(insets.top, 12), paddingHorizontal: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <Text style={{ color: colors.text, fontSize: fonts.heading, fontWeight: "700" }}>Anúncios</Text>
        <Pressable
          onPress={() => router.push("/anuncios/novo")}
          style={{
            height: control.buttonHeight,
            borderRadius: control.radiusButton,
            backgroundColor: colors.primary,
            paddingHorizontal: 14,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 6,
          }}
        >
          <Ionicons name="add" size={control.icon} color="#fff" />
          <Text style={{ color: "#fff", fontSize: control.buttonFontSize, fontWeight: "700" }}>Novo</Text>
        </Pressable>
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          paddingHorizontal: 12,
          marginBottom: 12,
          height: 42,
        }}
      >
        <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Buscar anúncio ou categoria"
          placeholderTextColor={colors.textSecondary}
          style={{ flex: 1, color: colors.text, fontSize: fonts.body }}
        />
      </View>

      {error ? <Text style={{ color: colors.error, fontSize: fonts.body, marginBottom: 8 }}>{error}</Text> : null}
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 28) }}
          ListEmptyComponent={
            <Pressable
              onPress={() => router.push("/anuncios/novo")}
              style={{
                borderRadius: control.radiusSheet,
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: colors.border,
                backgroundColor: colors.surface,
                paddingVertical: 28,
                paddingHorizontal: 16,
                alignItems: "center",
                marginTop: 8,
              }}
            >
              <Ionicons name="sparkles-outline" size={26} color={colors.primary} />
              <Text style={{ color: colors.text, fontSize: fonts.body, fontWeight: "700", marginTop: 10 }}>Nenhum anúncio ainda</Text>
              <Text style={{ color: colors.textSecondary, fontSize: fonts.caption, marginTop: 4, textAlign: "center" }}>
                Tire uma foto e a IA identifica, categoriza e monta o anúncio.
              </Text>
            </Pressable>
          }
          renderSectionHeader={({ section }) => (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10, marginBottom: 8 }}>
              <Text style={{ color: colors.text, fontSize: fonts.subtitle, fontWeight: "700" }}>{section.title}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: fonts.caption, fontWeight: "600" }}>{section.data.length}</Text>
            </View>
          )}
          renderItem={({ item }) => {
            const cover = resolveCover(item);
            return (
              <Pressable
                onPress={() => router.push({ pathname: "/anuncios/editar", params: { id: item.id } })}
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: control.radiusSheet,
                  padding: 10,
                  marginBottom: 8,
                  flexDirection: "row",
                  gap: 10,
                }}
              >
                <View style={{ width: 64, height: 64, borderRadius: 12, overflow: "hidden", backgroundColor: "#F3F4F8" }}>
                  {cover ? (
                    <Image source={{ uri: cover }} style={{ width: "100%", height: "100%" }} />
                  ) : (
                    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="sparkles-outline" size={20} color={colors.primary} />
                    </View>
                  )}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: colors.text, fontSize: fonts.subtitle, fontWeight: "700" }} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: fonts.caption, marginTop: 3 }} numberOfLines={2}>
                    {item.description}
                  </Text>
                  {item.hashtags?.length ? (
                    <Text style={{ color: colors.primary, fontSize: fonts.caption, marginTop: 5, fontWeight: "600" }} numberOfLines={1}>
                      {item.hashtags.map(formatHashtag).join(" ")}
                    </Text>
                  ) : null}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
                    <View style={{ borderRadius: control.radiusButton, backgroundColor: item.status === "PUBLISHED" ? "#DCFCE7" : "#FFF4E5", paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ color: item.status === "PUBLISHED" ? "#166534" : "#B45309", fontSize: fonts.caption, fontWeight: "700" }}>
                        {item.status === "PUBLISHED" ? "Publicado" : "Rascunho"}
                      </Text>
                    </View>
                  </View>
                </View>
                <Pressable onPress={() => setMenuAd(item)} hitSlop={10} style={{ width: 28, height: 28, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />
                </Pressable>
              </Pressable>
            );
          }}
        />
      )}

      <ActionMenu
        open={Boolean(menuAd)}
        title={menuAd?.title}
        onClose={() => setMenuAd(null)}
        items={
          menuAd
            ? [
                {
                  key: "edit",
                  label: "Editar",
                  onPress: () => router.push({ pathname: "/anuncios/editar", params: { id: menuAd.id } }),
                },
                {
                  key: "delete",
                  label: "Excluir",
                  destructive: true,
                  onPress: () => setConfirmDelete(menuAd),
                },
              ]
            : []
        }
      />

      <ConfirmSheet
        open={Boolean(confirmDelete)}
        title="Excluir este anúncio?"
        message="Ele sai da lista de anúncios ativos."
        confirmLabel="Excluir"
        destructive
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) void removeAd(confirmDelete);
        }}
      />
    </View>
  );
}
