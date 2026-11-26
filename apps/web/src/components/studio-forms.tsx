"use client";

import { useMemo, useState } from "react";
import { Calendar, Facebook, Instagram, MessageCircle } from "lucide-react";
import { VOICE_STYLES } from "@vendefacil/types";
import { Button, Field, areaClass, inputClass, useToast } from "@/components/ui";
import { api, ApiClientError } from "@/lib/http";

export function NarrationForm({ voices }: { voices: Array<{ id: string; name: string; provider: string; style: string }> }) {
  const toast = useToast();
  const [script, setScript] = useState("Conheça este produto e fale com a loja.");
  const [voiceId, setVoiceId] = useState(voices[0]?.id || "");
  const [speed, setSpeed] = useState(1);
  const [audio, setAudio] = useState("");
  return (
    <div className="max-w-xl space-y-3 rounded-2xl border border-line bg-surface p-4 shadow-card">
      {voices.length === 0 ? <p className="text-sm text-muted">Nenhuma voz cadastrada. Rode o seed para carregar o catálogo.</p> : null}
      <Field label="Voz">
        <select className={inputClass} value={voiceId} onChange={(event) => setVoiceId(event.target.value)}>
          {voices.map((voice) => (
            <option key={voice.id} value={voice.id}>
              {voice.name} · {voice.provider}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Estilo desejado">
        <select className={inputClass}>
          {VOICE_STYLES.map((style) => (
            <option key={style}>{style}</option>
          ))}
        </select>
      </Field>
      <Field label="Velocidade">
        <input className={inputClass} type="number" min="0.8" max="1.2" step="0.05" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} />
      </Field>
      <Field label="Roteiro">
        <textarea className={areaClass} value={script} onChange={(event) => setScript(event.target.value)} />
      </Field>
      <Button
        className="w-full"
        onClick={async () => {
          try {
            const result = await api<{ url: string }>("/api/narration", { method: "POST", headers: { "idempotency-key": crypto.randomUUID() }, body: JSON.stringify({ script, voiceProfileId: voiceId, speed }) });
            setAudio(result.url);
          } catch (cause) {
            toast(cause instanceof ApiClientError ? cause.message : "Narração indisponível.", "err");
          }
        }}
      >
        Gerar narração
      </Button>
      {audio ? <audio className="w-full" controls src={audio} /> : null}
      <p className="text-[10px] font-medium leading-[13px] text-muted">As vozes são as de catálogo do provedor. Não há clonagem de voz.</p>
    </div>
  );
}

export function ArtForm({ products }: { products: Array<{ id: string; name: string }> }) {
  const toast = useToast();
  const [url, setUrl] = useState("");
  return (
    <form
      className="max-w-xl space-y-3 rounded-2xl border border-line bg-surface p-4 shadow-card"
      onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        try {
          const result = await api<{ url: string }>("/api/artwork", {
            method: "POST",
            body: JSON.stringify({ productId: data.get("productId"), template: data.get("template"), title: data.get("title"), priceLabel: data.get("priceLabel") }),
          });
          setUrl(result.url);
        } catch (cause) {
          toast(cause instanceof ApiClientError ? cause.message : "Não foi possível montar a arte.", "err");
        }
      }}
    >
      <Field label="Produto">
        <select name="productId" className={inputClass}>
          {products.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Formato">
        <select name="template" className={inputClass}>
          <option value="story">Stories 9:16</option>
          <option value="feed">Feed 1:1</option>
          <option value="portrait">Retrato 4:5</option>
        </select>
      </Field>
      <Field label="Título">
        <input name="title" className={inputClass} required />
      </Field>
      <Field label="Preço na arte">
        <input name="priceLabel" className={inputClass} placeholder="R$ 99,90" />
      </Field>
      <Button type="submit" className="w-full">
        Gerar arte
      </Button>
      {url ? <img src={url} alt="Arte gerada" className="mt-3 max-w-sm rounded-xl border border-line" /> : null}
    </form>
  );
}

type ChannelInfo = { provider: string; status: string; detail: string; connectUrl?: string | null };

export function PublishDesk({
  channels: initialChannels,
  products,
}: {
  channels: ChannelInfo[];
  products: Array<{ id: string; name: string }>;
  storeLink?: string;
}) {
  const toast = useToast();
  const [channels, setChannels] = useState(initialChannels);
  const [share, setShare] = useState<{ whatsappUrl?: string; link?: string; caption?: string } | null>(null);
  const [enabled, setEnabled] = useState({
    WHATSAPP: true,
    INSTAGRAM: false,
    FACEBOOK: false,
  });
  const [schedule, setSchedule] = useState(false);
  const [when, setWhen] = useState(() => {
    const next = new Date(Date.now() + 60 * 60 * 1000);
    next.setSeconds(0, 0);
    const local = new Date(next.getTime() - next.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 16);
  });
  const whenDate = when ? new Date(when) : null;
  const whenLabel =
    whenDate && !Number.isNaN(whenDate.getTime())
      ? whenDate.toLocaleString("pt-BR", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      : null;

  const channelMap = useMemo(() => new Map(channels.map((item) => [item.provider, item])), [channels]);

  const socials = [
    { key: "WHATSAPP" as const, label: "WhatsApp", Icon: MessageCircle, iconClass: "text-emerald-600 bg-emerald-50", detail: "Produto completo no WhatsApp" },
    { key: "INSTAGRAM" as const, label: "Instagram", Icon: Instagram, iconClass: "text-pink-600 bg-pink-50", detail: "Publicar direto após autorizar" },
    { key: "FACEBOOK" as const, label: "Facebook", Icon: Facebook, iconClass: "text-blue-600 bg-blue-50", detail: "Publicar direto na Página" },
  ];

  async function refreshChannels() {
    const result = await api<{ channels: ChannelInfo[] }>("/api/publications");
    setChannels(result.channels);
  }

  async function connectMeta() {
    try {
      const result = await api<{ url: string }>("/api/integrations/facebook/start");
      window.location.href = result.url;
    } catch (cause) {
      toast(cause instanceof ApiClientError ? cause.message : "Não foi possível conectar o Meta.", "err");
    }
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-2.5">
        {socials.map((item) => {
          const info = channelMap.get(item.key);
          const connected = item.key === "WHATSAPP" || info?.status === "CONNECTED";
          const needsConnect = item.key !== "WHATSAPP" && !connected;
          return (
            <li key={item.key} className="flex items-center gap-3 rounded-[18px] border border-line bg-surface px-4 py-3.5 shadow-card">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${item.iconClass}`}>
                <item.Icon size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block text-[13px] font-semibold leading-4 text-ink">{item.label}</strong>
                <span className="text-[11px] font-medium text-muted">{info?.detail || item.detail}</span>
              </span>
              {needsConnect ? (
                <button type="button" className="h-8 rounded-full bg-primary px-3 text-[11px] font-bold text-white" onClick={() => void connectMeta()}>
                  Conectar
                </button>
              ) : (
                <button
                  type="button"
                  className={`relative h-7 w-12 shrink-0 rounded-full transition ${enabled[item.key] ? "bg-primary" : "bg-[#E0E3EA]"}`}
                  onClick={() => setEnabled((current) => ({ ...current, [item.key]: !current[item.key] }))}
                  aria-label={`Alternar ${item.label}`}
                >
                  <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-card transition ${enabled[item.key] ? "left-[22px]" : "left-0.5"}`} />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {channels.some((item) => item.provider !== "WHATSAPP" && item.status !== "CONNECTED") ? (
        <button type="button" className="mx-auto block text-[12px] font-semibold text-primary" onClick={() => void refreshChannels()}>
          Atualizar conexão
        </button>
      ) : null}

      <div className="flex items-center justify-between rounded-[18px] border border-line bg-surface px-4 py-3.5 shadow-card">
        <span className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-background text-primary">
            <Calendar size={18} />
          </span>
          <span className="text-[13px] font-semibold text-ink">Agendar publicação</span>
        </span>
        <button
          type="button"
          className={`relative h-7 w-12 shrink-0 rounded-full transition ${schedule ? "bg-primary" : "bg-[#E0E3EA]"}`}
          onClick={() => setSchedule((v) => !v)}
        >
          <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-card transition ${schedule ? "left-[22px]" : "left-0.5"}`} />
        </button>
      </div>

      {schedule ? (
        <div className="space-y-3 rounded-[18px] border border-line bg-surface p-4 shadow-card">
          <div className="rounded-xl bg-primary-soft px-3.5 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-primary">Data e hora (horário local)</p>
            <p className="mt-1 text-[13px] font-semibold capitalize text-ink">{whenLabel || "Escolha data e horário"}</p>
          </div>
          <Field label="Calendário">
            <input
              type="datetime-local"
              className={inputClass}
              value={when}
              min={new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16)}
              onChange={(event) => setWhen(event.target.value)}
            />
          </Field>
        </div>
      ) : null}

      <form
        className="space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const channel = String(data.get("channel") || "WHATSAPP") as "WHATSAPP" | "INSTAGRAM" | "FACEBOOK";
          if (!enabled[channel]) {
            toast("Ative o canal antes de publicar.", "err");
            return;
          }
          if (channel !== "WHATSAPP" && channelMap.get(channel)?.status !== "CONNECTED") {
            toast("Conecte a conta Meta antes de publicar.", "err");
            return;
          }
          if (schedule && !when) {
            toast("Escolha a data e o horário no calendário.", "err");
            return;
          }
          try {
            const result = await api<{ share: { whatsappUrl?: string; link?: string; caption?: string } | null }>("/api/publications", {
              method: "POST",
              body: JSON.stringify({
                channel,
                targetType: "PRODUCT",
                targetId: data.get("targetId") || products[0]?.id,
                caption: data.get("caption") || "",
                confirmManual: true,
                scheduledAt: schedule && when ? new Date(when).toISOString() : null,
              }),
            });
            setShare(result.share);
            if (channel === "WHATSAPP" && result.share?.whatsappUrl) {
              window.open(result.share.whatsappUrl, "_blank", "noopener,noreferrer");
              toast("WhatsApp aberto com o produto completo.");
            } else {
              toast(schedule && whenLabel ? `Publicação agendada para ${whenLabel}.` : "Publicação enviada.");
            }
          } catch (cause) {
            toast(cause instanceof ApiClientError ? cause.message : "Não foi possível publicar.", "err");
          }
        }}
      >
        <input type="hidden" name="channel" value={Object.entries(enabled).find(([, v]) => v)?.[0] || "WHATSAPP"} />
        <details className="rounded-[18px] border border-line bg-surface px-4 py-3 shadow-card" open>
          <summary className="cursor-pointer text-[12px] font-semibold text-ink">Produto e legenda</summary>
          <div className="mt-3 space-y-3">
            <Field label="Produto" section>
              <select name="targetId" className={inputClass} defaultValue={products[0]?.id}>
                {products.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Legenda" section>
              <textarea name="caption" className={areaClass} placeholder="Deixe em branco para usar nome, preço e descrição do produto." />
            </Field>
          </div>
        </details>
        <Button type="submit" className="w-full">
          Publicar agora
        </Button>
      </form>

      {share?.whatsappUrl ? (
        <a className="block text-center text-[12px] font-semibold text-primary" href={share.whatsappUrl} target="_blank" rel="noreferrer">
          Abrir WhatsApp de novo
        </a>
      ) : null}
    </div>
  );
}
