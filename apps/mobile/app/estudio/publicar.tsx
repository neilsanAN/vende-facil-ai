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
import { Card, Field, HelperText, PrimaryButton, ScreenTitle, SelectRow } from "../../src/ui";
import { getItem } from "../../src/storage";
import { buildAdCaption, shareAdToChannel } from "../../src/share-ad";

type Ad = {
  id: string;
  title: string;
  description: string;
  hashtags: string[];
  coverUrl?: string | null;
  images: string[];
};
type Channel = "WHATSAPP" | "INSTAGRAM" | "FACEBOOK";
type ChannelInfo = { provider: string; status: string; detail: string; connectUrl?: string | null };

const SOCIALS: Array<{ key: Channel; label: string; icon: keyof typeof Ionicons.glyphMap; iconBg: string; iconColor: string }> = [
  { key: "WHATSAPP", label: "WhatsApp", icon: "logo-whatsapp", iconBg: "#ECFDF5", iconColor: "#059669" },
  { key: "INSTAGRAM", label: "Instagram", icon: "logo-instagram", iconBg: "#FDF2F8", iconColor: "#DB2777" },
  { key: "FACEBOOK", label: "Facebook", icon: "logo-facebook", iconBg: "#EFF6FF", iconColor: "#2563EB" },
];

function mediaUrl(path?: string | null) {
  if (!path) return null;
  return path.startsWith("http") || path.startsWith("file:") || path.startsWith("content:") ? path : `${apiBase}${path}`;
}

function channelConnected(info?: ChannelInfo) {
  return info?.status === "CONNECTED";
}

