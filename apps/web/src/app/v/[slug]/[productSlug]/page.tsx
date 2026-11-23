import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatBrl } from "@vendefacil/types";
import { getContainer } from "@vendefacil/business";
import { Track } from "@/components/track";
import { PublicOrderForm } from "@/components/public-store";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; productSlug: string }> }): Promise<Metadata> {
  const { slug, productSlug } = await params;
  const data = await getContainer().commerce.publicProduct(slug, productSlug);
  if (!data) return { title: "Produto" };
  return { title: `${data.product.name} · ${data.store.name}`, description: data.product.description, openGraph: { title: data.product.name, description: data.product.description, images: data.product.images[0] ? [data.product.images[0].url] : [] } };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string; productSlug: string }> }) {
  const { slug, productSlug } = await params;
  const data = await getContainer().commerce.publicProduct(slug, productSlug);
  if (!data) notFound();
  const price = data.product.promoPriceCents ?? data.product.priceCents;
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <Track slug={slug} type="product_view" productSlug={productSlug} />
      <a className="text-sm text-primary" href={`/v/${slug}`}>Voltar para {data.store.name}</a>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div>{data.product.images[0] ? <img src={data.product.images[0].url} alt={data.product.images[0].alt} className="w-full rounded-2xl object-cover" /> : null}</div>
        <div>
          <h1 className="text-2xl font-semibold">{data.product.name}</h1>
          {data.store.showPrices ? <p className="mt-2 text-xl text-primary">{formatBrl(price)}</p> : null}
          <p className="mt-3 text-sm text-muted">{data.product.description}</p>
          {data.store.whatsappUrl ? <a className="mt-4 inline-flex h-10 items-center rounded-full bg-primary px-4 text-[12px] font-semibold leading-[15px] text-white" href={data.store.whatsappUrl}>Chamar no WhatsApp</a> : null}
          {data.store.allowOrders ? <PublicOrderForm slug={slug} mode="order" productId={data.product.id} /> : null}
        </div>
      </div>
    </main>
  );
}
