import { useEffect, useMemo, useRef, useState } from "react";
import { AppState, Image, Linking, Modal, Pressable, ScrollView, Share, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, control, fonts } from "@vendefacil/ui-tokens";
import { ApiClientError } from "@vendefacil/api-client";
import { api, apiBase } from "../../src/api";
import { BackButton } from "../../src/back-button";
import { KeyboardScreen } from "../../src/keyboard-screen";
import { ScheduleCalendarField, formatScheduleBr } from "../../src/schedule-calendar";
import { Toggle } from "../../src/toggle";
import { handleTenantError } from "../../src/session";
import { Card, Field, HelperText, PrimaryButton, ScreenTitle } from "../../src/ui";
import { getItem } from "../../src/storage";
import { buildAdCaption, isGenericPlaceholderAd, polishShareCaption, shareAdToChannel } from "../../src/share-ad";

type Ad = {
  id: string;
  title: string;
  description: string;
  hashtags: string[];
  coverUrl?: string | null;
  images: string[];
  kind: "AD";
};
type ProductItem = {
  id: string;
  title: string;
  description: string;
  hashtags: string[];
  coverUrl?: string | null;
  images: string[];
  kind: "PRODUCT";
  priceLabel?: string;
};
type ShareItem = Ad | ProductItem;
type Channel = "WHATSAPP" | "INSTAGRAM" | "FACEBOOK";
type ChannelInfo = { provider: string; status: string; detail: string; connectUrl?: string | null };

const SOCIALS: Array<{ key: Channel; label: string; icon: keyof typeof Ionicons.glyphMap; iconBg: string; iconColor: string }> = [
  { key: "WHATSAPP", label: "WhatsApp", icon: "logo-whatsapp", iconBg: "#ECFDF5", iconColor: "#059669" },
  { key: "INSTAGRAM", label: "Instagram", icon: "logo-instagram", iconBg: "#FDF2F8", iconColor: "#DB2777" },
  { key: "FACEBOOK", label: "Facebook", icon: "logo-facebook", iconBg: "#EFF6FF", iconColor: "#2563EB" },
];

const META_HELP =
  "Na Meta → Configurações → Básico, use exclusão: https://vende-facil-ai.onrender.com/data-deletion (com https). Se ainda recusar, mude o tipo para “URL de retorno de exclusão de dados” e cole: https://vende-facil-ai.onrender.com/api/integrations/facebook/data-deletion. Antes de salvar, abra a URL no Chrome para “acordar” o Render. Funções: adicione sua conta como Testadora. Login do Facebook → callback: https://vende-facil-ai.onrender.com/api/integrations/facebook/callback";

function mediaUrl(path?: string | null) {
  if (!path) return null;
  return path.startsWith("http") || path.startsWith("file:") || path.startsWith("content:") ? path : `${apiBase}${path}`;
}

function channelConnected(info?: ChannelInfo) {
  return info?.status === "CONNECTED";
}

function itemKey(item: ShareItem) {
  return `${item.kind}:${item.id}`;
}

