import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PIPELINE_LABEL, type PipelineStatus } from "@vendefacil/types";
import { colors, fonts } from "@vendefacil/ui-tokens";
import { ApiClientError } from "@vendefacil/api-client";
import { api } from "../../src/api";
import { BackButton } from "../../src/back-button";
import { handleTenantError } from "../../src/session";

type VideoRow = {
  id: string;
  title: string;
  durationSec: number;
  aspectRatio: string;
  updatedAt: string;
  render: { id: string; status: string; progress: number } | null;
};

export default function VideoHistoryScreen() {
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const items = await api.listVideos();
      setRows(items);
      setError("");
    } catch (cause) {
      if (handleTenantError(cause)) return;
      setError(cause instanceof ApiClientError ? cause.message : "Falha ao carregar projetos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: Math.max(insets.top, 12), paddingHorizontal: 16 }}>
      <BackButton fallback="/estudio" />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <Text style={{ color: colors.text, fontSize: fonts.heading, fontWeight: "700" }}>Meus projetos</Text>
        <Pressable
          onPress={() => router.push("/estudio/video/novo")}
          style={{ height: 36, borderRadius: 999, backgroundColor: colors.primary, paddingHorizontal: 14, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>Novo vídeo</Text>
        </Pressable>
      </View>
      {error ? <Text style={{ color: colors.error, marginBottom: 8 }}>{error}</Text> : null}
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 28) }}
          ListEmptyComponent={<Text style={{ color: colors.textSecondary }}>Nenhum vídeo ainda.</Text>}
          renderItem={({ item }) => {
            const render = item.render;
            const label = render?.status ? PIPELINE_LABEL[render.status as PipelineStatus] || render.status : "Rascunho";
            return (
              <Pressable
                onPress={() => router.push(`/estudio/video/${item.id}`)}
                style={{
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  padding: 14,
                  marginBottom: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="videocam-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 13, fontWeight: "700" }} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 3 }}>
                    {item.durationSec}s · {label}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.border} />
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}
