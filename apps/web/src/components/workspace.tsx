"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Camera, ImageIcon, Pencil, RefreshCw, Sparkles } from "lucide-react";
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
  const absolute = created.url.startsWith("http") ? created.url : new URL(created.url, window.location.origin).toString();
  const response = await fetch(absolute, {
    method: created.method,
    headers: created.headers,
    body: file,
    credentials: absolute.startsWith(window.location.origin) ? "include" : "omit",
  });
  if (!response.ok) throw new ApiClientError("O envio do arquivo falhou.", "UPLOAD", response.status);
  return api<{ id: string; url: string }>(`/api/uploads/${created.assetId}/confirm`, { method: "POST" });
}

export function AdStudio({ products }: { products: Array<{ id: string; name: string; priceCents: number }> }) {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [assetId, setAssetId] = useState("");
  const [preview, setPreview] = useState("");
  const [tone, setTone] = useState("PROFESSIONAL");
  const [productId, setProductId] = useState(products[0]?.id || "");
  const [facts, setFacts] = useState({ name: products[0]?.name || "", brand: "", facts: "", audience: "" });
  const [busy, setBusy] = useState("");
  const [uploading, setUploading] = useState(false);
  const [draft, setDraft] = useState<{ id: string; title: string; description: string; hashtags: string[] } | null>(null);

  async function generate() {
    if (!assetId) {
      toast("Envie uma foto do produto.", "err");
      return;
    }
    const price = products.find((item) => item.id === productId)?.priceCents;
    setBusy("Gerando seu anúncio com a foto e os fatos confirmados.");
    try {
      const ad = await api<{ id: string; title: string; description: string; hashtags: string[] }>("/api/ai/ads", {
        method: "POST",
        headers: { "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({ productId: productId || null, assetIds: [assetId], tone, facts: { ...facts, priceCents: price ?? null } }),
      });
      setDraft(ad);
      setBusy("");
      setStep(3);
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

  const steps = [
    { n: 1, label: "Foto" },
    { n: 2, label: "IA" },
    { n: 3, label: "Ajustes" },
  ] as const;

  return (
    <div>
      <div className="mb-5 flex items-start justify-between px-2">
        {steps.map((item, index) => (
          <div key={item.n} className="relative flex flex-1 flex-col items-center">
            {index < steps.length - 1 ? (
              <span className={`absolute left-[calc(50%+18px)] right-[calc(-50%+18px)] top-3.5 h-[2px] ${step > item.n ? "bg-primary" : "bg-line"}`} />
            ) : null}
            <span
              className={`relative z-10 grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold ${
                step === item.n ? "bg-primary text-white" : step > item.n ? "bg-primary text-white" : "bg-[#EEF0F5] text-muted"
              }`}
            >
              {item.n}
            </span>
            <span className={`mt-1.5 text-[10px] font-semibold ${step === item.n ? "text-primary" : "text-muted"}`}>{item.label}</span>
          </div>
        ))}
      </div>

      {busy ? (
        <div className="rounded-3xl border border-line bg-surface px-5 py-8 text-center shadow-card">
          <p className="text-sm font-semibold">Anúncio com IA</p>
          <ul className="mx-auto mt-5 max-w-xs space-y-2 text-left text-sm text-muted">
            {["Analisando a imagem", "Identificando o produto", "Criando título e descrição", "Gerando hashtags"].map((item) => (
              <li key={item} className="rounded-xl bg-background px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
          <div className="mx-auto mt-6 grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-[#7C5CFF] to-[#4C2ED6] text-lg font-semibold text-white">IA</div>
          <p className="mt-4 text-sm">Gerando seu anúncio...</p>
          <p className="text-xs text-muted">{busy}</p>
        </div>
      ) : null}

      {!busy && step === 1 ? (
        <section className="space-y-3">
          {preview ? (
            <img src={preview} alt="Foto do produto" className="aspect-[4/5] w-full rounded-[22px] object-cover" />
          ) : (
            <div className="grid aspect-[4/5] place-items-center gap-3 rounded-[22px] border-2 border-dashed border-[#D9CFFF] bg-[#F7F4FF] px-6 text-center">
              <Camera size={36} className="text-primary" />
              <p className="max-w-[220px] text-[13px] font-medium leading-5 text-ink">Tire uma foto do produto ou escolha da galeria</p>
            </div>
          )}
          {uploading ? <p className="text-[10px] font-medium leading-[13px] text-muted">Enviando a foto...</p> : null}
          <div className="grid grid-cols-2 gap-2">
            <label className={`${buttonClass} cursor-pointer bg-primary text-white ${uploading ? "pointer-events-none opacity-50" : ""}`}>
              <Camera size={16} />
              Câmera
              <input className="hidden" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void sendPhoto(file); }} />
            </label>
            <label className={`${buttonClass} cursor-pointer border border-line bg-surface text-ink ${uploading ? "pointer-events-none opacity-50" : ""}`}>
              <ImageIcon size={16} />
              Galeria
              <input className="hidden" type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void sendPhoto(file); }} />
            </label>
          </div>
          <div className="flex items-start gap-2 rounded-[14px] bg-[#F3EEFF] px-3 py-3 text-[11px] font-medium leading-4 text-ink">
            <Sparkles size={16} className="mt-0.5 shrink-0 text-primary" />
            <span>A IA vai analisar a imagem e sugerir título, descrição, categoria e hashtags.</span>
          </div>
          <Button className={`w-full ${!assetId || uploading ? "!bg-[#E8EAF0] !text-muted !opacity-100" : ""}`} disabled={!assetId || uploading} onClick={() => setStep(2)}>
            Avançar
          </Button>
        </section>
      ) : null}

      {!busy && step === 2 ? (
        <section className="space-y-3 rounded-2xl border border-line bg-surface p-4 shadow-card">
          <p className="text-[14px] font-bold leading-[18px]">Fatos confirmados</p>
          <p className="text-[12px] leading-4 text-muted">A IA só usa o que você confirmar. Marca e preço não são inventados.</p>
          {preview ? <img src={preview} alt="" className="h-28 w-28 rounded-xl object-cover" /> : null}
          <Field label="Produto">
            <select
              className={inputClass}
              value={productId}
              onChange={(event) => {
                setProductId(event.target.value);
                const found = products.find((item) => item.id === event.target.value);
                if (found) setFacts({ ...facts, name: found.name });
              }}
            >
              <option value="">Sem vínculo</option>
              {products.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {formatBrl(item.priceCents)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nome confirmado">
            <input className={inputClass} value={facts.name} onChange={(event) => setFacts({ ...facts, name: event.target.value })} />
          </Field>
          <Field label="Marca, se quiser citar">
            <input className={inputClass} value={facts.brand} onChange={(event) => setFacts({ ...facts, brand: event.target.value })} />
          </Field>
          <Field label="Características confirmadas">
            <textarea className={areaClass} value={facts.facts} onChange={(event) => setFacts({ ...facts, facts: event.target.value })} />
          </Field>
          <Field label="Tom">
            <select className={inputClass} value={tone} onChange={(event) => setTone(event.target.value)}>
              {Object.entries(TONE_LABEL).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid gap-2">
            <Button className="w-full" onClick={generate}>
              Gerar com IA
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={async () => {
                const saved = await api<{ id: string }>("/api/ads", {
                  method: "POST",
                  body: JSON.stringify({ title: facts.name || "Anúncio", description: facts.facts || "Descrição pendente.", hashtags: [], tone, productId: productId || null, status: "DRAFT" }),
                });
                router.push(`/anuncios/${saved.id}`);
              }}
            >
              Escrever manualmente
            </Button>
            <button type="button" className="text-[10px] font-medium text-muted" onClick={() => setStep(1)}>
              Voltar para a foto
            </button>
          </div>
        </section>
      ) : null}

      {!busy && step === 3 && draft ? (
        <section className="space-y-3">
          <div className="relative">
            {preview ? <img src={preview} alt="" className="aspect-[4/3] w-full rounded-[20px] object-cover" /> : <div className="aspect-[4/3] rounded-[20px] bg-background" />}
            <button type="button" className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white text-ink shadow-card" onClick={() => setStep(1)} aria-label="Trocar foto">
              <Pencil size={14} />
            </button>
            <div className="mt-2 flex justify-center gap-1.5">
              {[0, 1, 2, 3].map((dot) => (
                <span key={dot} className={`h-1.5 w-1.5 rounded-full ${dot === 0 ? "bg-primary" : "bg-line"}`} />
              ))}
            </div>
          </div>
          <Field label="Título">
            <input className={`${inputClass} rounded-[12px] bg-[#F3F4F8]`} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
          </Field>
          <Field label="Descrição">
            <textarea className={`${areaClass} rounded-[12px] bg-[#F3F4F8]`} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
          </Field>
          <div>
            <p className="mb-2 text-[12px] font-semibold text-ink">Hashtags (sugeridas)</p>
            <div className="flex flex-wrap gap-2">
              {draft.hashtags.map((tag) => (
                <span key={tag} className="rounded-full bg-[#F3EEFF] px-3 py-1.5 text-[11px] font-semibold text-primary">
                  {tag.startsWith("#") ? tag : `#${tag}`}
                </span>
              ))}
            </div>
            <input
              className={`${inputClass} mt-2 rounded-[12px] bg-[#F3F4F8]`}
              value={draft.hashtags.join(" ")}
              onChange={(event) => setDraft({ ...draft, hashtags: event.target.value.split(/[\s,]+/).filter(Boolean) })}
              placeholder="Editar hashtags"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button variant="secondary" className="border border-line" onClick={() => void generate()}>
              <RefreshCw size={14} className="text-primary" />
              Regenerar
            </Button>
            <Button
              onClick={async () => {
                await api(`/api/ads/${draft.id}`, {
                  method: "PATCH",
                  body: JSON.stringify({ title: draft.title, description: draft.description, hashtags: draft.hashtags, tone, status: "DRAFT" }),
                });
                router.push(`/anuncios/${draft.id}`);
              }}
            >
              Salvar
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

export function AdEditor({
  ad,
}: {
  ad: { id: string; title: string; description: string; hashtags: string[]; tone: string; status: string; imageUrl?: string | null };
}) {
  const router = useRouter();
  const toast = useToast();
  const [title, setTitle] = useState(ad.title);
  const [description, setDescription] = useState(ad.description);
  const [tags, setTags] = useState(ad.hashtags);
  return (
    <form
      className="max-w-2xl space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        await api(`/api/ads/${ad.id}`, { method: "PATCH", body: JSON.stringify({ title, description, hashtags: tags, tone: ad.tone, status: "DRAFT" }) });
        toast("Rascunho salvo.");
        router.refresh();
      }}
    >
      <div className="relative">
        {ad.imageUrl ? (
          <img src={ad.imageUrl} alt="" className="aspect-[4/3] w-full rounded-[20px] object-cover" />
        ) : (
          <div className="grid aspect-[4/3] place-items-center rounded-[20px] bg-[#F7F4FF] text-primary">
            <Sparkles size={28} />
          </div>
        )}
        <button type="button" className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white text-ink shadow-card" onClick={() => router.push("/anuncios/novo")} aria-label="Editar imagem">
          <Pencil size={14} />
        </button>
        <div className="mt-2 flex justify-center gap-1.5">
          {[0, 1, 2, 3].map((dot) => (
            <span key={dot} className={`h-1.5 w-1.5 rounded-full ${dot === 0 ? "bg-primary" : "bg-line"}`} />
          ))}
        </div>
      </div>
      <Field label="Título">
        <input className={`${inputClass} rounded-[12px] bg-[#F3F4F8]`} value={title} onChange={(event) => setTitle(event.target.value)} />
      </Field>
      <Field label="Descrição">
        <textarea className={`${areaClass} rounded-[12px] bg-[#F3F4F8]`} value={description} onChange={(event) => setDescription(event.target.value)} />
      </Field>
      <div>
        <p className="mb-2 text-[12px] font-semibold text-ink">Hashtags (sugeridas)</p>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span key={tag} className="rounded-full bg-[#F3EEFF] px-3 py-1.5 text-[11px] font-semibold text-primary">
              {tag.startsWith("#") ? tag : `#${tag}`}
            </span>
          ))}
        </div>
        <input
          className={`${inputClass} mt-2 rounded-[12px] bg-[#F3F4F8]`}
          value={tags.join(" ")}
          onChange={(event) => setTags(event.target.value.split(/[\s,]+/).filter(Boolean))}
          placeholder="Editar hashtags"
        />
      </div>
      <div className="grid grid-cols-2 gap-2 pt-1">
        <Button type="button" variant="secondary" className="border border-line" onClick={() => router.push("/anuncios/novo")}>
          <RefreshCw size={14} className="text-primary" />
          Regenerar
        </Button>
        <Button type="submit">Salvar</Button>
      </div>
    </form>
  );
}

export function VideoCreator({ products, voices = [] }: { products: Array<{ id: string; name: string; imageUrl?: string | null }>; voices?: Array<{ id: string; name: string; gender: string }> }) {
  const router = useRouter();
  const toast = useToast();
  const female = voices.find((voice) => voice.gender === "FEMALE");
  const male = voices.find((voice) => voice.gender === "MALE");
  const [form, setForm] = useState({ productId: products[0]?.id || "", objective: "SELL", style: "ELEGANT", durationSec: 30, aspectRatio: "R9_16", voiceProfileId: female?.id || male?.id || "" });
  const selected = products.find((item) => item.id === form.productId);
  const styles = [
    ["ELEGANT", "Comercial"],
    ["OFFER", "Oferta"],
    ["SOCIAL", "Apresentação"],
    ["VITRINE", "Vitrine"],
    ["MINIMAL", "Minimalista"],
    ["REDES", "Redes sociais"],
  ] as const;
  const ratios = [
    ["R9_16", "9:16", "Reels/Stories"],
    ["R1_1", "1:1", "Feed"],
    ["R16_9", "16:9", "YouTube"],
  ] as const;
  return (
    <form
      className="max-w-xl space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        try {
          const project = await api<{ id: string }>("/api/videos", { method: "POST", body: JSON.stringify({ ...form, voiceProfileId: form.voiceProfileId || null, motionMode: "PHOTO" }) });
          router.push(`/estudio/video/${project.id}`);
        } catch (cause) {
          toast(cause instanceof ApiClientError ? cause.message : "Não foi possível criar o vídeo.", "err");
        }
      }}
    >
      {/* Product card */}
      {selected ? (
        <div className="flex items-center gap-3 rounded-[16px] border border-line bg-surface p-3 shadow-card">
          {selected.imageUrl ? (
            <img src={selected.imageUrl} alt="" className="h-14 w-14 rounded-xl object-cover" />
          ) : (
            <span className="grid h-14 w-14 place-items-center rounded-xl bg-background text-[10px] text-muted">Foto</span>
          )}
          <span className="text-[13px] font-bold leading-4 text-ink">{selected.name}</span>
        </div>
      ) : null}

      <Field label="Objetivo do vídeo">
        <select className={`${inputClass} rounded-[12px]`} value={form.objective} onChange={(event) => setForm({ ...form, objective: event.target.value })}>
          <option value="SELL">Vender o produto</option>
          <option value="AWARENESS">Apresentar a marca</option>
          <option value="OFFER">Destacar oferta</option>
        </select>
      </Field>

      <div>
        <p className="mb-2 text-[12px] font-semibold text-ink">Estilo do vídeo</p>
        <div className="flex flex-wrap gap-2">
          {styles.map(([value, label]) => (
            <button type="button" key={value} className={`${chipClass} ${form.style === value ? "bg-primary text-white" : "border border-line bg-surface text-ink"}`} onClick={() => setForm({ ...form, style: value })}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[12px] font-semibold text-ink">Duração</p>
        <div className="flex gap-2">
          {[15, 30, 45, 60].map((item) => (
            <button type="button" key={item} className={`${chipClass} ${form.durationSec === item ? "bg-primary text-white" : "border border-line bg-surface text-ink"}`} onClick={() => setForm({ ...form, durationSec: item })}>
              {item}s
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[12px] font-semibold text-ink">Formato</p>
        <div className="flex gap-2">
          {ratios.map(([value, ratio, label]) => (
            <button
              type="button"
              key={value}
              className={`flex flex-col items-center rounded-[14px] px-4 py-2.5 text-center ${form.aspectRatio === value ? "border-2 border-primary bg-primary-soft text-primary" : "border border-line bg-surface text-ink"}`}
              onClick={() => setForm({ ...form, aspectRatio: value })}
            >
              <span className="text-[13px] font-bold leading-4">{ratio}</span>
              <span className="mt-0.5 text-[9px] font-medium leading-3 text-muted">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <Field label="Produto">
        <select className={`${inputClass} rounded-[12px]`} value={form.productId} onChange={(event) => setForm({ ...form, productId: event.target.value })}>
          {products.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </Field>

      <Button type="submit" className="w-full !h-12 !rounded-[14px] !text-[14px]">
        Gerar vídeo com IA
      </Button>
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
  const [tab, setTab] = useState<"cenas" | "texto" | "audio" | "transicao" | "velocidade">("cenas");
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

  const tabs = [
    { key: "cenas" as const, label: "Cenas", icon: "🎬" },
    { key: "texto" as const, label: "Texto", icon: "T" },
    { key: "audio" as const, label: "Áudio", icon: "🔊" },
    { key: "transicao" as const, label: "Transição", icon: "⇄" },
    { key: "velocidade" as const, label: "Velocidade", icon: "⏩" },
  ];

  return (
    <div className="space-y-3">
      {/* Video preview – dark card */}
      <div className="relative mx-auto overflow-hidden rounded-[20px] bg-gradient-to-br from-[#2A1B5C] to-[#0F0A24]" style={{ aspectRatio: `${ratio.width} / ${ratio.height}`, maxHeight: 420 }}>
        <div className="flex h-full flex-col justify-between p-5 text-white" style={{ transform: `scale(${scene.zoom}) translate(${scene.panX * 12}px, ${scene.panY * 12}px)` }}>
          <div>
            <p className="text-[18px] font-bold leading-6">{scene.headline || draft.title}</p>
            <p className="mt-1 text-[12px] leading-4 text-white/80">{scene.caption}</p>
          </div>
        </div>
        {/* Play overlay */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-4 pb-4 pt-8">
          <div className="flex items-center gap-2 text-[11px] font-medium text-white/80">
            <span>▶</span>
            <span>0:00 / 0:{String(draft.durationSec).padStart(2, "0")}</span>
            <span className="ml-auto">🔊</span>
          </div>
        </div>
        {status?.outputAssetId ? <video className="absolute inset-0 h-full w-full rounded-[20px] object-cover" controls src={`/api/media/${status.outputAssetId}`} /> : null}
      </div>

      {/* Scene thumbnails */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1">
        {draft.scenes.map((item, itemIndex) => (
          <button
            key={itemIndex}
            type="button"
            className={`h-14 w-16 shrink-0 rounded-xl ${itemIndex === index ? "ring-2 ring-primary" : "ring-1 ring-line"} overflow-hidden bg-gradient-to-br from-[#2A1B5C] to-[#0F0A24]`}
            onClick={() => setIndex(itemIndex)}
          >
            <span className="flex h-full items-center justify-center text-[9px] font-semibold text-white/70">Cena {itemIndex + 1}</span>
          </button>
        ))}
      </div>

      {status ? <p className="text-[11px] font-medium text-muted">{PIPELINE_LABEL[status.status]} · {status.progress}% {status.errorMessage || ""}</p> : null}

      {/* Bottom toolbar */}
      <div className="flex justify-between rounded-[18px] border border-line bg-surface p-1.5 shadow-card">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-[9px] font-semibold transition ${tab === t.key ? "bg-primary-soft text-primary" : "text-muted hover:bg-background"}`}
          >
            <span className="text-sm">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "cenas" ? (
        <div className="space-y-3">
          <Field label="Título da cena"><input className={inputClass} value={scene.headline} onChange={(event) => updateScene({ headline: event.target.value })} /></Field>
          <Field label="Legenda"><input className={inputClass} value={scene.caption} onChange={(event) => updateScene({ caption: event.target.value })} /></Field>
          <Field label="Duração (ms)"><input className={inputClass} type="number" value={scene.durationMs} onChange={(event) => updateScene({ durationMs: Number(event.target.value) })} /></Field>
        </div>
      ) : tab === "texto" ? (
        <div className="space-y-3">
          <Field label="Roteiro"><textarea className={areaClass} value={draft.script} onChange={(event) => setDraft({ ...draft, script: event.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.showPrice} onChange={(event) => setDraft({ ...draft, showPrice: event.target.checked })} /> Mostrar preço</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.showLogo} onChange={(event) => setDraft({ ...draft, showLogo: event.target.checked })} /> Logo da loja</label>
        </div>
      ) : tab === "audio" ? (
        <div className="space-y-3">
          <Field label="Volume narração"><input className={inputClass} type="range" min="0" max="1" step="0.05" value={draft.narrationVolume} onChange={(event) => setDraft({ ...draft, narrationVolume: Number(event.target.value) })} /></Field>
          <Field label="Volume música"><input className={inputClass} type="range" min="0" max="1" step="0.05" value={draft.musicVolume} onChange={(event) => setDraft({ ...draft, musicVolume: Number(event.target.value) })} /></Field>
        </div>
      ) : tab === "transicao" ? (
        <div className="space-y-3">
          <Field label="Transição"><select className={inputClass} value={scene.transition} onChange={(event) => updateScene({ transition: event.target.value as Scene["transition"] })}><option>CUT</option><option>FADE</option><option>SLIDE</option><option>WIPE</option></select></Field>
        </div>
      ) : (
        <div className="space-y-3">
          <Field label="Zoom"><input className={inputClass} type="number" step="0.01" min="1" max="1.4" value={scene.zoom} onChange={(event) => updateScene({ zoom: Number(event.target.value) })} /></Field>
          <Field label="Pan horizontal"><input className={inputClass} type="number" step="0.1" min="-1" max="1" value={scene.panX} onChange={(event) => updateScene({ panX: Number(event.target.value) })} /></Field>
        </div>
      )}

      {/* Export button */}
      {status?.outputAssetId ? (
        <a className={`${buttonClass} w-full bg-primary text-white !h-12 !rounded-[14px] !text-[14px] justify-center`} href={`/api/media/${status.outputAssetId}`} download>
          ⬇ Exportar vídeo
        </a>
      ) : (
        <Button
          className="w-full !h-12 !rounded-[14px] !text-[14px]"
          onClick={async () => {
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
            } catch (cause) { toast(cause instanceof ApiClientError ? cause.message : "Exportação indisponível sem o pipeline de render.", "err"); }
          }}
        >
          ⬇ Exportar vídeo
        </Button>
      )}
    </div>
  );
}
