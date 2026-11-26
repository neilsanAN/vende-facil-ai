import { useEffect, useMemo, useState } from "react";
import { Linking, Modal, Pressable, ScrollView, Share, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatBrl } from "@vendefacil/types";
import { colors, control, fonts } from "@vendefacil/ui-tokens";
import { ApiClientError } from "@vendefacil/api-client";
import { api } from "../../src/api";
import { BackButton } from "../../src/back-button";
import { KeyboardScreen } from "../../src/keyboard-screen";
import { ScheduleCalendarField, formatScheduleBr } from "../../src/schedule-calendar";
import { Toggle } from "../../src/toggle";
import { handleTenantError } from "../../src/session";
import { Card, Field, HelperText, PrimaryButton, ScreenTitle, SelectRow } from "../../src/ui";

type Product = { id: string; name: string };
type Channel = "WHATSAPP" | "INSTAGRAM" | "FACEBOOK";
type ChannelInfo = { provider: string; status: string; detail: string; connectUrl?: string | null };

const SOCIALS: Array<{ key: Channel; label: string; icon: keyof typeof Ionicons.glyphMap; iconBg: string; iconColor: string }> = [
  { key: "WHATSAPP", label: "WhatsApp", icon: "logo-whatsapp", iconBg: "#ECFDF5", iconColor: "#059669" },
  { key: "INSTAGRAM", label: "Instagram", icon: "logo-instagram", iconBg: "#FDF2F8", iconColor: "#DB2777" },
  { key: "FACEBOOK", label: "Facebook", icon: "logo-facebook", iconBg: "#EFF6FF", iconColor: "#2563EB" },
];

function stripLinks(text: string) {
  return text.replace(/https?:\/\/\S+/gi, "").replace(/\n{3,}/g, "\n\n").trim();
}

function buildProductCaption(product: {
  name: string;
  description?: string | null;
  priceCents: number;
  promoPriceCents?: number | null;
}) {
  const promoLine =
    product.promoPriceCents != null && product.promoPriceCents < product.priceCents
      ? `De ${formatBrl(product.priceCents)} por ${formatBrl(product.promoPriceCents)}`
      : formatBrl(product.promoPriceCents ?? product.priceCents);
  return [product.name, promoLine, "", product.description?.trim() || null, "", "Chame no WhatsApp e garanta o seu!"]
    .filter((line) => line !== null)
    .join("\n")
    .trim();
}

