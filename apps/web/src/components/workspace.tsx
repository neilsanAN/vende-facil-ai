"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Camera, ImageIcon } from "lucide-react";
import { formatBrl, TONE_LABEL, ASPECT_DIMENSIONS, PIPELINE_LABEL, type PipelineStatus } from "@vendefacil/types";
import { parseBrlToCents } from "@vendefacil/validation";
import { Button, Field, areaClass, buttonClass, chipClass, inputClass, useToast } from "@/components/ui";
import { api, ApiClientError } from "@/lib/http";

type Category = { id: string; name: string };
type Product = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  promoPriceCents: number | null;
  categoryId: string | null;
  sku: string | null;
  stockQuantity: number | null;
  trackStock: boolean;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  published: boolean;
  variants: Array<{ name: string; sku: string | null; priceCents: number | null; stockQuantity: number | null }>;
  images: Array<{ id: string; url: string; alt: string }>;
};

function centsToInput(cents: number | null | undefined) {
  if (cents == null) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function ProductForm({ product, categories }: { product?: Product; categories: Category[] }) {
  const router = useRouter();
  const toast = useToast();
  const [variants, setVariants] = useState(product?.variants.map((item) => ({ name: item.name, sku: item.sku || "", price: centsToInput(item.priceCents), stock: item.stockQuantity?.toString() || "" })) || []);
  const [error, setError] = useState("");

  async function onSubmit(formData: FormData) {
    setError("");
    const price = parseBrlToCents(String(formData.get("price") || ""));
    const promoRaw = String(formData.get("promo") || "");
    const promo = promoRaw ? parseBrlToCents(promoRaw) : null;
    if (price == null || (promoRaw && promo == null)) { setError("Informe preços válidos, como 29,90."); return; }
    const payload = {
      name: String(formData.get("name") || ""),
      description: String(formData.get("description") || ""),
      priceCents: price,
      promoPriceCents: promo,
      categoryId: String(formData.get("categoryId") || "") || null,
      sku: String(formData.get("sku") || ""),
      trackStock: formData.get("trackStock") === "on",
      stockQuantity: formData.get("trackStock") === "on" ? Number(formData.get("stock") || 0) : null,
      status: formData.get("published") === "on" ? "ACTIVE" : "DRAFT",
      published: formData.get("published") === "on",
      variants: variants.filter((item) => item.name).map((item) => ({
        name: item.name,
        sku: item.sku,
        priceCents: item.price ? parseBrlToCents(item.price) : null,
        stockQuantity: item.stock ? Number(item.stock) : null,
      })),
    };
    try {
      const saved = product
        ? await api<Product>(`/api/products/${product.id}`, { method: "PATCH", body: JSON.stringify(payload) })
        : await api<Product>("/api/products", { method: "POST", body: JSON.stringify(payload) });
      toast("Produto salvo.");
      router.push(`/produtos/${saved.id}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : "Não foi possível salvar.");
    }
  }

  return (
    <form action={onSubmit} className="grid gap-4 lg:grid-cols-[1.4fr_.8fr]">
      <div className="space-y-3 rounded-2xl border border-line bg-surface p-4">
        <Field label="Nome"><input name="name" className={inputClass} defaultValue={product?.name} required /></Field>
        <Field label="Descrição"><textarea name="description" className={areaClass} defaultValue={product?.description} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Preço"><input name="price" className={inputClass} defaultValue={centsToInput(product?.priceCents)} placeholder="0,00" /></Field>
          <Field label="Preço promocional"><input name="promo" className={inputClass} defaultValue={centsToInput(product?.promoPriceCents)} placeholder="opcional" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoria"><select name="categoryId" className={inputClass} defaultValue={product?.categoryId || ""}><option value="">Sem categoria</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
          <Field label="SKU"><input name="sku" className={inputClass} defaultValue={product?.sku || ""} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="trackStock" defaultChecked={product?.trackStock} /> Controlar estoque</label>
        <Field label="Quantidade"><input name="stock" className={inputClass} defaultValue={product?.stockQuantity ?? ""} /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" defaultChecked={product?.published} /> Publicar na vitrine</label>
        <div>
          <div className="mb-2 flex items-center justify-between"><p className="text-sm font-semibold">Variações</p><button type="button" className="text-sm text-primary" onClick={() => setVariants([...variants, { name: "", sku: "", price: "", stock: "" }])}>Adicionar</button></div>
          <div className="space-y-2">
            {variants.map((variant, index) => (
              <div key={index} className="grid grid-cols-4 gap-2">
                <input className={inputClass} placeholder="Nome" value={variant.name} onChange={(event) => setVariants(variants.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} />
                <input className={inputClass} placeholder="SKU" value={variant.sku} onChange={(event) => setVariants(variants.map((item, itemIndex) => itemIndex === index ? { ...item, sku: event.target.value } : item))} />
                <input className={inputClass} placeholder="Preço" value={variant.price} onChange={(event) => setVariants(variants.map((item, itemIndex) => itemIndex === index ? { ...item, price: event.target.value } : item))} />
                <input className={inputClass} placeholder="Estoque" value={variant.stock} onChange={(event) => setVariants(variants.map((item, itemIndex) => itemIndex === index ? { ...item, stock: event.target.value } : item))} />
              </div>
            ))}
          </div>
        </div>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button type="submit">Salvar</Button>
      </div>
      {product ? <ImagePanel productId={product.id} images={product.images} /> : <p className="text-sm text-muted">Salve o produto para enviar as fotos.</p>}
    </form>
  );
}

function ImagePanel({ productId, images }: { productId: string; images: Product["images"] }) {
  const router = useRouter();
  const toast = useToast();
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-sm font-semibold">Fotos</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {images.map((image) => (
          <div key={image.id} className="relative">
            <img src={image.url} alt={image.alt || ""} className="aspect-square w-full rounded-lg object-cover" />
            <button className="absolute right-1 top-1 rounded bg-black/50 px-1 text-white text-xs" onClick={async () => { await api(`/api/products/${productId}/images/${image.id}`, { method: "DELETE" }); router.refresh(); }}>x</button>
          </div>
        ))}
      </div>
      <label className={`${buttonClass} mt-3 cursor-pointer border border-line bg-surface text-ink`}>
        <ImageIcon size={16} />
        Enviar foto
        <input className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
          const asset = await uploadFile(file);
          await api(`/api/products/${productId}/images`, { method: "POST", body: JSON.stringify({ assetId: asset.id }) });
          toast("Foto adicionada.");
          router.refresh();
        } catch (cause) { toast(cause instanceof ApiClientError ? cause.message : "Falha no upload.", "err"); }
        }} />
      </label>
    </div>
  );
}

export async function uploadFile(file: File) {
  const kind = file.type.startsWith("audio") ? "AUDIO" : file.type.startsWith("video") ? "VIDEO" : "IMAGE";
  const created = await api<{ assetId: string; url: string; method: "PUT" | "POST"; headers: Record<string, string> }>("/api/uploads", {
    method: "POST",
    body: JSON.stringify({ mimeType: file.type || "image/jpeg", sizeBytes: file.size, kind, originalName: file.name }),
  });
  const response = await fetch(created.url, { method: created.method, headers: created.headers, body: file });
  if (!response.ok) throw new ApiClientError("O envio do arquivo falhou.", "UPLOAD", response.status);
  return api<{ id: string; url: string }>(`/api/uploads/${created.assetId}/confirm`, { method: "POST" });
}

export function AdStudio({ products }: { products: Array<{ id: string; name: string; priceCents: number }> }) {
  const router = useRouter();
  const toast = useToast();
  const [assetId, setAssetId] = useState("");
  const [preview, setPreview] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [copy, setCopy] = useState({ title: "", description: "", hashtags: "" });
  const [tone, setTone] = useState("PROFESSIONAL");
  const [productId, setProductId] = useState(products[0]?.id || "");
  const [facts, setFacts] = useState({ name: products[0]?.name || "", brand: "", facts: "", audience: "" });
  const [busy, setBusy] = useState("");
  const [uploading, setUploading] = useState(false);

  async function generate() {
    if (!assetId) { toast("Envie uma foto do produto.", "err"); return; }
    const price = products.find((item) => item.id === productId)?.priceCents;
    setBusy("Gerando seu anúncio com a foto e os fatos confirmados.");
    try {
      const ad = await api<{ id: string; title: string; description: string; hashtags: string[] }>("/api/ai/ads", {
        method: "POST",
        headers: { "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({ productId: productId || null, assetIds: [assetId], tone, facts: { ...facts, priceCents: price ?? null } }),
      });
      setCopy({ title: ad.title, description: ad.description, hashtags: ad.hashtags.join(" ") });
      router.push(`/anuncios/${ad.id}`);
    } catch (cause) {
      setBusy("");
      toast(cause instanceof ApiClientError ? cause.message : "A IA não gerou o anúncio.", "err");
    }
  }

  async function sendPhoto(file: File) {
    if (!file.type.startsWith("image/")) {
      toast("Use uma foto JPG, PNG ou WebP.", "err");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast("A foto precisa ter no máximo 10 MB.", "err");
      return;
    }
    const local = URL.createObjectURL(file);
    setPreview(local);
    setUploading(true);
    try {
      const asset = await uploadFile(file);
      setAssetId(asset.id);
      setPreview(asset.url);
    } catch (cause) {
      setPreview("");
      setAssetId("");
      toast(cause instanceof ApiClientError ? cause.message : "Não foi possível enviar a foto.", "err");
    } finally {
      URL.revokeObjectURL(local);
      setUploading(false);
    }
  }

  if (busy) {
    return (
      <div className="rounded-3xl border border-line bg-surface px-5 py-8 text-center">
        <p className="text-sm font-semibold">Anúncio com IA</p>
        <ul className="mx-auto mt-5 max-w-xs space-y-2 text-left text-sm text-muted">
          {["Analisando a imagem", "Identificando o produto", "Criando título e descrição", "Gerando hashtags"].map((step) => <li key={step} className="rounded-xl bg-white/5 px-3 py-2">{step}</li>)}
        </ul>
        <div className="mx-auto mt-6 grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-[#7C5CFF] to-[#4C2ED6] text-lg font-semibold">IA</div>
        <p className="mt-4 text-sm">Gerando seu anúncio...</p>
        <p className="text-xs text-muted">{busy}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="space-y-3 rounded-[10px] border border-line bg-surface p-4">
        <p className="text-[14px] font-bold leading-[18px]">Foto do produto</p>
        <p className="text-[10px] font-medium leading-[13px] text-muted">No celular, Câmera abre a lente traseira. Galeria escolhe uma foto já salva.</p>
        {preview ? <img src={preview} alt="Foto do produto" className="aspect-[4/5] w-full rounded-[10px] object-cover" /> : <div className="grid aspect-[4/5] place-items-center gap-2 rounded-[10px] border border-dashed border-line text-center text-[12px] leading-4 text-muted"><Camera size={20} /><span>A foto aparece aqui</span></div>}
        {uploading ? <p className="text-[10px] font-medium leading-[13px] text-muted">Enviando a foto...</p> : null}
        <div className="grid grid-cols-2 gap-2">
          <label className={`${buttonClass} cursor-pointer bg-primary text-white ${uploading ? "pointer-events-none opacity-50" : ""}`}><Camera size={16} />Câmera<input className="hidden" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void sendPhoto(file); }} /></label>
          <label className={`${buttonClass} cursor-pointer border border-line bg-surface text-ink ${uploading ? "pointer-events-none opacity-50" : ""}`}><ImageIcon size={16} />Galeria<input className="hidden" type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void sendPhoto(file); }} /></label>
        </div>
        <Button variant="secondary" onClick={async () => {
          if (!assetId) return;
          try { const result = await api<Record<string, unknown>>("/api/ai/analyze", { method: "POST", body: JSON.stringify({ assetId }) }); setAnalysis(JSON.stringify(result, null, 2)); }
          catch (cause) { toast(cause instanceof ApiClientError ? cause.message : "Análise indisponível.", "err"); }
        }}>Identificar o que está visível</Button>
        {analysis ? <pre className="max-h-40 overflow-auto rounded-lg bg-background p-2 text-xs">{analysis}</pre> : null}
      </section>
      <section className="space-y-3 rounded-2xl border border-line bg-surface p-4">
        <p className="text-[14px] font-bold leading-[18px]">Fatos confirmados</p>
        <p className="text-[12px] leading-4 text-muted">A IA só pode usar o que você confirmar. Marca, garantia, composição e preço não são inventados.</p>
        <Field label="Produto"><select className={inputClass} value={productId} onChange={(event) => { setProductId(event.target.value); const found = products.find((item) => item.id === event.target.value); if (found) setFacts({ ...facts, name: found.name }); }}><option value="">Sem vínculo</option>{products.map((item) => <option key={item.id} value={item.id}>{item.name} · {formatBrl(item.priceCents)}</option>)}</select></Field>
        <Field label="Nome confirmado"><input className={inputClass} value={facts.name} onChange={(event) => setFacts({ ...facts, name: event.target.value })} /></Field>
        <Field label="Marca, se quiser citar"><input className={inputClass} value={facts.brand} onChange={(event) => setFacts({ ...facts, brand: event.target.value })} /></Field>
        <Field label="Características confirmadas"><textarea className={areaClass} value={facts.facts} onChange={(event) => setFacts({ ...facts, facts: event.target.value })} /></Field>
        <Field label="Tom"><select className={inputClass} value={tone} onChange={(event) => setTone(event.target.value)}>{Object.entries(TONE_LABEL).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>
        <div className="flex gap-2"><Button onClick={generate}>Gerar com IA</Button><Button variant="secondary" onClick={async () => {
          const saved = await api<{ id: string }>("/api/ads", { method: "POST", body: JSON.stringify({ title: facts.name || "Anúncio", description: facts.facts || "Descrição pendente.", hashtags: [], tone, productId: productId || null, status: "DRAFT" }) });
          router.push(`/anuncios/${saved.id}`);
        }}>Escrever manualmente</Button></div>
      </section>
    </div>
  );
}

export function AdEditor({ ad }: { ad: { id: string; title: string; description: string; hashtags: string[]; tone: string; status: string } }) {
  const router = useRouter();
  const toast = useToast();
  const [title, setTitle] = useState(ad.title);
  const [description, setDescription] = useState(ad.description);
  const [hashtags, setHashtags] = useState(ad.hashtags.join(" "));
  return (
    <form className="max-w-2xl space-y-3" onSubmit={async (event) => {
      event.preventDefault();
      await api(`/api/ads/${ad.id}`, { method: "PATCH", body: JSON.stringify({ title, description, hashtags: hashtags.split(/[\s,]+/).filter(Boolean), tone: ad.tone, status: "DRAFT" }) });
      toast("Rascunho salvo.");
      router.refresh();
    }}>
      <Field label="Título"><input className={inputClass} value={title} onChange={(event) => setTitle(event.target.value)} /></Field>
      <Field label="Descrição"><textarea className={areaClass} value={description} onChange={(event) => setDescription(event.target.value)} /></Field>
      <Field label="Hashtags"><input className={inputClass} value={hashtags} onChange={(event) => setHashtags(event.target.value)} /></Field>
      <div className="flex gap-2">
        <Button type="submit" variant="secondary">Salvar rascunho</Button>
        <Button type="button" onClick={async () => { await api(`/api/ads/${ad.id}`, { method: "PATCH", body: JSON.stringify({ title, description, hashtags: hashtags.split(/[\s,]+/).filter(Boolean), tone: ad.tone, status: "PUBLISHED" }) }); toast("Anúncio publicado no cadastro."); }}>Publicar</Button>
      </div>
    </form>
  );
}

export function VideoCreator({ products, voices = [] }: { products: Array<{ id: string; name: string; imageUrl?: string | null }>; voices?: Array<{ id: string; name: string; gender: string }> }) {
  const router = useRouter();
  const toast = useToast();
  const female = voices.find((voice) => voice.gender === "FEMALE");
  const male = voices.find((voice) => voice.gender === "MALE");
  const [form, setForm] = useState({ productId: products[0]?.id || "", objective: "SELL", style: "ELEGANT", durationSec: 15, aspectRatio: "R9_16", voiceProfileId: female?.id || male?.id || "" });
  const selected = products.find((item) => item.id === form.productId);
  const styles = [
    ["ELEGANT", "Vitrine"],
    ["OFFER", "Promocional"],
    ["SOCIAL", "Redes"],
  ] as const;
  return (
    <form className="max-w-xl space-y-3" onSubmit={async (event) => {
      event.preventDefault();
      try {
        const project = await api<{ id: string }>("/api/videos", { method: "POST", body: JSON.stringify({ ...form, voiceProfileId: form.voiceProfileId || null, motionMode: "PHOTO" }) });
        router.push(`/estudio/video/${project.id}`);
      } catch (cause) { toast(cause instanceof ApiClientError ? cause.message : "Não foi possível criar o vídeo.", "err"); }
    }}>
      <div className="overflow-hidden rounded-3xl border border-line bg-surface">
        {selected?.imageUrl ? <img src={selected.imageUrl} alt="" className="aspect-[4/5] w-full object-cover" /> : <div className="grid aspect-[4/5] place-items-center text-sm text-muted">{selected?.name || "Escolha um produto"}</div>}
        <div className="p-4"><p className="text-[14px] font-bold leading-[18px]">{selected?.name || "Criar vídeo com IA"}</p><p className="text-[12px] leading-4 text-muted">Fotos com movimento. A narração entra se a voz escolhida tiver provedor.</p></div>
      </div>
      <Field label="Produto"><select className={inputClass} value={form.productId} onChange={(event) => setForm({ ...form, productId: event.target.value })}>{products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
      <Field label="Escolha o estilo"><div className="flex flex-wrap gap-2">{styles.map(([value, label]) => <button type="button" key={value} className={`${chipClass} ${form.style === value ? "bg-primary text-white" : "border border-line bg-surface text-ink"}`} onClick={() => setForm({ ...form, style: value })}>{label}</button>)}</div></Field>
      <Field label="Voz do narrador"><div className="grid grid-cols-2 gap-2">{[{ id: female?.id || "", label: "Feminina" }, { id: male?.id || "", label: "Masculina" }].map((voice) => <button type="button" key={voice.label} disabled={!voice.id} className={`${buttonClass} w-full ${form.voiceProfileId === voice.id ? "bg-primary text-white" : "border border-line bg-surface text-ink"}`} onClick={() => setForm({ ...form, voiceProfileId: voice.id })}>{voice.label}</button>)}</div></Field>
      <Field label="Duração"><div className="flex flex-wrap gap-2">{[10, 15, 30, 45, 60].map((item) => <button type="button" key={item} className={`${chipClass} ${form.durationSec === item ? "bg-primary text-white" : "border border-line bg-surface text-ink"}`} onClick={() => setForm({ ...form, durationSec: item })}>{item}s</button>)}</div></Field>
      <Button type="submit" className="w-full">Gerar vídeo</Button>
    </form>
  );
}

type Scene = { mediaAssetId?: string | null; durationMs: number; transition: "CUT" | "FADE" | "SLIDE" | "WIPE"; zoom: number; panX: number; panY: number; headline: string; caption: string; cta: string };
type Project = {
  id: string; title: string; script: string; durationSec: number; aspectRatio: keyof typeof ASPECT_DIMENSIONS; showPrice: boolean; showLogo: boolean; cta: string; narrationVolume: number; musicVolume: number;
  scenes: Scene[];
  renders: Array<{ id: string; status: PipelineStatus; progress: number; errorMessage?: string | null; outputAssetId?: string | null }>;
};

export function VideoEditor({ project }: { project: Project }) {
  const toast = useToast();
  const [draft, setDraft] = useState(project);
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState(project.renders[0]);
  const scene = draft.scenes[index];
  const ratio = ASPECT_DIMENSIONS[draft.aspectRatio];
  if (!scene) return <p className="text-sm">Este projeto não tem cenas.</p>;

  function updateScene(patch: Partial<Scene>) {
    setDraft({ ...draft, scenes: draft.scenes.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) });
  }

  async function save() {
    await api(`/api/videos/${draft.id}`, { method: "PATCH", body: JSON.stringify({ title: draft.title, script: draft.script, cta: draft.cta, showPrice: draft.showPrice, showLogo: draft.showLogo, narrationVolume: draft.narrationVolume, musicVolume: draft.musicVolume, scenes: draft.scenes }) });
    toast("Rascunho salvo.");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <div>
        <div className="mx-auto overflow-hidden rounded-2xl bg-[#0C1222]" style={{ aspectRatio: `${ratio.width} / ${ratio.height}`, maxHeight: 520 }}>
          <div className="flex h-full flex-col justify-between p-4 text-white" style={{ transform: `scale(${scene.zoom}) translate(${scene.panX * 12}px, ${scene.panY * 12}px)` }}>
            <p className="text-lg font-semibold">{scene.headline || draft.title}</p>
            <p className="text-sm">{scene.caption}</p>
          </div>
        </div>
        <p className="mt-2 text-center text-xs text-muted">Prévia de edição. O arquivo final é gerado na exportação.</p>
        {status?.outputAssetId ? <video className="mt-3 w-full rounded-xl" controls src={`/api/media/${status.outputAssetId}`} /> : null}
        {status ? <p className="mt-2 text-sm">{PIPELINE_LABEL[status.status]} · {status.progress}% {status.errorMessage || ""}</p> : null}
      </div>
      <div className="space-y-3">
        <div className="flex gap-2 overflow-auto">
          {draft.scenes.map((item, itemIndex) => <button key={itemIndex} className={`${chipClass} border ${itemIndex === index ? "border-primary text-primary" : "border-line text-ink"}`} onClick={() => setIndex(itemIndex)}>Cena {itemIndex + 1}</button>)}
        </div>
        <Field label="Título da cena"><input className={inputClass} value={scene.headline} onChange={(event) => updateScene({ headline: event.target.value })} /></Field>
        <Field label="Legenda"><input className={inputClass} value={scene.caption} onChange={(event) => updateScene({ caption: event.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Duração (ms)"><input className={inputClass} type="number" value={scene.durationMs} onChange={(event) => updateScene({ durationMs: Number(event.target.value) })} /></Field>
          <Field label="Transição"><select className={inputClass} value={scene.transition} onChange={(event) => updateScene({ transition: event.target.value as Scene["transition"] })}><option>CUT</option><option>FADE</option><option>SLIDE</option><option>WIPE</option></select></Field>
          <Field label="Zoom"><input className={inputClass} type="number" step="0.01" min="1" max="1.4" value={scene.zoom} onChange={(event) => updateScene({ zoom: Number(event.target.value) })} /></Field>
          <Field label="Pan horizontal"><input className={inputClass} type="number" step="0.1" min="-1" max="1" value={scene.panX} onChange={(event) => updateScene({ panX: Number(event.target.value) })} /></Field>
        </div>
        <Field label="Roteiro"><textarea className={areaClass} value={draft.script} onChange={(event) => setDraft({ ...draft, script: event.target.value })} /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.showPrice} onChange={(event) => setDraft({ ...draft, showPrice: event.target.checked })} /> Mostrar preço</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.showLogo} onChange={(event) => setDraft({ ...draft, showLogo: event.target.checked })} /> Guardar preferência de logo</label>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={save}>Salvar rascunho</Button>
          <Button variant="secondary" onClick={async () => {
            try { const next = await api<Project>(`/api/videos/${draft.id}/storyboard`, { method: "POST", body: JSON.stringify({ mode: "ai" }) }); setDraft(next); toast("Roteiro atualizado."); }
            catch (cause) { toast(cause instanceof ApiClientError ? cause.message : "Roteiro indisponível.", "err"); }
          }}>Gerar roteiro</Button>
          <Button onClick={async () => {
            await save();
            try {
              const render = await api<{ id: string; status: PipelineStatus; progress: number }>(`/api/videos/${draft.id}/render`, { method: "POST", headers: { "idempotency-key": crypto.randomUUID() } });
              setStatus(render);
              const timer = setInterval(async () => {
                const fresh = await api<Project>(`/api/videos/${draft.id}`);
                const latest = fresh.renders[0];
                if (latest) setStatus(latest);
                if (latest && ["COMPLETED", "FAILED", "CANCELLED"].includes(latest.status)) clearInterval(timer);
              }, 3000);
            } catch (cause) { toast(cause instanceof ApiClientError ? cause.message : "Não foi possível exportar.", "err"); }
          }}>Exportar vídeo</Button>
        </div>
      </div>
    </div>
  );
}
