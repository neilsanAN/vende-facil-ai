"use client";

import { useState } from "react";
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

export function PublishDesk({ channels, products }: { channels: Array<{ provider: string; status: string; detail: string }>; products: Array<{ id: string; name: string }> }) {
  const toast = useToast();
  const [share, setShare] = useState<{ whatsappUrl?: string; link?: string; caption?: string } | null>(null);
  const [enabled, setEnabled] = useState({ WHATSAPP: true, INSTAGRAM: false, FACEBOOK: false });
  const [schedule, setSchedule] = useState(false);

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {channels.map((channel) => {
          const key = channel.provider as keyof typeof enabled;
          const label = channel.provider === "WHATSAPP" ? "WhatsApp" : channel.provider === "INSTAGRAM" ? "Instagram" : "Facebook";
          return (
            <li key={channel.provider} className="flex items-center justify-between rounded-2xl border border-line bg-surface px-3 py-3 shadow-card">
              <span>
                <strong className="text-[12px] font-semibold">{label}</strong>
                <span className="mt-0.5 block text-[10px] font-medium leading-[13px] text-muted">{channel.detail}</span>
              </span>
              <button
                type="button"
                className={`relative h-6 w-11 rounded-full transition ${enabled[key] ? "bg-primary" : "bg-line"}`}
                onClick={() => setEnabled((current) => ({ ...current, [key]: !current[key] }))}
                aria-label={`Alternar ${label}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${enabled[key] ? "left-5" : "left-0.5"}`} />
              </button>
            </li>
          );
        })}
      </ul>

      {share?.link ? (
        <div className="rounded-2xl border border-line bg-surface px-3 py-3 text-[12px] shadow-card">
          <p className="font-semibold">Link da minha loja</p>
          <p className="mt-1 break-all text-muted">{share.link}</p>
        </div>
      ) : null}

      <form
        className="space-y-3 rounded-2xl border border-line bg-surface p-4 shadow-card"
        onSubmit={async (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const channel = String(data.get("channel") || "WHATSAPP");
          if (!enabled[channel as keyof typeof enabled]) {
            toast("Ative o canal antes de publicar.", "err");
            return;
          }
          try {
            const result = await api<{ share: { whatsappUrl?: string; link?: string; caption?: string } | null }>("/api/publications", {
              method: "POST",
              body: JSON.stringify({
                channel,
                targetType: "PRODUCT",
                targetId: data.get("targetId"),
                caption: data.get("caption"),
                confirmManual: data.get("confirm") === "on",
                scheduledAt: schedule && data.get("when") ? new Date(String(data.get("when"))).toISOString() : null,
              }),
            });
            setShare(result.share);
            toast("Publicação registrada com o estado real do canal.");
          } catch (cause) {
            toast(cause instanceof ApiClientError ? cause.message : "Não foi possível publicar.", "err");
          }
        }}
      >
        <Field label="Canal">
          <select name="channel" className={inputClass}>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="INSTAGRAM">Instagram</option>
            <option value="FACEBOOK">Facebook</option>
          </select>
        </Field>
        <Field label="Produto">
          <select name="targetId" className={inputClass}>
            {products.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Legenda">
          <textarea name="caption" className={areaClass} />
        </Field>
        <label className="flex items-center justify-between text-[12px]">
          <span className="font-medium">Agendar publicação</span>
          <button type="button" className={`relative h-6 w-11 rounded-full transition ${schedule ? "bg-primary" : "bg-line"}`} onClick={() => setSchedule((v) => !v)}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${schedule ? "left-5" : "left-0.5"}`} />
          </button>
        </label>
        {schedule ? (
          <Field label="Quando">
            <input name="when" type="datetime-local" className={inputClass} />
          </Field>
        ) : null}
        <label className="flex items-center gap-2 text-[12px] text-muted">
          <input type="checkbox" name="confirm" /> Já compartilhei manualmente
        </label>
        <Button type="submit" className="w-full">
          Registrar divulgação
        </Button>
        <p className="text-[10px] font-medium leading-[13px] text-muted">Não posta sozinho no Instagram/Facebook. WhatsApp abre o link real; IG/FB só se o canal estiver configurado.</p>
      </form>
      {share?.whatsappUrl ? (
        <a className="block text-center text-[12px] font-semibold text-primary" href={share.whatsappUrl} target="_blank" rel="noreferrer">
          Abrir WhatsApp
        </a>
      ) : null}
    </div>
  );
}
