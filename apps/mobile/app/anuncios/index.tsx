import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatHashtag } from "@vendefacil/types";
import { colors, control, fonts } from "@vendefacil/ui-tokens";
import { ApiClientError } from "@vendefacil/api-client";
import { api } from "../../src/api";
import { handleTenantError } from "../../src/session";
import { BackButton } from "../../src/back-button";
import { ActionMenu } from "../../src/action-menu";
import { ScreenTitle } from "../../src/ui";

type Ad = {
  id: string;
  title: string;
  description: string;
  hashtags: string[];
  tone?: string;
  status: string;
  product: string | null;
  updatedAt: string;
};

export default function AdsListScreen() {
  const insets = useSafeAreaInsets();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [menuAd, setMenuAd] = useState<Ad | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await api.listAds();
      setAds(rows);
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

  async function archive(ad: Ad) {
    setError("");
    try {
      try {
        await api.archiveAd(ad.id);
      } catch (cause) {
        if (cause instanceof ApiClientError && (cause.status === 404 || cause.status === 405)) {
          await api.softArchiveAd({
            id: ad.id,
            title: ad.title,
            description: ad.description,
            hashtags: ad.hashtags?.length ? ad.hashtags : ["loja"],
            tone: (ad.tone as "PROFESSIONAL" | "FRIENDLY" | "URGENT" | "ELEGANT") || "PROFESSIONAL",
          });
        } else {
          throw cause;
        }
      }
      setAds((current) => current.filter((item) => item.id !== ad.id));
      setMenuAd(null);
    } catch (cause) {
      if (handleTenantError(cause)) return;
      setError(cause instanceof ApiClientError ? cause.message : "Não foi possível excluir.");
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: Math.max(insets.top, 12), paddingHorizontal: 16 }}>
      <BackButton fallback="/inicio" />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <ScreenTitle style={{ marginBottom: 0 }}>Anúncios</ScreenTitle>
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

      {error ? <Text style={{ color: colors.error, fontSize: fonts.body, marginBottom: 8 }}>{error}</Text> : null}
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={ads}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 28) }}
          ListEmptyComponent={<Text style={{ color: colors.textSecondary, fontSize: fonts.body }}>Nenhum anúncio ainda. Crie o primeiro com IA.</Text>}
          renderItem={({ item }) => (
            <View
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: control.radiusSheet,
                padding: 12,
                marginBottom: 8,
                flexDirection: "row",
                gap: 10,
              }}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: colors.text, fontSize: fonts.subtitle, fontWeight: "700" }} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: fonts.caption, marginTop: 4 }} numberOfLines={2}>
                  {item.description}
                </Text>
                {item.hashtags?.length ? (
                  <Text style={{ color: colors.primary, fontSize: fonts.caption, marginTop: 6 }} numberOfLines={1}>
                    {item.hashtags.map(formatHashtag).join(" ")}
                  </Text>
                ) : null}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
                  <View style={{ borderRadius: control.radiusButton, backgroundColor: item.status === "PUBLISHED" ? "#DCFCE7" : "#FFF4E5", paddingHorizontal: 8, paddingVertical: 4 }}>
                    <Text style={{ color: item.status === "PUBLISHED" ? "#166534" : "#B45309", fontSize: fonts.caption, fontWeight: "700" }}>
                      {item.status === "PUBLISHED" ? "Publicado" : "Rascunho"}
                    </Text>
                  </View>
                  {item.product ? <Text style={{ color: colors.textSecondary, fontSize: fonts.caption }}>{item.product}</Text> : null}
                </View>
              </View>
              <Pressable
                onPress={() => setMenuAd(item)}
                hitSlop={10}
                style={{ width: 32, height: 32, borderRadius: control.radiusButton, alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
          )}
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
                  onPress: () => {
                    const id = menuAd.id;
                    router.push({ pathname: "/anuncios/editar", params: { id } });
                  },
                },
                {
                  key: "delete",
                  label: "Excluir",
                  destructive: true,
                  onPress: () => {
                    const target = menuAd;
                    void archive(target);
                  },
                },
              ]
            : []
        }
      />
    </View>
  );
}
