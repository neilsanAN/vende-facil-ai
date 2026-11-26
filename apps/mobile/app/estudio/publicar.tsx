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

function channelReady(info?: ChannelInfo) {
  if (!info) return false;
  if (info.provider === "WHATSAPP") return true;
  return info.status === "CONNECTED";
}

function channelDetail(info?: ChannelInfo, fallback = "") {
  if (!info) return fallback;
  if (info.provider === "WHATSAPP") return "Compartilha o produto completo no WhatsApp";
  if (info.status === "CONNECTED") return info.detail;
  if (info.status === "REQUIRES_AUTH") return "Configure o Meta no servidor";
  return "Toque em Conectar para autorizar a conta";
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

  async function loadChannels() {
    const pubs = await api.publications();
    setChannels(pubs.channels);
    setEnabled((current) => ({
      WHATSAPP: true,
      INSTAGRAM: pubs.channels.find((item) => item.provider === "INSTAGRAM")?.status === "CONNECTED" ? current.INSTAGRAM : false,
      FACEBOOK: pubs.channels.find((item) => item.provider === "FACEBOOK")?.status === "CONNECTED" ? current.FACEBOOK : false,
    }));
  }

  useEffect(() => {
    Promise.all([api.products(), api.publications()])
      .then(([productResult, pubs]) => {
        const rows = ((productResult as { data?: Product[] }).data || []) as Product[];
        setProducts(rows);
        if (rows[0]) setProductId(rows[0].id);
        setChannels(pubs.channels);
        setEnabled({
          WHATSAPP: true,
          INSTAGRAM: false,
          FACEBOOK: false,
        });
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
        const price = product.promoPriceCents ?? product.priceCents;
        const priceLine =
          product.promoPriceCents != null && product.promoPriceCents < product.priceCents
            ? `De ${formatBrl(product.priceCents)} por ${formatBrl(product.promoPriceCents)}`
            : formatBrl(price);
        const draft = [`*${product.name}*`, priceLine, "", product.description?.trim() || "Confira este produto na nossa loja."].join("\n");
        setCaption(draft);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [productId]);

  const selected = useMemo(() => products.find((item) => item.id === productId), [products, productId]);
  const channelMap = useMemo(() => new Map(channels.map((item) => [item.provider, item])), [channels]);

  async function connectMeta() {
    try {
      setBusy(true);
      setError(false);
      setMessage("Abrindo autorização Meta…");
      const result = await api.connectMeta();
      const opened = await Linking.openURL(result.url);
      if (!opened) throw new Error("Não foi possível abrir a autorização.");
      setMessage("Depois de autorizar, volte ao app e toque em Atualizar conexão.");
    } catch (cause) {
      if (handleTenantError(cause)) return;
      setError(true);
      setMessage(cause instanceof ApiClientError ? cause.message : "Não foi possível conectar.");
    } finally {
      setBusy(false);
    }
  }

  async function publishNow() {
    const selectedChannels = (Object.entries(enabled) as Array<[Channel, boolean]>)
      .filter(([, value]) => value)
      .map(([key]) => key);
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
    for (const channel of selectedChannels) {
      if (channel !== "WHATSAPP" && !channelReady(channelMap.get(channel))) {
        setError(true);
        setMessage(`Conecte o ${channel === "FACEBOOK" ? "Facebook" : "Instagram"} antes de publicar.`);
        return;
      }
    }

    setBusy(true);
    setError(false);
    setMessage(schedule ? "Agendando…" : "Publicando…");
    try {
      const scheduledAt = schedule && when ? when.toISOString() : null;
      const notes: string[] = [];
      let lastWhatsapp: string | null = null;

      for (const channel of selectedChannels) {
        const result = await api.publish({
          channel,
          targetType: "PRODUCT",
          targetId: productId,
          caption,
          scheduledAt,
          confirmManual: true,
        });
        if (channel === "WHATSAPP" && result.share?.whatsappUrl) {
          lastWhatsapp = result.share.whatsappUrl;
          const shareText = result.share.caption || caption;
          const canOpen = await Linking.canOpenURL(result.share.whatsappUrl);
          if (canOpen) {
            await Linking.openURL(result.share.whatsappUrl);
          } else {
            await Share.share({ message: shareText, title: selected?.name || "Produto" });
          }
          notes.push("WhatsApp aberto com o produto completo.");
        } else if (channel === "FACEBOOK") {
          notes.push(schedule ? "Facebook agendado." : "Publicado no Facebook.");
        } else if (channel === "INSTAGRAM") {
          notes.push(schedule ? "Instagram agendado." : "Publicado no Instagram.");
        }
      }

      setWhatsappUrl(lastWhatsapp);
      setMessage(
        schedule && when
          ? `Publicação agendada para ${formatScheduleBr(when).compact}.`
          : notes.join(" ") || "Publicação registrada.",
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
          const ready = channelReady(info);
          const needsConnect = item.key !== "WHATSAPP" && !ready;
          return (
            <Card key={item.key} style={{ gap: 10, paddingVertical: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: control.radiusCard, backgroundColor: item.iconBg, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={item.icon} size={control.icon} color={item.iconColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: fonts.subtitle, fontWeight: "700" }}>{item.label}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: fonts.body2, fontWeight: "500", marginTop: 2 }}>
                    {channelDetail(info)}
                  </Text>
                </View>
                {needsConnect ? (
                  <Pressable
                    onPress={() => void connectMeta()}
                    style={{
                      height: 34,
                      borderRadius: 999,
                      paddingHorizontal: 12,
                      backgroundColor: colors.primary,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: "#fff", fontSize: fonts.caption, fontWeight: "700" }}>Conectar</Text>
                  </Pressable>
                ) : (
                  <Toggle
                    label={`Alternar ${item.label}`}
                    value={enabled[item.key]}
                    onChange={(next) => setEnabled((current) => ({ ...current, [item.key]: next }))}
                  />
                )}
              </View>
              {item.key !== "WHATSAPP" && ready ? (
                <Text style={{ color: colors.success, fontSize: fonts.caption, fontWeight: "600", marginLeft: 52 }}>
                  Conta autorizada — publicação direta liberada
                </Text>
              ) : null}
            </Card>
          );
        })}
      </View>

      {channels.some((item) => item.provider !== "WHATSAPP" && item.status !== "CONNECTED") ? (
        <Pressable onPress={() => void loadChannels()} style={{ marginBottom: 12, alignItems: "center" }}>
          <Text style={{ color: colors.primary, fontSize: fonts.body, fontWeight: "700" }}>Atualizar conexão</Text>
        </Pressable>
      ) : null}

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
        <Field label="Legenda do produto" value={caption} onChangeText={setCaption} multiline placeholder="Nome, preço e descrição do produto..." />
      </View>

      {message ? <HelperText error={error}>{message}</HelperText> : null}
      <PrimaryButton label={schedule ? "Agendar" : "Publicar agora"} busy={busy} onPress={() => void publishNow()} />

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
