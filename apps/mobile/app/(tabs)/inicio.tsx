import { useCallback, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { Link, router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { dayGreeting, firstName } from "@vendefacil/types";
import { colors, control, fonts } from "@vendefacil/ui-tokens";
import { api, apiBase } from "../../src/api";
import { handleTenantError } from "../../src/session";

type Dash = {
  greeting?: { name?: string };
  stats?: { views?: number; whatsappClicks?: number; orders?: number; salesCents?: number };
  recent?: Array<{
    id: string;
    name: string;
    priceCents: number;
    promoPriceCents?: number | null;
    images?: Array<{ url?: string }>;
  }>;
};

function mediaUrl(path?: string) {
  if (!path) return null;
  return path.startsWith("http") ? path : `${apiBase}${path}`;
}

const actions = [
  { href: "/anuncios/novo", label: "Anúncio com IA", icon: "sparkles-outline" as const },
  { href: "/estudio/video/novo", label: "Vídeo com voz", icon: "videocam-outline" as const },
  { href: "/estudio", label: "Arte para redes", icon: "image-outline" as const },
  { href: "/estudio/publicar", label: "Publicar nas redes", icon: "share-social-outline" as const },
] as const;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<Dash | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api
      .dashboard()
      .then((result) => {
        setData(result as Dash);
        setError("");
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
  return (
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
            Tire uma foto, use a IA e divulgue em todas as suas redes.
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
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
        {[
          { value: String(stats?.views ?? 0), label: "Visualizações", icon: "eye-outline" as const },
          { value: String(stats?.whatsappClicks ?? 0), label: "Cliques", icon: "hand-left-outline" as const },
          { value: String(stats?.orders ?? 0), label: "Pedidos", icon: "cart-outline" as const },
          {
            value: ((stats?.salesCents ?? 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
            label: "Vendas",
            icon: "cash-outline" as const,
          },
        ].map((item) => (
          <View key={item.label} style={{ width: "48%", backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10 }}>
            <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
              <Ionicons name={item.icon} size={12} color={colors.primary} />
            </View>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>{item.value}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 9 }}>{item.label}</Text>
          </View>
        ))}
      </View>
      {error ? <Text style={{ color: colors.error, fontSize: fonts.caption, marginTop: 8 }}>{error}</Text> : null}

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16, marginBottom: 8 }}>
        <Text style={{ color: colors.text, fontSize: fonts.subtitle, fontWeight: "700" }}>Produtos recentes</Text>
        <Link href="/produtos" asChild>
          <Pressable hitSlop={12} accessibilityRole="button" accessibilityLabel="Ver todos os produtos">
            <Text style={{ color: colors.primary, fontSize: fonts.caption, fontWeight: "700" }}>Ver todos</Text>
          </Pressable>
        </Link>
      </View>
      {(data?.recent || []).length === 0 ? (
        <Pressable
          onPress={() => router.push("/produtos/novo")}
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
          <Ionicons name="cube-outline" size={22} color={colors.primary} />
          <Text style={{ color: colors.text, fontSize: fonts.body, fontWeight: "700", marginTop: 8 }}>Nenhum produto ainda</Text>
          <Text style={{ color: colors.textSecondary, fontSize: fonts.caption, marginTop: 4, textAlign: "center" }}>
            Cadastre o primeiro para aparecer aqui.
          </Text>
        </Pressable>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 8 }}>
          {(data?.recent || []).map((product) => {
            const imageUrl = mediaUrl(product.images?.[0]?.url);
            return (
              <Pressable
                key={product.id}
                onPress={() => router.push(`/produtos/${product.id}`)}
                style={{
                  width: 108,
                  height: 108,
                  marginRight: 10,
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
                    <Ionicons name="image-outline" size={22} color={colors.primary} />
                    <Text style={{ color: colors.textSecondary, fontSize: fonts.tiny, fontWeight: "600", marginTop: 6, textAlign: "center" }} numberOfLines={2}>
                      {product.name}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </ScrollView>
  );
}
