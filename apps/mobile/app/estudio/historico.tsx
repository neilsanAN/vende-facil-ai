import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PIPELINE_LABEL, type PipelineStatus } from "@vendefacil/types";
import { colors, control, fonts } from "@vendefacil/ui-tokens";
import { ApiClientError } from "@vendefacil/api-client";
import { api } from "../../src/api";
import { BackButton } from "../../src/back-button";
import { handleTenantError } from "../../src/session";
import { ScreenTitle } from "../../src/ui";

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
        <ScreenTitle style={{ marginBottom: 0 }}>Meus projetos</ScreenTitle>
        <Pressable
          onPress={() => router.push("/estudio/video/novo")}
          style={{ height: control.buttonHeight, borderRadius: control.radiusButton, backgroundColor: colors.primary, paddingHorizontal: 14, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ color: "#fff", fontSize: control.buttonFontSize, fontWeight: "700" }}>Novo vídeo</Text>
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
                  borderRadius: control.radiusSheet,
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
                <View style={{ width: 44, height: 44, borderRadius: control.radiusCard, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="videocam-outline" size={control.icon} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: fonts.subtitle, fontWeight: "700" }} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: fonts.body2, marginTop: 3 }}>
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
