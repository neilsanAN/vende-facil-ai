import { useEffect, useMemo, useState } from "react";
import { Linking, Modal, Pressable, ScrollView, Share, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, control, fonts } from "@vendefacil/ui-tokens";
import { ApiClientError } from "@vendefacil/api-client";
import { api, apiBase } from "../../src/api";
import { BackButton } from "../../src/back-button";
import { Toggle } from "../../src/toggle";
import { handleTenantError } from "../../src/session";
import { Card, Field, HelperText, PrimaryButton, ScreenTitle, SelectRow } from "../../src/ui";

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
  const [error, setError] = useState(false);
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
        setError(true);
        setMessage(cause instanceof ApiClientError ? cause.message : "Falha ao carregar publicação.");
      });
  }, []);

  const selected = useMemo(() => products.find((item) => item.id === productId), [products, productId]);
  const catalogLink = storeLink;

  async function publishNow() {
    const channel = (Object.entries(enabled).find(([, value]) => value)?.[0] as Channel | undefined) || "WHATSAPP";
    if (!enabled[channel]) {
      setError(true);
      setMessage("Ative ao menos um canal.");
      return;
    }
    if (!productId) {
      setError(true);
      setMessage("Escolha um produto.");
      return;
    }
    setBusy(true);
    setError(false);
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
      setError(true);
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
      <ScreenTitle>Publicar nas redes</ScreenTitle>

      <View style={{ gap: 10, marginBottom: 12 }}>
        {SOCIALS.map((item) => (
          <Card key={item.key} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: control.radiusCard, backgroundColor: item.iconBg, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={item.icon} size={control.icon} color={item.iconColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: fonts.subtitle, fontWeight: "700" }}>{item.label}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: fonts.body2, fontWeight: "500", marginTop: 2 }}>{item.detail}</Text>
            </View>
            <Toggle label={`Alternar ${item.label}`} value={enabled[item.key]} onChange={(next) => setEnabled((current) => ({ ...current, [item.key]: next }))} />
          </Card>
        ))}
      </View>

      <Card style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, marginBottom: 10 }}>
        <View style={{ width: 40, height: 40, borderRadius: control.radiusCard, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="link-outline" size={control.icon} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: fonts.subtitle, fontWeight: "700" }}>Link da minha loja</Text>
          <Text style={{ color: colors.textSecondary, fontSize: fonts.body2, fontWeight: "500", marginTop: 2 }} numberOfLines={1}>
            {catalogLink || "Compartilhe seu catálogo online"}
          </Text>
        </View>
        <Pressable
          disabled={!catalogLink}
          onPress={() => {
            if (!catalogLink) return;
            void Share.share({ message: catalogLink });
          }}
          style={{
            width: 40,
            height: 40,
            borderRadius: control.radiusInput,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.background,
            alignItems: "center",
            justifyContent: "center",
            opacity: catalogLink ? 1 : 0.5,
          }}
        >
          <Ionicons name="copy-outline" size={control.icon} color={colors.textSecondary} />
        </Pressable>
      </Card>

      <Card style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, marginBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: control.radiusCard, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="calendar-outline" size={control.icon} color={colors.primary} />
          </View>
          <Text style={{ color: colors.text, fontSize: fonts.subtitle, fontWeight: "700" }}>Agendar publicação</Text>
        </View>
        <Toggle label="Agendar publicação" value={schedule} onChange={setSchedule} />
      </Card>

      {schedule ? (
        <View style={{ marginBottom: 12 }}>
          <Field label="Quando (AAAA-MM-DD HH:mm)" value={when} onChangeText={setWhen} placeholder="2026-11-25 18:00" />
        </View>
      ) : null}

      <View style={{ marginBottom: 10 }}>
        <SelectRow label="Produto" value={selected?.name || "Escolher"} onPress={() => setPicker(true)} />
      </View>

      <View style={{ marginBottom: 14 }}>
        <Field label="Legenda" value={caption} onChangeText={setCaption} multiline placeholder="Escreva algo para compartilhar..." />
      </View>

      {message ? <HelperText error={error}>{message}</HelperText> : null}
      <PrimaryButton label="Publicar agora" busy={busy} onPress={() => void publishNow()} />

      {whatsappUrl ? (
        <Pressable onPress={() => void Linking.openURL(whatsappUrl)} style={{ marginTop: 12, alignItems: "center" }}>
          <Text style={{ color: colors.primary, fontSize: fonts.body, fontWeight: "700" }}>Abrir WhatsApp</Text>
        </Pressable>
      ) : null}

      <Modal visible={picker} transparent animationType="fade" onRequestClose={() => setPicker(false)}>
        <Pressable onPress={() => setPicker(false)} style={{ flex: 1, backgroundColor: "rgba(15,12,30,0.45)", justifyContent: "flex-end" }}>
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: "60%" }}
          >
            <Text style={{ color: colors.text, fontSize: fonts.title, fontWeight: "700", marginBottom: 12 }}>Escolher produto</Text>
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
                  <Text style={{ color: colors.text, fontSize: fonts.title, fontWeight: "600" }}>{item.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}
