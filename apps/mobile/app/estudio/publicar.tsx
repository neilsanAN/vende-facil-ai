import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, Share, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, control, fonts } from "@vendefacil/ui-tokens";
import { ApiClientError } from "@vendefacil/api-client";
import { api, apiBase } from "../../src/api";
import { BackButton } from "../../src/back-button";
import { Toggle } from "../../src/toggle";
import { handleTenantError } from "../../src/session";

type Product = { id: string; name: string };
type Channel = "WHATSAPP" | "INSTAGRAM" | "FACEBOOK";

const SOCIALS: Array<{ key: Channel; label: string; detail: string; icon: keyof typeof Ionicons.glyphMap; iconBg: string; iconColor: string }> = [
  { key: "WHATSAPP", label: "WhatsApp", detail: "Compartilhar no WhatsApp", icon: "logo-whatsapp", iconBg: "#ECFDF5", iconColor: "#059669" },
  { key: "INSTAGRAM", label: "Instagram", detail: "Publicar no Instagram (Feed ou Stories)", icon: "logo-instagram", iconBg: "#FDF2F8", iconColor: "#DB2777" },
  { key: "FACEBOOK", label: "Facebook", detail: "Publicar no Facebook (Página)", icon: "logo-facebook", iconBg: "#EFF6FF", iconColor: "#2563EB" },
];

