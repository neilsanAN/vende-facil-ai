import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "@vendefacil/ui-tokens";
import { ApiClientError } from "@vendefacil/api-client";
import { api } from "../../src/api";
import { handleTenantError } from "../../src/session";
import { BackButton } from "../../src/back-button";
import { ActionMenu } from "../../src/action-menu";

type Ad = {
  id: string;
  title: string;
  description: string;
  hashtags: string[];
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

  async function archive(id: string) {
    try {
      await api.archiveAd(id);
      setAds((current) => current.filter((item) => item.id !== id));
    } catch (cause) {
      if (handleTenantError(cause)) return;
      setError(cause instanceof ApiClientError ? cause.message : "Não foi possível excluir.");
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: Math.max(insets.top, 12), paddingHorizontal: 16 }}>
      <BackButton fallback="/inicio" />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <Text style={{ color: colors.text, fontSize: fonts.heading, fontWeight: "700" }}>Anúncios</Text>
        <Pressable
          onPress={() => router.push("/anuncios/novo")}
          style={{ height: 36, borderRadius: 999, backgroundColor: colors.primary, paddingHorizontal: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>Novo</Text>
        </Pressable>
      </View>

      {error ? <Text style={{ color: colors.error, fontSize: fonts.caption, marginBottom: 8 }}>{error}</Text> : null}
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
                borderRadius: 16,
                padding: 12,
                marginBottom: 8,
                flexDirection: "row",
                gap: 10,
              }}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: colors.text, fontSize: fonts.body, fontWeight: "700" }} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: fonts.caption, marginTop: 4 }} numberOfLines={2}>
                  {item.description}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
                  <View style={{ borderRadius: 999, backgroundColor: item.status === "PUBLISHED" ? "#DCFCE7" : "#FFF4E5", paddingHorizontal: 8, paddingVertical: 4 }}>
                    <Text style={{ color: item.status === "PUBLISHED" ? "#166534" : "#B45309", fontSize: 10, fontWeight: "700" }}>
                      {item.status === "PUBLISHED" ? "Publicado" : "Rascunho"}
                    </Text>
                  </View>
                  {item.product ? <Text style={{ color: colors.textSecondary, fontSize: 10 }}>{item.product}</Text> : null}
                </View>
              </View>
              <Pressable
                onPress={() => setMenuAd(item)}
                hitSlop={10}
                style={{ width: 32, height: 32, borderRadius: 999, alignItems: "center", justifyContent: "center" }}
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
        items={[
          {
            key: "edit",
            label: "Editar",
            onPress: () => {
              if (menuAd) router.push({ pathname: "/anuncios/editar", params: { id: menuAd.id } });
            },
          },
          {
            key: "delete",
            label: "Excluir",
            destructive: true,
            onPress: () => {
              if (menuAd) void archive(menuAd.id);
            },
          },
        ]}
      />
    </View>
  );
}