export default function PublishScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [caption, setCaption] = useState("");
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [enabled, setEnabled] = useState<Record<Channel, boolean>>({ WHATSAPP: true, INSTAGRAM: false, FACEBOOK: false });
  const [schedule, setSchedule] = useState(false);
  const [when, setWhen] = useState<Date | null>(null);
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.products(), api.publications()])
      .then(([productResult, pubs]) => {
        const rows = ((productResult as { data?: Product[] }).data || []) as Product[];
        setProducts(rows);
        if (rows[0]) setProductId(rows[0].id);
        setChannels(pubs.channels);
        setEnabled({ WHATSAPP: true, INSTAGRAM: false, FACEBOOK: false });
      })
      .catch((cause) => {
        if (handleTenantError(cause)) return;
        setError(true);
        setMessage(cause instanceof ApiClientError ? cause.message : "Falha ao carregar publicação.");
      });
  }, []);

  useEffect(() => {
    if (!productId) return;
    let alive = true;
    api
      .getProduct(productId)
      .then((product) => {
        if (!alive) return;
        setCaption(buildProductCaption(product));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [productId]);

  const selected = useMemo(() => products.find((item) => item.id === productId), [products, productId]);
  const channelMap = useMemo(() => new Map(channels.map((item) => [item.provider, item])), [channels]);

  async function openShare(channel: Channel, text: string, whatsappUrlValue?: string | null) {
    const clean = stripLinks(text);
    if (channel === "WHATSAPP" && whatsappUrlValue) {
      const canOpen = await Linking.canOpenURL(whatsappUrlValue);
      if (canOpen) {
        await Linking.openURL(whatsappUrlValue);
        return;
      }
    }
    await Share.share({
      message: clean,
      title: selected?.name || "Anúncio",
    });
  }

  async function publishNow() {
    const selectedChannels = (Object.entries(enabled) as Array<[Channel, boolean]>).filter(([, value]) => value).map(([key]) => key);
    if (!selectedChannels.length) {
      setError(true);
      setMessage("Ative ao menos um canal.");
      return;
    }
    if (!productId) {
      setError(true);
      setMessage("Escolha um produto.");
      return;
    }
    if (schedule && !when) {
      setError(true);
      setMessage("Escolha a data e o horário no calendário.");
      return;
    }

    setBusy(true);
    setError(false);
    setMessage(schedule ? "Agendando…" : "Preparando anúncio…");
    try {
      const scheduledAt = schedule && when ? when.toISOString() : null;
      const cleanCaption = stripLinks(caption);
      const notes: string[] = [];
      let lastWhatsapp: string | null = null;

      for (const channel of selectedChannels) {
        const result = await api.publish({
          channel,
          targetType: "PRODUCT",
          targetId: productId,
          caption: cleanCaption,
          scheduledAt,
          confirmManual: true,
        });
        const shareText = stripLinks(result.share?.caption || cleanCaption);
        if (channel === "WHATSAPP") {
          lastWhatsapp = result.share?.whatsappUrl || null;
          if (!scheduledAt) await openShare("WHATSAPP", shareText, result.share?.whatsappUrl);
          notes.push("WhatsApp com o anúncio completo.");
        } else if (channel === "INSTAGRAM") {
          if (!scheduledAt) await openShare("INSTAGRAM", shareText);
          notes.push(scheduledAt ? "Instagram agendado." : "Anúncio pronto — escolha o Instagram para publicar.");
        } else if (channel === "FACEBOOK") {
          if (!scheduledAt) await openShare("FACEBOOK", shareText);
          notes.push(scheduledAt ? "Facebook agendado." : "Anúncio pronto — escolha o Facebook para publicar.");
        }
      }

      setWhatsappUrl(lastWhatsapp);
      setMessage(
        schedule && when
          ? `Publicação agendada para ${formatScheduleBr(when).compact}.`
          : notes.join(" ") || "Anúncio pronto para compartilhar.",
      );
    } catch (cause) {
      if (handleTenantError(cause)) return;
      setError(true);
      setMessage(cause instanceof ApiClientError ? cause.message : "Não foi possível publicar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardScreen>
      <BackButton fallback="/estudio" />
      <ScreenTitle>Publicar nas redes</ScreenTitle>

      <View style={{ gap: 10, marginBottom: 12 }}>
        {SOCIALS.map((item) => {
          const info = channelMap.get(item.key);
          return (
            <Card key={item.key} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: control.radiusCard, backgroundColor: item.iconBg, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={item.icon} size={control.icon} color={item.iconColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: fonts.subtitle, fontWeight: "700" }}>{item.label}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: fonts.body2, fontWeight: "500", marginTop: 2 }}>
                  {info?.detail ||
                    (item.key === "WHATSAPP"
                      ? "Anúncio com nome, preço e descrição"
                      : "Compartilha o anúncio no app instalado")}
                </Text>
              </View>
              <Toggle
                label={`Alternar ${item.label}`}
                value={enabled[item.key]}
                onChange={(next) => setEnabled((current) => ({ ...current, [item.key]: next }))}
              />
            </Card>
          );
        })}
      </View>

      <Card style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, marginBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: control.radiusCard, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="calendar-outline" size={control.icon} color={colors.primary} />
          </View>
          <View>
            <Text style={{ color: colors.text, fontSize: fonts.subtitle, fontWeight: "700" }}>Agendar publicação</Text>
            <Text style={{ color: colors.textSecondary, fontSize: fonts.caption, fontWeight: "500", marginTop: 2 }}>
              Calendário com horário de Brasília
            </Text>
          </View>
        </View>
        <Toggle
          label="Agendar publicação"
          value={schedule}
          onChange={(next) => {
            setSchedule(next);
            if (next && !when) setWhen(new Date(Date.now() + 60 * 60 * 1000));
          }}
        />
      </Card>

      {schedule ? (
        <View style={{ marginBottom: 12 }}>
          <ScheduleCalendarField value={when} onChange={setWhen} />
        </View>
      ) : null}

      <View style={{ marginBottom: 10 }}>
        <SelectRow label="Produto" value={selected?.name || "Escolher"} onPress={() => setPicker(true)} />
      </View>

      <View style={{ marginBottom: 14 }}>
        <Field
          label="Anúncio (nome, preço e texto)"
          value={caption}
          onChangeText={(value) => setCaption(stripLinks(value))}
          multiline
          placeholder="Nome&#10;R$ 0,00&#10;&#10;Descrição do produto"
        />
      </View>

      {message ? <HelperText error={error}>{message}</HelperText> : null}
      <PrimaryButton label={schedule ? "Agendar" : "Compartilhar anúncio"} busy={busy} onPress={() => void publishNow()} />

      {whatsappUrl ? (
        <Pressable onPress={() => void Linking.openURL(whatsappUrl)} style={{ marginTop: 12, alignItems: "center" }}>
          <Text style={{ color: colors.primary, fontSize: fonts.body, fontWeight: "700" }}>Abrir de novo no WhatsApp</Text>
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
    </KeyboardScreen>
  );
}