function formatBrl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function PublishScreen() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [enabled, setEnabled] = useState<Record<Channel, boolean>>({ WHATSAPP: true, INSTAGRAM: false, FACEBOOK: false });
  const [schedule, setSchedule] = useState(false);
  const [when, setWhen] = useState<Date | null>(null);
  const [picker, setPicker] = useState(false);
  const [pickerTab, setPickerTab] = useState<"AD" | "PRODUCT">("AD");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [showMetaHelp, setShowMetaHelp] = useState(false);
  const params = useLocalSearchParams<{ meta?: string }>();
  const waitingMeta = useRef(false);

  const catalog = useMemo(() => [...ads, ...products], [ads, products]);
  const selectedItems = useMemo(
    () => catalog.filter((item) => selectedKeys.includes(itemKey(item))),
    [catalog, selectedKeys],
  );
  const primary = selectedItems[0] || null;
  const channelMap = useMemo(() => new Map(channels.map((item) => [item.provider, item])), [channels]);

  async function loadChannels() {
    const pubs = await api.publications();
    setChannels(pubs.channels);
    const ig = pubs.channels.find((item) => item.provider === "INSTAGRAM")?.status === "CONNECTED";
    const fb = pubs.channels.find((item) => item.provider === "FACEBOOK")?.status === "CONNECTED";
    setEnabled((current) => ({ ...current, INSTAGRAM: current.INSTAGRAM || ig, FACEBOOK: current.FACEBOOK || fb }));
    return { ig, fb };
  }

  useEffect(() => {
    if (!params.meta) return;
    void loadChannels()
      .then(({ ig, fb }) => {
        setError(params.meta !== "ok" || (!ig && !fb));
        setMessage(
          params.meta === "ok" && (ig || fb)
            ? `Conectado: ${[fb ? "Facebook" : null, ig ? "Instagram" : null].filter(Boolean).join(" e ")}.`
            : "A autorização Meta não foi concluída.",
        );
        if (params.meta !== "ok") setShowMetaHelp(true);
      })
      .catch(() => undefined);
  }, [params.meta]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active" || !waitingMeta.current) return;
      waitingMeta.current = false;
      void loadChannels()
        .then(({ ig, fb }) => {
          if (ig || fb) {
            setError(false);
            setShowMetaHelp(false);
            setMessage(`Conectado: ${[fb ? "Facebook" : null, ig ? "Instagram" : null].filter(Boolean).join(" e ")}.`);
          } else {
            setShowMetaHelp(true);
            setError(true);
            setMessage("Ainda sem conexão Meta. Confira o checklist abaixo.");
          }
        })
        .catch(() => undefined);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    Promise.all([api.listAds(), api.products(), api.publications()])
      .then(async ([adRows, productPayload, pubs]) => {
        const usableAds = adRows.filter((row) => !isGenericPlaceholderAd(row));
        const withCovers: Ad[] = await Promise.all(
          usableAds.map(async (row) => {
            let localImages: string[] = [];
            try {
              const raw = await getItem(`ad_images_${row.id}`);
              if (raw) localImages = (JSON.parse(raw) as string[]).filter(Boolean);
            } catch {
              localImages = [];
            }
            const coverLocal = (await getItem(`ad_cover_${row.id}`)) || null;
            if (!localImages.length && coverLocal) localImages = [coverLocal];
            const server = (row.imageUrls || []).map((url) => mediaUrl(url)).filter((url): url is string => Boolean(url));
            const list = localImages.length ? localImages : server;
            return {
              id: row.id,
              title: row.title,
              description: row.description,
              hashtags: row.hashtags,
              coverUrl: list[0] || null,
              images: list,
              kind: "AD" as const,
            };
          }),
        );

        const productRows = ((productPayload as { data?: Array<{ id: string; name: string; description?: string; priceCents?: number; promoPriceCents?: number | null; images?: Array<{ url?: string }> }> }).data || []).filter(
          (row) => row.name?.trim(),
        );
        const productItems: ProductItem[] = productRows.map((row) => {
          const images = (row.images || []).map((image) => mediaUrl(image.url)).filter((url): url is string => Boolean(url));
          const price = row.promoPriceCents ?? row.priceCents ?? 0;
          const priceLabel = price ? formatBrl(price) : "";
          const description = [row.description?.trim() || "", priceLabel ? `Por ${priceLabel}` : "", "Chame no WhatsApp e garanta o seu!"]
            .filter(Boolean)
            .join("\n\n");
          return {
            id: row.id,
            title: row.name,
            description,
            hashtags: [],
            coverUrl: images[0] || null,
            images,
            kind: "PRODUCT" as const,
            priceLabel,
          };
        });

        setAds(withCovers);
        setProducts(productItems);
        // Sem seleção automática — o usuário escolhe.
        setSelectedKeys([]);
        setCaption("");
        setChannels(pubs.channels);
        setEnabled({
          WHATSAPP: true,
          INSTAGRAM: pubs.channels.find((item) => item.provider === "INSTAGRAM")?.status === "CONNECTED",
          FACEBOOK: pubs.channels.find((item) => item.provider === "FACEBOOK")?.status === "CONNECTED",
        });
      })
      .catch((cause) => {
        if (handleTenantError(cause)) return;
        setError(true);
        setMessage(cause instanceof ApiClientError ? cause.message : "Falha ao carregar publicação.");
      });
  }, []);

  function toggleItem(item: ShareItem) {
    const key = itemKey(item);
    setSelectedKeys((current) => {
      const next = current.includes(key) ? current.filter((value) => value !== key) : [...current, key];
      const all = [...ads, ...products];
      const picked = all.filter((row) => next.includes(itemKey(row)));
      if (picked.length === 1) setCaption(buildAdCaption(picked[0]));
      else if (picked.length === 0) setCaption("");
      else setCaption(picked.map((row) => buildAdCaption(row)).join("\n\n————\n\n"));
      return next;
    });
  }

  async function connectMeta() {
    try {
      setBusy(true);
      setError(false);
      setShowMetaHelp(false);
      setMessage("Abrindo autorização Meta…");
      const result = await api.connectMeta("app");
      if (!result?.url) throw new Error("A API não devolveu a URL da Meta.");
      waitingMeta.current = true;
      await Linking.openURL(result.url);
      setMessage("Na Meta, marque Página + Instagram e toque em Permitir. Se aparecer “atualizando detalhes”, use o checklist abaixo.");
      setShowMetaHelp(true);
    } catch (cause) {
      if (handleTenantError(cause)) return;
      setError(true);
      setShowMetaHelp(true);
      setMessage(cause instanceof ApiClientError ? cause.message : "Não foi possível abrir a conexão Meta.");
    } finally {
      setBusy(false);
    }
  }

  async function publishNow() {
    const selectedChannels = (Object.entries(enabled) as Array<[Channel, boolean]>).filter(([, value]) => value).map(([key]) => key);
    if (!selectedChannels.length) {
      setError(true);
      setMessage("Ative ao menos um canal.");
      return;
    }
    if (!selectedItems.length) {
      setError(true);
      setMessage("Escolha um ou mais anúncios/produtos para compartilhar.");
      return;
    }
    if (schedule && !when) {
      setError(true);
      setMessage("Escolha a data e o horário no calendário.");
      return;
    }
    for (const channel of selectedChannels) {
      if (channel !== "WHATSAPP" && !channelConnected(channelMap.get(channel)) && schedule) {
        setError(true);
        setMessage(`Conecte o ${channel === "FACEBOOK" ? "Facebook" : "Instagram"} para agendar.`);
        return;
      }
    }

    setBusy(true);
    setError(false);
    setMessage(schedule ? "Agendando…" : `Preparando ${selectedItems.length} item(ns)…`);
    try {
      const scheduledAt = schedule && when ? when.toISOString() : null;
      const notes: string[] = [];
      let lastWhatsapp: string | null = null;

      for (const item of selectedItems) {
        const exactCaption = polishShareCaption(
          selectedItems.length === 1 && caption.trim()
            ? caption
            : buildAdCaption(item),
        );
        if (!exactCaption) {
          notes.push(`“${item.title}” sem texto útil — pulado.`);
          continue;
        }

        for (const channel of selectedChannels) {
          const connected = channelConnected(channelMap.get(channel));
          const result = await api.publish({
            channel,
            targetType: item.kind === "AD" ? "ADVERTISEMENT" : "PRODUCT",
            targetId: item.id,
            caption: exactCaption,
            scheduledAt,
            confirmManual: !connected,
          });

          const shareImages = [...item.images, ...(result.share?.imageUrls || []), result.share?.imageUrl, item.coverUrl].filter(
            (uri): uri is string => Boolean(uri),
          );
          const uniqueImages = [...new Set(shareImages)];
          const shareCaption = polishShareCaption(result.share?.caption || exactCaption);

          if (channel === "WHATSAPP") {
            lastWhatsapp = result.share?.whatsappUrl || null;
            if (!scheduledAt) {
              try {
                const shared = await shareAdToChannel({
                  channel: "WHATSAPP",
                  caption: shareCaption,
                  imageUris: uniqueImages,
                  whatsappUrl: result.share?.whatsappUrl,
                });
                notes.push(
                  shared.images > 0
                    ? `WhatsApp: “${item.title}” com ${shared.images} foto(s).`
                    : `WhatsApp: “${item.title}” (texto).`,
                );
              } catch {
                if (lastWhatsapp) await Linking.openURL(lastWhatsapp).catch(() => undefined);
                else await Share.share({ message: shareCaption }).catch(() => undefined);
                notes.push(`WhatsApp aberto com “${item.title}”.`);
              }
            }
          } else if (connected && !scheduledAt) {
            notes.push(`${channel === "FACEBOOK" ? "Facebook" : "Instagram"}: “${item.title}” publicado.`);
          } else if (!scheduledAt) {
            try {
              await shareAdToChannel({ channel, caption: shareCaption, imageUris: uniqueImages });
              notes.push(`${channel}: “${item.title}” pronto para enviar.`);
            } catch {
              notes.push(`${channel}: cole o texto de “${item.title}” manualmente.`);
            }
          } else {
            notes.push(`${channel}: “${item.title}” agendado.`);
          }
        }
      }

      setWhatsappUrl(lastWhatsapp);
      setMessage(schedule && when ? `Agendado para ${formatScheduleBr(when).compact}.` : notes.join(" ") || "Pronto.");
    } catch (cause) {
      if (handleTenantError(cause)) return;
      setError(true);
      setMessage(cause instanceof ApiClientError ? cause.message : "Não foi possível publicar.");
    } finally {
      setBusy(false);
    }
  }

  const pickerItems = pickerTab === "AD" ? ads : products;

  return (
    <KeyboardScreen>
      <BackButton fallback="/estudio" />
      <ScreenTitle>Publicar nas redes</ScreenTitle>

      <View style={{ gap: 10, marginBottom: 12 }}>
        {SOCIALS.map((item) => {
          const info = channelMap.get(item.key);
          const connected = channelConnected(info);
          const needsConnect = item.key !== "WHATSAPP" && !connected;
          return (
            <Card key={item.key} style={{ gap: 10, paddingVertical: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: control.radiusCard, backgroundColor: item.iconBg, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={item.icon} size={control.icon} color={item.iconColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: fonts.subtitle, fontWeight: "700" }}>{item.label}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: fonts.body2, fontWeight: "500", marginTop: 2 }}>
                    {info?.detail || (item.key === "WHATSAPP" ? "Texto + fotos do que você selecionar" : "Conecte para publicar direto")}
                  </Text>
                </View>
                {needsConnect ? (
                  <Pressable
                    onPress={() => void connectMeta()}
                    style={{ height: 34, borderRadius: 999, paddingHorizontal: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}
                  >
                    <Text style={{ color: "#fff", fontSize: fonts.caption, fontWeight: "700" }}>Conectar</Text>
                  </Pressable>
                ) : (
                  <Toggle label={`Alternar ${item.label}`} value={enabled[item.key]} onChange={(next) => setEnabled((current) => ({ ...current, [item.key]: next }))} />
                )}
              </View>
              {connected ? (
                <Text style={{ color: colors.success, fontSize: fonts.caption, fontWeight: "600", marginLeft: 52 }}>Conta autorizada</Text>
              ) : null}
            </Card>
          );
        })}
      </View>

      {showMetaHelp ? (
        <Card style={{ marginBottom: 12, gap: 8, borderColor: "#FECACA", backgroundColor: "#FEF2F2" }}>
          <Text style={{ color: colors.error, fontSize: fonts.subtitle, fontWeight: "700" }}>Checklist Meta (obrigatório)</Text>
          <Text style={{ color: colors.text, fontSize: fonts.body2, lineHeight: 20 }}>{META_HELP}</Text>
          <Pressable onPress={() => void Linking.openURL("https://developers.facebook.com/apps/")}>
            <Text style={{ color: colors.primary, fontWeight: "700", marginTop: 4 }}>Abrir Meta for Developers</Text>
          </Pressable>
        </Card>
      ) : null}

      <Card style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, marginBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: control.radiusCard, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="calendar-outline" size={control.icon} color={colors.primary} />
          </View>
          <View>
            <Text style={{ color: colors.text, fontSize: fonts.subtitle, fontWeight: "700" }}>Agendar publicação</Text>
            <Text style={{ color: colors.textSecondary, fontSize: fonts.caption, marginTop: 2 }}>Horário de Brasília</Text>
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

      <Pressable
        onPress={() => setPicker(true)}
        style={{
          marginBottom: 12,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          padding: 14,
          gap: 6,
        }}
      >
        <Text style={{ color: colors.textSecondary, fontSize: fonts.caption, fontWeight: "600" }}>Anúncios e produtos</Text>
        <Text style={{ color: colors.text, fontSize: fonts.subtitle, fontWeight: "700" }}>
          {selectedItems.length === 0
            ? "Toque para escolher (pode marcar vários)"
            : selectedItems.length === 1
              ? selectedItems[0].title
              : `${selectedItems.length} selecionados`}
        </Text>
        {selectedItems.length > 1 ? (
          <Text style={{ color: colors.textSecondary, fontSize: fonts.caption }} numberOfLines={2}>
            {selectedItems.map((item) => item.title).join(" · ")}
          </Text>
        ) : null}
      </Pressable>

      {primary?.coverUrl ? (
        <View style={{ marginBottom: 12, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: colors.border }}>
          <Image source={{ uri: primary.coverUrl }} style={{ width: "100%", aspectRatio: 4 / 5 }} resizeMode="cover" />
        </View>
      ) : (
        <View style={{ marginBottom: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: "#F3F4F8", minHeight: 100, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.textSecondary, fontSize: fonts.body2 }}>
            {selectedItems.length ? "Sem foto neste item" : "Nada selecionado ainda"}
          </Text>
        </View>
      )}

      <View style={{ marginBottom: 14 }}>
        <Field
          label={selectedItems.length > 1 ? "Textos que serão enviados" : "Texto do anúncio"}
          value={caption}
          onChangeText={setCaption}
          multiline
          placeholder="Escolha anúncios/produtos acima. O texto aparece aqui para você revisar."
        />
      </View>

      {message ? <HelperText error={error}>{message}</HelperText> : null}
      <PrimaryButton
        label={schedule ? "Agendar" : selectedItems.length > 1 ? `Compartilhar ${selectedItems.length} itens` : "Compartilhar"}
        busy={busy}
        onPress={() => void publishNow()}
      />

      {whatsappUrl ? (
        <Pressable onPress={() => void Linking.openURL(whatsappUrl)} style={{ marginTop: 12, alignItems: "center" }}>
          <Text style={{ color: colors.primary, fontSize: fonts.body, fontWeight: "700" }}>Abrir de novo no WhatsApp</Text>
        </Pressable>
      ) : null}

      <Modal visible={picker} transparent animationType="fade" onRequestClose={() => setPicker(false)}>
        <Pressable onPress={() => setPicker(false)} style={{ flex: 1, backgroundColor: "rgba(15,12,30,0.45)", justifyContent: "flex-end" }}>
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: "75%" }}
          >
            <Text style={{ color: colors.text, fontSize: fonts.title, fontWeight: "700", marginBottom: 8 }}>Escolher para publicar</Text>
            <Text style={{ color: colors.textSecondary, fontSize: fonts.caption, marginBottom: 12 }}>Marque um ou vários. Toque de novo para desmarcar.</Text>

            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
              {(
                [
                  ["AD", `Anúncios (${ads.length})`],
                  ["PRODUCT", `Produtos (${products.length})`],
                ] as const
              ).map(([tab, label]) => (
                <Pressable
                  key={tab}
                  onPress={() => setPickerTab(tab)}
                  style={{
                    flex: 1,
                    height: 36,
                    borderRadius: 999,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: pickerTab === tab ? colors.primary : colors.background,
                  }}
                >
                  <Text style={{ color: pickerTab === tab ? "#fff" : colors.text, fontWeight: "700", fontSize: fonts.caption }}>{label}</Text>
                </Pressable>
              ))}
            </View>

            <ScrollView>
              {pickerItems.length === 0 ? (
                <Text style={{ color: colors.textSecondary, fontSize: fonts.body, paddingVertical: 12 }}>
                  {pickerTab === "AD" ? "Nenhum anúncio bom para publicar. Crie um novo em Anúncio com IA." : "Nenhum produto cadastrado."}
                </Text>
              ) : (
                pickerItems.map((item) => {
                  const checked = selectedKeys.includes(itemKey(item));
                  return (
                    <Pressable
                      key={itemKey(item)}
                      onPress={() => toggleItem(item)}
                      style={{ flexDirection: "row", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: "center" }}
                    >
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          borderWidth: 2,
                          borderColor: checked ? colors.primary : colors.border,
                          backgroundColor: checked ? colors.primary : "transparent",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {checked ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                      </View>
                      <View style={{ width: 48, height: 48, borderRadius: 10, overflow: "hidden", backgroundColor: "#EEF0F5" }}>
                        {item.coverUrl ? <Image source={{ uri: item.coverUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" /> : null}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: fonts.title, fontWeight: "700" }} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: fonts.caption, marginTop: 2 }} numberOfLines={2}>
                          {item.description}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>

            <PrimaryButton label={selectedKeys.length ? `Usar ${selectedKeys.length} selecionado(s)` : "Fechar"} onPress={() => setPicker(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardScreen>
  );
}
