import { useCallback, useMemo, useState } from "react";
import { FlatList, Image, Pressable, Text, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, control, fonts } from "@vendefacil/ui-tokens";
import { ApiClientError } from "@vendefacil/api-client";
import { api, apiBase } from "../../src/api";
import { handleTenantError } from "../../src/session";
import { ActionMenu } from "../../src/action-menu";
import { ConfirmSheet, useFeedback } from "../../src/feedback";

function mediaUrl(path?: string) {
  if (!path) return null;
  return path.startsWith("http") ? path : `${apiBase}${path}`;
}

type Product = {
  id: string;
  name: string;
  priceCents: number;
  promoPriceCents?: number | null;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  published?: boolean;
  images?: Array<{ url: string }>;
};

type Filter = "ALL" | "ACTIVE" | "DRAFT";

export default function ProductsScreen() {
  const feedback = useFeedback();
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [error, setError] = useState("");
  const [menuProduct, setMenuProduct] = useState<Product | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await api.products();
      const payload = result as { data?: Product[] };
      setProducts(payload.data || []);
      setError("");
    } catch (cause) {
      if (handleTenantError(cause)) return;
      setError(cause instanceof ApiClientError ? cause.message : "Falha ao carregar.");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const counts = useMemo(
    () => ({
      ALL: products.length,
      ACTIVE: products.filter((item) => item.status === "ACTIVE").length,
      DRAFT: products.filter((item) => item.status === "DRAFT").length,
    }),
    [products],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return products.filter((item) => {
      if (filter === "ACTIVE" && item.status !== "ACTIVE") return false;
      if (filter === "DRAFT" && item.status !== "DRAFT") return false;
      if (!needle) return true;
      return item.name.toLowerCase().includes(needle);
    });
  }, [products, filter, q]);

  const tabs: Array<{ key: Filter; label: string; count: number }> = [
    { key: "ALL", label: "Todos", count: counts.ALL },
    { key: "ACTIVE", label: "Ativos", count: counts.ACTIVE },
    { key: "DRAFT", label: "Rascunhos", count: counts.DRAFT },
  ];

  async function archive(id: string) {
    try {
      await feedback.run("Excluindo produto…", async () => {
        await api.archiveProduct(id);
      });
      setProducts((current) => current.filter((item) => item.id !== id));
      feedback.showToast("Produto excluído.", "success");
    } catch (cause) {
      if (handleTenantError(cause)) return;
      const text = cause instanceof ApiClientError ? cause.message : "Não foi possível excluir.";
      setError(text);
      feedback.showToast(text, "error");
    }
  }

  async function duplicate(id: string) {
    try {
      await feedback.run("Duplicando…", async () => {
        await api.duplicateProduct(id);
        await load();
      });
      feedback.showToast("Produto duplicado.", "success");
    } catch (cause) {
      if (handleTenantError(cause)) return;
      const text = cause instanceof ApiClientError ? cause.message : "Não foi possível duplicar.";
      setError(text);
      feedback.showToast(text, "error");
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: 16 }}>
      <Text style={{ color: colors.text, fontSize: fonts.heading, fontWeight: "700", marginBottom: 12 }}>Produtos</Text>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Buscar produto..."
          placeholderTextColor={colors.textSecondary}
          style={{
            flex: 1,
            height: control.height,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: control.radiusInput,
            backgroundColor: "#F3F4F8",
            color: colors.text,
            paddingHorizontal: control.paddingH,
            fontSize: control.fontSize,
          }}
        />
        <View style={{ width: 40, height: 40, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="options-outline" size={16} color={colors.text} />
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        {tabs.map((tab) => {
          const active = filter === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setFilter(tab.key)}
              style={{
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: active ? colors.primary : colors.surface,
                borderWidth: active ? 0 : 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ color: active ? "#fff" : colors.textSecondary, fontSize: fonts.caption, fontWeight: "600" }}>
                {tab.label} ({tab.count})
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={{ color: colors.error, fontSize: fonts.caption, marginBottom: 8 }}>{error}</Text> : null}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 88 }}
        ListEmptyComponent={error ? null : <Text style={{ color: colors.textSecondary, fontSize: fonts.body }}>Nenhum produto neste filtro.</Text>}
        renderItem={({ item }) => {
          const imageUrl = mediaUrl(item.images?.[0]?.url);
          const price = ((item.promoPriceCents ?? item.priceCents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
          return (
            <View
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 16,
                padding: 12,
                marginBottom: 10,
                flexDirection: "row",
                gap: 12,
                alignItems: "center",
              }}
            >
              <View style={{ width: 92, height: 92, borderRadius: 16, overflow: "hidden", backgroundColor: "#F3F4F8", borderWidth: 1, borderColor: colors.border }}>
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                ) : (
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="cube-outline" size={26} color={colors.textSecondary} />
                  </View>
                )}
                {(item.images?.length || 0) > 1 ? (
                  <View
                    style={{
                      position: "absolute",
                      right: 6,
                      bottom: 6,
                      borderRadius: 999,
                      backgroundColor: "rgba(23,24,39,0.72)",
                      paddingHorizontal: 7,
                      paddingVertical: 3,
                    }}
                  >
                    <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700" }}>{item.images?.length} fotos</Text>
                  </View>
                ) : null}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: colors.text, fontSize: fonts.subtitle, fontWeight: "700" }} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={{ color: colors.text, fontSize: fonts.subtitle, fontWeight: "700", marginTop: 2 }}>{price}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
                  <View style={{ borderRadius: control.radiusButton, backgroundColor: item.status === "ACTIVE" ? "#DCFCE7" : "#FFF4E5", paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ color: item.status === "ACTIVE" ? "#166534" : "#B45309", fontSize: fonts.caption, fontWeight: "700" }}>
                      {item.status === "ACTIVE" ? "Ativo" : item.status === "DRAFT" ? "Rascunho" : "Arquivo"}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                    <Ionicons name="eye-outline" size={12} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, fontSize: fonts.caption }}>0</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                    <Ionicons name="cart-outline" size={12} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, fontSize: fonts.caption }}>0</Text>
                  </View>
                </View>
              </View>
              <Pressable onPress={() => setMenuProduct(item)} hitSlop={10} style={{ width: 28, height: 28, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
          );
        }}
      />

      <Pressable
        onPress={() => router.push("/produtos/novo")}
        style={{
          position: "absolute",
          right: 16,
          bottom: 16,
          height: control.buttonHeight,
          borderRadius: control.radiusButton,
          backgroundColor: colors.primary,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          shadowColor: "#5B3DF0",
          shadowOpacity: 0.25,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 6 },
          elevation: 5,
        }}
      >
        <Ionicons name="add" size={control.icon} color="#fff" />
        <Text style={{ color: "#fff", fontSize: control.buttonFontSize, fontWeight: "700" }}>Novo produto</Text>
      </Pressable>

      <ActionMenu
        open={Boolean(menuProduct)}
        title={menuProduct?.name}
        onClose={() => setMenuProduct(null)}
        items={
          menuProduct
            ? [
                {
                  key: "edit",
                  label: "Editar",
                  onPress: () => router.push(`/produtos/${menuProduct.id}`),
                },
                {
                  key: "duplicate",
                  label: "Duplicar",
                  onPress: () => void duplicate(menuProduct.id),
                },
                {
                  key: "delete",
                  label: "Excluir",
                  destructive: true,
                  onPress: () => setConfirmDelete(menuProduct),
                },
              ]
            : []
        }
      />

      <ConfirmSheet
        open={Boolean(confirmDelete)}
        title="Excluir este produto?"
        message="Ele sai da vitrine e da lista de ativos."
        confirmLabel="Excluir"
        destructive
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) void archive(confirmDelete.id);
        }}
      />
    </View>
  );
}