export default function PublishScreen() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [adId, setAdId] = useState("");
  const [caption, setCaption] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [enabled, setEnabled] = useState<Record<Channel, boolean>>({ WHATSAPP: true, INSTAGRAM: false, FACEBOOK: false });
  const [schedule, setSchedule] = useState(false);
  const [when, setWhen] = useState<Date | null>(null);
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const params = useLocalSearchParams<{ meta?: string }>();
  const waitingMeta = useRef(false);

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
            : "A autorização Meta não foi concluída. Veja a mensagem que apareceu no navegador.",
        );
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
            setMessage(`Conectado: ${[fb ? "Facebook" : null, ig ? "Instagram" : null].filter(Boolean).join(" e ")}.`);
          }
        })
        .catch(() => undefined);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    Promise.all([api.listAds(), api.publications()])
      .then(async ([rows, pubs]) => {
        const withCovers: Ad[] = await Promise.all(
          rows.map(async (row) => {
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
            // Preferência: fotos locais (compartilha no WhatsApp sem baixar) → servidor.
            const list = localImages.length ? localImages : server;
            return {
              id: row.id,
              title: row.title,
              description: row.description,
              hashtags: row.hashtags,
              coverUrl: list[0] || null,
              images: list,
            };
          }),
        );
        setAds(withCovers);
        if (withCovers[0]) {
          setAdId(withCovers[0].id);
          setCaption(buildAdCaption(withCovers[0]));
          setCoverUrl(withCovers[0].coverUrl || null);
          setImages(withCovers[0].images);
        }
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

  const selected = useMemo(() => ads.find((item) => item.id === adId), [ads, adId]);
  const channelMap = useMemo(() => new Map(channels.map((item) => [item.provider, item])), [channels]);

  function selectAd(ad: Ad) {
    setAdId(ad.id);
    setCaption(buildAdCaption(ad));
    setCoverUrl(ad.coverUrl || null);
    setImages(ad.images);
    setPicker(false);
  }

  async function connectMeta() {
    try {
      setBusy(true);
      setError(false);
      setMessage("Abrindo autorização Meta…");
      const result = await api.connectMeta("app");
      if (!result?.url) throw new Error("A API não devolveu a URL da Meta.");
      waitingMeta.current = true;
      const opened = await Linking.openURL(result.url);
      if (opened === false) {
        setError(true);
        setMessage("Não deu para abrir o navegador. Abra o link da Meta manualmente e autorize.");
        return;
      }
      setMessage("Na Meta: marque sua Página e o Instagram e toque em Permitir. Se aparecer “app inativo”, o app ainda está em modo desenvolvimento.");
    } catch (cause) {
      if (handleTenantError(cause)) return;
      setError(true);
      const text = cause instanceof ApiClientError ? cause.message : cause instanceof Error ? cause.message : "Não foi possível conectar.";
      setMessage(
        text.includes("inativo") || text.toLowerCase().includes("inactive")
          ? "App Meta inativo: em developers.facebook.com coloque o app em modo Ao vivo (ou adicione sua conta como Testadora)."
          : text,
      );
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
    if (!adId) {
      setError(true);
      setMessage("Escolha um anúncio gerado.");
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
    setMessage(schedule ? "Agendando…" : "Preparando anúncio…");
    try {
      const scheduledAt = schedule && when ? when.toISOString() : null;
      const notes: string[] = [];
      let lastWhatsapp: string | null = null;
      const exactCaption = buildAdCaption({
        title: selected?.title || "",
        description: selected?.description || caption,
        hashtags: selected?.hashtags,
      });
      // Mantém o texto editado se o usuário ajustou, sem links.
      const finalCaption = (caption.trim() || exactCaption).replace(/https?:\/\/\S+/gi, "").trim();

      for (const channel of selectedChannels) {
        const connected = channelConnected(channelMap.get(channel));
        const result = await api.publish({
          channel,
          targetType: "ADVERTISEMENT",
          targetId: adId,
          caption: finalCaption,
          scheduledAt,
          confirmManual: !connected,
        });

        // Locais primeiro (file://), depois URLs assinadas do servidor.
        const shareImages = [
          ...images,
          ...(result.share?.imageUrls || []),
          result.share?.imageUrl,
          coverUrl,
        ].filter((item): item is string => Boolean(item));
        const uniqueImages = [...new Set(shareImages)];
        const shareCaption = (result.share?.caption || finalCaption).trim() || finalCaption;

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
                  ? `WhatsApp: ${shared.images} foto(s) do anúncio + texto.`
                  : "WhatsApp: texto do anúncio enviado (sem foto anexada).",
              );
              if (shared.captionCopied) notes.push("Texto copiado — se a legenda não aparecer, cole no WhatsApp.");
            } catch {
              if (lastWhatsapp) await Linking.openURL(lastWhatsapp).catch(() => undefined);
              else await Share.share({ message: shareCaption }).catch(() => undefined);
              notes.push("WhatsApp aberto com o texto do anúncio.");
            }
          } else {
            notes.push("WhatsApp agendado.");
          }
        } else if (connected && !scheduledAt) {
          notes.push(channel === "FACEBOOK" ? "Publicado no Facebook." : "Publicado no Instagram.");
        } else if (!scheduledAt) {
          try {
            await shareAdToChannel({
              channel,
              caption: shareCaption,
              imageUris: uniqueImages,
            });
            notes.push(channel === "FACEBOOK" ? "Anúncio pronto no Facebook." : "Anúncio pronto no Instagram.");
          } catch {
            notes.push(channel === "FACEBOOK" ? "Abra o Facebook e cole o anúncio." : "Abra o Instagram e cole o anúncio.");
          }
        } else {
          notes.push(`${channel} agendado.`);
        }
      }

      setWhatsappUrl(lastWhatsapp);
      setMessage(
        schedule && when
          ? `Publicação agendada para ${formatScheduleBr(when).compact}.`
          : notes.join(" ") || "Anúncio pronto.",
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
                    {info?.detail ||
                      (item.key === "WHATSAPP" ? "Anúncio gerado com texto e imagem" : "Conecte para publicar direto")}
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
              {connected ? (
                <Text style={{ color: colors.success, fontSize: fonts.caption, fontWeight: "600", marginLeft: 52 }}>
                  Conta autorizada — publicação direta liberada
                </Text>
              ) : null}
            </Card>
          );
        })}
      </View>

      {channels.some((item) => item.provider !== "WHATSAPP" && item.status !== "CONNECTED") ? (
        <Pressable
          onPress={() => {
            void loadChannels()
              .then(() => setMessage("Conexões atualizadas."))
              .catch(() => undefined);
          }}
          style={{ marginBottom: 12, alignItems: "center" }}
        >
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
        <SelectRow label="Anúncio gerado" value={selected?.title || "Escolher anúncio"} onPress={() => setPicker(true)} />
      </View>

      {coverUrl ? (
        <View style={{ marginBottom: 12 }}>
          <View style={{ borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
            <Image source={{ uri: coverUrl }} style={{ width: "100%", aspectRatio: 4 / 5 }} resizeMode="cover" />
          </View>
          {images.length > 1 ? (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 8 }}>
                {images.map((uri) => (
                  <Pressable key={uri} onPress={() => setCoverUrl(uri)}>
                    <Image
                      source={{ uri }}
                      style={{ width: 56, height: 56, borderRadius: 10, borderWidth: uri === coverUrl ? 2 : 1, borderColor: uri === coverUrl ? colors.primary : colors.border }}
                    />
                  </Pressable>
                ))}
              </ScrollView>
              <Text style={{ color: colors.textSecondary, fontSize: fonts.caption, marginTop: 6 }}>
                {images.length} fotos serão enviadas junto com o texto.
              </Text>
            </>
          ) : null}
        </View>
      ) : (
        <View
          style={{
            marginBottom: 12,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: "#F3F4F8",
            minHeight: 120,
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Ionicons name="image-outline" size={22} color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary, fontSize: fonts.body2 }}>Sem foto de capa neste anúncio</Text>
        </View>
      )}

      <View style={{ marginBottom: 14 }}>
        <Field label="Texto do anúncio" value={caption} onChangeText={setCaption} multiline placeholder="Título, descrição e hashtags do anúncio gerado" />
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
            style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: "70%" }}
          >
            <Text style={{ color: colors.text, fontSize: fonts.title, fontWeight: "700", marginBottom: 12 }}>Escolher anúncio</Text>
            <ScrollView>
              {ads.length === 0 ? (
                <Text style={{ color: colors.textSecondary, fontSize: fonts.body, paddingVertical: 12 }}>
                  Nenhum anúncio gerado. Crie um em Anúncio com IA.
                </Text>
              ) : (
                ads.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => selectAd(item)}
                    style={{ flexDirection: "row", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: "center" }}
                  >
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
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardScreen>
  );
}
