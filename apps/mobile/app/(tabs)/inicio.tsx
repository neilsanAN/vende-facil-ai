import { useCallback, useState } from "react";
import { Image, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Link, router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { dayGreeting, firstName } from "@vendefacil/types";
import { colors, control, fonts } from "@vendefacil/ui-tokens";
import { api, apiBase } from "../../src/api";
import { handleTenantError } from "../../src/session";
import { getItem } from "../../src/storage";
import { SheetHandle } from "../../src/feedback";

type RecentAd = {
  id: string;
  title: string;
  aiCategory: string;
  coverUrl?: string | null;
  status?: string;
  updatedAt?: string;
};

type RankedProduct = {
  id: string;
  name: string;
  priceCents?: number;
  coverUrl?: string | null;
};

type StatsDetailItem = {
  product: RankedProduct | null;
  count: number;
};

type Dash = {
  greeting?: { name?: string };
  stats?: {
    views?: number;
    productViews?: number;
    whatsappClicks?: number;
    orders?: number;
    salesCents?: number;
    top?: Array<{ product: RankedProduct | null; views: number }>;
    topClicks?: Array<{ product: RankedProduct | null; clicks: number }>;
  };
  recentAdsGrouped?: Array<{
    category: string;
    items: RecentAd[];
  }>;
};

function mediaUrl(path?: string | null) {
  if (!path) return null;
  return path.startsWith("http") ? path : `${apiBase}${path}`;
}

const actions = [
  { href: "/estudio/video/novo", label: "Vídeo com voz", icon: "videocam-outline" as const },
  { href: "/estudio", label: "Arte para redes", icon: "image-outline" as const },
  { href: "/estudio/publicar", label: "Publicar nas redes", icon: "share-social-outline" as const },
] as const;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<Dash | null>(null);
  const [covers, setCovers] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<"views" | "clicks" | null>(null);

  const load = useCallback(() => {
    api
      .dashboard()
      .then(async (result) => {
        const dash = result as Dash;
        setData(dash);
        setError("");
        const ids = (dash.recentAdsGrouped || []).flatMap((group) => group.items.map((item) => item.id));
        const next: Record<string, string> = {};
        await Promise.all(
          ids.map(async (id) => {
            const local = await getItem(`ad_cover_${id}`);
            if (local) next[id] = local;
          }),
        );
        setCovers(next);
      })
      .catch((cause: unknown) => {
        if (handleTenantError(cause)) return;
        setError(cause instanceof Error ? cause.message : "Falha ao carregar.");
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  const first = firstName(data?.greeting?.name);
  const hello = dayGreeting();
  const stats = data?.stats;
  const groups = data?.recentAdsGrouped || [];
  const detailTitle = detail === "views" ? "Produtos visualizados" : detail === "clicks" ? "Produtos com clique" : "";
  const detailItems: StatsDetailItem[] =
    detail === "views"
      ? (stats?.top || []).map((item) => ({ product: item.product, count: item.views }))
      : detail === "clicks"
        ? (stats?.topClicks || []).map((item) => ({ product: item.product, count: item.clicks }))
        : [];
  const detailMetric = detail === "views" ? "visualizações" : "cliques";
  return (
    <>
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: Math.max(insets.top, 10), paddingHorizontal: 16, paddingBottom: 24 }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>{first.slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>
            {hello}, {first}!
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 1 }}>Pronto para vender hoje?</Text>
        </View>
        <View style={{ width: 34, height: 34, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="notifications-outline" size={16} color={colors.textSecondary} />
        </View>
      </View>

      <Pressable
        onPress={() => router.push("/anuncios/novo")}
        style={{
          marginTop: 12,
          borderRadius: 16,
          paddingVertical: 12,
          paddingHorizontal: 14,
          backgroundColor: colors.primary,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={{ color: "white", fontSize: 14, fontWeight: "700" }}>Crie seu próximo anúncio</Text>
          <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 10, marginTop: 4, lineHeight: 13 }}>
            Tire uma foto, a IA identifica o produto e monta o anúncio.
          </Text>
        </View>
        <View style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="camera-outline" size={18} color="#fff" />
        </View>
      </Pressable>

      <View style={{ flexDirection: "row", gap: 6, marginTop: 10 }}>
        {actions.map((action) => (
          <Pressable
            key={action.label}
            onPress={() => router.push(action.href)}
            style={{
              flex: 1,
              alignItems: "center",
              gap: 5,
              backgroundColor: "#F7F4FF",
              borderWidth: 1,
              borderColor: "#EFEAFF",
              borderRadius: 12,
              paddingVertical: 8,
              paddingHorizontal: 2,
            }}
          >
            <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={action.icon} size={15} color={colors.primary} />
            </View>
            <Text style={{ color: colors.text, fontSize: 9, fontWeight: "600", textAlign: "center", lineHeight: 11 }}>{action.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 16 }}>
        <Text style={{ color: colors.text, fontSize: fonts.subtitle, fontWeight: "700" }}>Resultados (7 dias)</Text>
        <Link href="/estatisticas" asChild>
          <Pressable hitSlop={12}>
            <Text style={{ color: colors.primary, fontSize: fonts.caption, fontWeight: "700" }}>Ver tudo</Text>
          </Pressable>
        </Link>
      </View>
      <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
        {(
          [
            { key: "views" as const, value: String(stats?.views ?? 0), label: "Visualizações", icon: "eye-outline" as const },
            { key: "clicks" as const, value: String(stats?.whatsappClicks ?? 0), label: "Cliques", icon: "hand-left-outline" as const },
          ] as const
        ).map((item) => (
          <Pressable
            key={item.label}
            onPress={() => setDetail(item.key)}
            style={{ flex: 1, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10 }}
          >
            <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
              <Ionicons name={item.icon} size={12} color={colors.primary} />
            </View>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>{item.value}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 9 }}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
      {error ? <Text style={{ color: colors.error, fontSize: fonts.caption, marginTop: 8 }}>{error}</Text> : null}

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16, marginBottom: 8 }}>
        <Text style={{ color: colors.text, fontSize: fonts.subtitle, fontWeight: "700" }}>Anúncios recentes</Text>
        <Link href="/produtos" asChild>
          <Pressable hitSlop={12} accessibilityRole="button" accessibilityLabel="Ver todos os anúncios">
            <Text style={{ color: colors.primary, fontSize: fonts.caption, fontWeight: "700" }}>Ver todos</Text>
          </Pressable>
        </Link>
      </View>

      {groups.length === 0 ? (
        <Pressable
          onPress={() => router.push("/anuncios/novo")}
          style={{
            borderRadius: control.radiusSheet,
            borderWidth: 1,
            borderStyle: "dashed",
            borderColor: colors.border,
            backgroundColor: colors.surface,
            paddingVertical: 18,
            paddingHorizontal: 14,
            alignItems: "center",
          }}
        >
          <Ionicons name="sparkles-outline" size={22} color={colors.primary} />
          <Text style={{ color: colors.text, fontSize: fonts.body, fontWeight: "700", marginTop: 8 }}>Nenhum anúncio ainda</Text>
          <Text style={{ color: colors.textSecondary, fontSize: fonts.caption, marginTop: 4, textAlign: "center" }}>
            Crie o primeiro com IA para aparecer aqui, agrupado por categoria.
          </Text>
        </Pressable>
      ) : (
        groups.map((group) => (
          <View key={group.category} style={{ marginBottom: 14 }}>
            <Text style={{ color: colors.textSecondary, fontSize: fonts.caption, fontWeight: "700", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.4 }}>
              {group.category}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 8 }}>
              {group.items.map((ad) => {
                const imageUrl = covers[ad.id] || mediaUrl(ad.coverUrl);
                return (
                  <Pressable
                    key={ad.id}
                    onPress={() => router.push({ pathname: "/anuncios/editar", params: { id: ad.id } })}
                    style={{
                      width: 108,
                      marginRight: 10,
                    }}
                  >
                    <View
                      style={{
                        width: 108,
                        height: 108,
                        borderRadius: 12,
                        overflow: "hidden",
                        backgroundColor: colors.primarySoft,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      {imageUrl ? (
                        <Image source={{ uri: imageUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                      ) : (
                        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 8 }}>
                          <Ionicons name="sparkles-outline" size={22} color={colors.primary} />
                        </View>
                      )}
                    </View>
                    <Text style={{ color: colors.text, fontSize: fonts.caption, fontWeight: "600", marginTop: 6 }} numberOfLines={2}>
                      {ad.title}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ))
      )}
    </ScrollView>

    <Modal visible={Boolean(detail)} transparent animationType="fade" onRequestClose={() => setDetail(null)}>
      <Pressable onPress={() => setDetail(null)} style={{ flex: 1, backgroundColor: "rgba(15,12,30,0.45)", justifyContent: "flex-end" }}>
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={{
            maxHeight: "72%",
            marginHorizontal: 12,
            marginBottom: Math.max(insets.bottom, 16),
            borderRadius: 20,
            backgroundColor: colors.surface,
            overflow: "hidden",
            paddingBottom: 8,
          }}
        >
          <SheetHandle />
          <Text style={{ color: colors.text, fontSize: fonts.title, fontWeight: "700", textAlign: "center", paddingHorizontal: 20 }}>
            {detailTitle}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: fonts.caption, textAlign: "center", marginTop: 4, marginBottom: 10 }}>
            Últimos 7 dias
          </Text>
          <ScrollView style={{ paddingHorizontal: 14 }} contentContainerStyle={{ paddingBottom: 12 }}>
            {detailItems.length === 0 ? (
              <View style={{ paddingVertical: 28, alignItems: "center" }}>
                <Ionicons name={detail === "views" ? "eye-outline" : "hand-left-outline"} size={22} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, fontSize: fonts.body, marginTop: 8, textAlign: "center" }}>
                  Ainda não há {detailMetric} por produto neste período.
                </Text>
              </View>
            ) : (
              detailItems.map((item, index) => {
                const cover = mediaUrl(item.product?.coverUrl);
                const key = item.product?.id || `row-${index}`;
                return (
                  <View
                    key={key}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      paddingVertical: 10,
                      borderBottomWidth: index === detailItems.length - 1 ? 0 : 1,
                      borderBottomColor: colors.border,
                    }}
                  >
                    <View style={{ width: 44, height: 44, borderRadius: 10, overflow: "hidden", backgroundColor: colors.primarySoft }}>
                      {cover ? (
                        <Image source={{ uri: cover }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                      ) : (
                        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                          <Ionicons name="cube-outline" size={18} color={colors.primary} />
                        </View>
                      )}
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ color: colors.text, fontSize: fonts.body, fontWeight: "700" }} numberOfLines={1}>
                        {item.product?.name || "Produto removido"}
                      </Text>
                      <Text style={{ color: colors.textSecondary, fontSize: fonts.caption, marginTop: 2 }}>
                        {item.count} {detailMetric}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
          <Pressable onPress={() => setDetail(null)} style={{ paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.border }}>
            <Text style={{ color: colors.textSecondary, fontSize: fonts.body, fontWeight: "600", textAlign: "center" }}>Fechar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
    </>
  );
}
