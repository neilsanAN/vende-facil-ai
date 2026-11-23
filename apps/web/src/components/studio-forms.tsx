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
    <div className="max-w-xl space-y-3">
      {voices.length === 0 ? <p className="text-sm text-muted">Nenhuma voz cadastrada. Rode o seed para carregar o catálogo.</p> : null}
      <Field label="Voz"><select className={inputClass} value={voiceId} onChange={(event) => setVoiceId(event.target.value)}>{voices.map((voice) => <option key={voice.id} value={voice.id}>{voice.name} · {voice.provider}</option>)}</select></Field>
      <Field label="Estilo desejado"><select className={inputClass}>{VOICE_STYLES.map((style) => <option key={style}>{style}</option>)}</select></Field>
      <Field label="Velocidade"><input className={inputClass} type="number" min="0.8" max="1.2" step="0.05" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} /></Field>
      <Field label="Roteiro"><textarea className={areaClass} value={script} onChange={(event) => setScript(event.target.value)} /></Field>
      <Button onClick={async () => {
        try {
          const result = await api<{ url: string }>("/api/narration", { method: "POST", headers: { "idempotency-key": crypto.randomUUID() }, body: JSON.stringify({ script, voiceProfileId: voiceId, speed }) });
          setAudio(result.url);
        } catch (cause) { toast(cause instanceof ApiClientError ? cause.message : "Narração indisponível.", "err"); }
      }}>Gerar narração</Button>
      {audio ? <audio className="w-full" controls src={audio} /> : null}
      <p className="text-xs text-muted">As vozes são as de catálogo do provedor. Não há clonagem de voz.</p>
    </div>
  );
}

export function ArtForm({ products }: { products: Array<{ id: string; name: string }> }) {
  const toast = useToast();
  const [url, setUrl] = useState("");
  return (
    <form className="max-w-xl space-y-3" onSubmit={async (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      try {
        const result = await api<{ url: string }>("/api/artwork", { method: "POST", body: JSON.stringify({ productId: data.get("productId"), template: data.get("template"), title: data.get("title"), priceLabel: data.get("priceLabel") }) });
        setUrl(result.url);
      } catch (cause) { toast(cause instanceof ApiClientError ? cause.message : "Não foi possível montar a arte.", "err"); }
    }}>
      <Field label="Produto"><select name="productId" className={inputClass}>{products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
      <Field label="Formato"><select name="template" className={inputClass}><option value="story">Stories 9:16</option><option value="feed">Feed 1:1</option><option value="portrait">Retrato 4:5</option></select></Field>
      <Field label="Título"><input name="title" className={inputClass} required /></Field>
      <Field label="Preço na arte"><input name="priceLabel" className={inputClass} placeholder="R$ 99,90" /></Field>
      <Button type="submit">Gerar arte</Button>
      {url ? <img src={url} alt="Arte gerada" className="mt-3 max-w-sm rounded-xl border border-line" /> : null}
    </form>
  );
}

export function PublishDesk({ channels, products }: { channels: Array<{ provider: string; status: string; detail: string }>; products: Array<{ id: string; name: string }> }) {
  const toast = useToast();
  const [share, setShare] = useState<{ whatsappUrl?: string; link?: string; caption?: string } | null>(null);
  return (
    <div className="space-y-4">
      <ul className="space-y-2">{channels.map((channel) => <li key={channel.provider} className="flex items-center justify-between rounded-2xl border border-line bg-surface px-3 py-3 text-sm"><span><strong>{channel.provider === "WHATSAPP" ? "WhatsApp" : channel.provider === "INSTAGRAM" ? "Instagram" : "Facebook"}</strong><span className="block text-xs text-muted">{channel.detail}</span></span><span className="rounded-full bg-white/5 px-2 py-1 text-[11px] text-muted">{channel.status}</span></li>)}</ul>
      <form className="space-y-3" onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        try {
          const result = await api<{ share: { whatsappUrl?: string; link?: string; caption?: string } | null }>("/api/publications", { method: "POST", body: JSON.stringify({ channel: data.get("channel"), targetType: "PRODUCT", targetId: data.get("targetId"), caption: data.get("caption"), confirmManual: data.get("confirm") === "on", scheduledAt: data.get("when") ? new Date(String(data.get("when"))).toISOString() : null }) });
          setShare(result.share);
          toast("Publicação registrada com o estado real do canal.");
        } catch (cause) { toast(cause instanceof ApiClientError ? cause.message : "Não foi possível publicar.", "err"); }
      }}>
        <Field label="Canal"><select name="channel" className={inputClass}><option value="WHATSAPP">WhatsApp</option><option value="INSTAGRAM">Instagram</option><option value="FACEBOOK">Facebook</option></select></Field>
        <Field label="Produto"><select name="targetId" className={inputClass}>{products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
        <Field label="Legenda"><textarea name="caption" className={areaClass} /></Field>
        <Field label="Agendar"><input name="when" type="datetime-local" className={inputClass} /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="confirm" /> Já compartilhei manualmente</label>
        <Button type="submit" className="w-full">Publicar agora</Button>
      </form>
      {share?.whatsappUrl ? <a className="text-sm text-primary" href={share.whatsappUrl} target="_blank">Abrir WhatsApp</a> : null}
      {share?.link ? <p className="text-sm">Link: {share.link}</p> : null}
    </div>
  );
}