export default function PublishScreen() {
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [caption, setCaption] = useState("");
  const [storeLink, setStoreLink] = useState("");
  const [enabled, setEnabled] = useState<Record<Channel, boolean>>({ WHATSAPP: true, INSTAGRAM: true, FACEBOOK: true });
  const [schedule, setSchedule] = useState(false);
  const [when, setWhen] = useState("");
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.products(), api.publications(), api.shell().catch(() => null)])
      .then(([productResult, pubs, shell]) => {
        const rows = ((productResult as { data?: Product[] }).data || []) as Product[];
        setProducts(rows);
        if (rows[0]) setProductId(rows[0].id);
        const slug = shell?.store?.slug;
        setStoreLink(slug ? `${apiBase}/v/${slug}` : "");
        const ig = pubs.channels.find((item) => item.provider === "INSTAGRAM");
        const fb = pubs.channels.find((item) => item.provider === "FACEBOOK");
        setEnabled({
          WHATSAPP: true,
          INSTAGRAM: ig?.status !== "REQUIRES_AUTH",
          FACEBOOK: fb?.status === "CONNECTED",
        });
      })
      .catch((cause) => {
        if (handleTenantError(cause)) return;
        setMessage(cause instanceof ApiClientError ? cause.message : "Falha ao carregar publicação.");
      });
  }, []);

  const selected = useMemo(() => products.find((item) => item.id === productId), [products, productId]);
  const catalogLink = storeLink;

  async function publishNow() {
    const channel = (Object.entries(enabled).find(([, value]) => value)?.[0] as Channel | undefined) || "WHATSAPP";
    if (!enabled[channel]) {
      setMessage("Ative ao menos um canal.");
      return;
    }
    if (!productId) {
      setMessage("Escolha um produto.");
      return;
    }
    setBusy(true);
    setMessage("Publicando…");
    try {
      const scheduledAt = schedule && when.trim() ? new Date(when.replace(" ", "T")).toISOString() : null;
      const result = await api.publish({
        channel,
        targetType: "PRODUCT",
        targetId: productId,
        caption,
        scheduledAt,
        confirmManual: true,
      });
      if (result.share?.link) setStoreLink(result.share.link);
      setWhatsappUrl(result.share?.whatsappUrl || null);
      setMessage(schedule ? "Publicação agendada." : "Publicação registrada.");
      if (result.share?.whatsappUrl && channel === "WHATSAPP" && !schedule) {
        await Linking.openURL(result.share.whatsappUrl);
      }
    } catch (cause) {
      if (handleTenantError(cause)) return;
      setMessage(cause instanceof ApiClientError ? cause.message : "Não foi possível publicar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: Math.max(insets.top, 12), paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 28) }}
      keyboardShouldPersistTaps="handled"
    >
      <BackButton fallback="/estudio" />
      <Text style={{ color: colors.text, fontSize: fonts.heading, fontWeight: "700", marginBottom: 16 }}>Publicar nas redes</Text>

      <View style={{ gap: 10, marginBottom: 12 }}>
        {SOCIALS.map((item) => (
          <View
            key={item.key}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              paddingHorizontal: 14,
              paddingVertical: 14,
            }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: item.iconBg, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={item.icon} size={18} color={item.iconColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: "700" }}>{item.label}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: "500", marginTop: 2 }}>{item.detail}</Text>
            </View>
            <Toggle
              label={`Alternar ${item.label}`}
              value={enabled[item.key]}
              onChange={(next) => setEnabled((current) => ({ ...current, [item.key]: next }))}
            />
          </View>
        ))}
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          paddingHorizontal: 14,
          paddingVertical: 14,
          marginBottom: 10,
        }}
      >
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="link-outline" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 13, fontWeight: "700" }}>Link da minha loja</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: "500", marginTop: 2 }} numberOfLines={1}>
            {catalogLink || "Compartilhe seu catálogo online"}
          </Text>
        </View>
        <Pressable
          disabled={!catalogLink}
          onPress={() => {
            if (!catalogLink) return;
            void Share.share({ message: catalogLink });
          }}
          style={{ width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", opacity: catalogLink ? 1 : 0.5 }}
        >
          <Ionicons name="copy-outline" size={16} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderRadius: 18,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          paddingHorizontal: 14,
          paddingVertical: 14,
          marginBottom: 12,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
          </View>
          <Text style={{ color: colors.text, fontSize: 13, fontWeight: "700" }}>Agendar publicação</Text>
        </View>
        <Toggle label="Agendar publicação" value={schedule} onChange={setSchedule} />
      </View>

      {schedule ? (
        <View style={{ borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 12, marginBottom: 12 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 11, marginBottom: 6 }}>Quando (AAAA-MM-DD HH:mm)</Text>
          <TextInput
            value={when}
            onChangeText={setWhen}
            placeholder="2026-11-25 18:00"
            placeholderTextColor="#9A96AB"
            style={{ color: colors.text, fontSize: 13, fontWeight: "600", minHeight: 28 }}
          />
        </View>
      ) : null}

      <Pressable
        onPress={() => setPicker(true)}
        style={{
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          paddingHorizontal: 14,
          paddingVertical: 12,
          marginBottom: 10,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View>
          <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Produto</Text>
          <Text style={{ color: colors.text, fontSize: 13, fontWeight: "700", marginTop: 2 }}>{selected?.name || "Escolher"}</Text>
        </View>
        <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
      </Pressable>

      <View style={{ borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 11, marginBottom: 4 }}>Legenda</Text>
        <TextInput
          value={caption}
          onChangeText={setCaption}
          placeholder="Escreva algo para compartilhar..."
          placeholderTextColor="#9A96AB"
          multiline
          textAlignVertical="top"
          style={{ color: colors.text, fontSize: 13, minHeight: 72 }}
        />
      </View>

      {message ? <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 10 }}>{message}</Text> : null}

      <Pressable
        disabled={busy}
        onPress={() => void publishNow()}
        style={{
          height: control.height,
          borderRadius: 999,
          backgroundColor: colors.primary,
          alignItems: "center",
          justifyContent: "center",
          opacity: busy ? 0.7 : 1,
        }}
      >
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>Publicar agora</Text>}
      </Pressable>

      {whatsappUrl ? (
        <Pressable onPress={() => void Linking.openURL(whatsappUrl)} style={{ marginTop: 12, alignItems: "center" }}>
          <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "700" }}>Abrir WhatsApp</Text>
        </Pressable>
      ) : null}

      <Modal visible={picker} transparent animationType="fade" onRequestClose={() => setPicker(false)}>
        <Pressable onPress={() => setPicker(false)} style={{ flex: 1, backgroundColor: "rgba(15,12,30,0.45)", justifyContent: "flex-end" }}>
          <Pressable onPress={(event) => event.stopPropagation()} style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: "60%" }}>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700", marginBottom: 12 }}>Escolher produto</Text>
            <ScrollView>
              {products.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    setProductId(item.id);
                    setPicker(false);
                  }}
                  style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}
                >
                  <Text style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}>{item.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}
