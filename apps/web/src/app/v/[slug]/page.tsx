import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatBrl } from "@vendefacil/types";
import { getContainer } from "@vendefacil/business";
import { Track } from "@/components/track";
import { PublicOrderForm } from "@/components/public-store";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getContainer().commerce.publicStore(slug);
  if (!data) return { title: "Loja" };
  return { title: data.store.seoTitle, description: data.store.seoDescription, openGraph: { title: data.store.seoTitle, description: data.store.seoDescription } };
}

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getContainer().commerce.publicStore(slug);
  if (!data) notFound();
  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 py-6">
      <Track slug={slug} type="store_view" />
      <header className="mb-5">
        <p className="text-xs text-muted">Vitrine</p>
        <h1 className="text-2xl font-semibold">{data.store.name}</h1>
        <p className="mt-1 text-sm text-muted">{data.store.description}</p>
        <div className="mt-3 flex gap-2 overflow-auto">{data.categories.map((item) => <span key={item.id} className="rounded-full border border-line px-3 py-1 text-xs text-muted">{item.name}</span>)}</div>
        {data.store.whatsappUrl ? <a className="mt-4 inline-flex h-10 items-center rounded-full bg-primary px-4 text-[12px] font-semibold leading-[15px] text-white" href={data.store.whatsappUrl}>Chamar no WhatsApp</a> : null}
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        {data.products.map((product) => (
          <a key={product.id} href={`/v/${slug}/${product.slug}`} className="overflow-hidden rounded-2xl border border-line bg-surface">
            {product.imageUrl ? <img src={product.imageUrl} alt="" className="aspect-square w-full object-cover" /> : <div className="aspect-square bg-background" />}
            <div className="p-3"><h2 className="text-sm font-semibold">{product.name}</h2>{data.store.showPrices ? <p className="text-sm text-primary">{formatBrl(product.promoPriceCents ?? product.priceCents)}</p> : null}{product.available ? null : <p className="text-xs text-danger">Indisponível</p>}</div>
          </a>
        ))}
      </div>
      <PublicOrderForm slug={slug} mode="contact" />
    </main>
  );
}
