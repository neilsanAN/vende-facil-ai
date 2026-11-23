import Link from "next/link";
import { formatBrl } from "@vendefacil/types";
import { getContainer } from "@vendefacil/business";
import { StoreForm } from "@/components/ops-forms";
import { PageHeader } from "@/components/ui";
import { tenant } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await tenant();
  const container = getContainer();
  const store = await container.db.store.findUnique({ where: { organizationId: session.organizationId }, include: { settings: true } });
  if (!store) return null;
  const [products, categories] = await Promise.all([
    container.catalog.list(session, { q: "", sort: "recent", page: 1, pageSize: 12, published: "true" }),
    container.db.category.findMany({ where: { organizationId: session.organizationId }, orderBy: { name: "asc" } }),
  ]);
  return (
    <div>
      <PageHeader title="Minha loja" text={store.description || "Sua vitrine para compartilhar."} />
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-sm font-bold text-[#D7CCFF]">{store.name.slice(0, 1)}</span>
        <div>
          <p className="text-[14px] font-bold leading-[18px]">{store.name}</p>
          <p className="text-[10px] font-medium leading-[13px] text-muted">{store.published ? "Vitrine no ar" : "Vitrine oculta"}</p>
        </div>
      </div>
      {store.published ? <Link href={`/v/${store.slug}`} className="mb-4 flex h-10 items-center justify-center rounded-full bg-primary px-4 text-[12px] font-semibold leading-[15px] text-white">Compartilhar loja</Link> : <p className="mb-4 rounded-xl border border-line bg-surface px-3 py-3 text-sm text-muted">A vitrine pública abre quando a publicação está ligada.</p>}
      <div className="mb-4 flex gap-2 overflow-auto">{categories.map((item) => <span key={item.id} className="rounded-full border border-line bg-surface px-3 py-2 text-[10px] font-medium leading-[13px] text-muted">{item.name}</span>)}</div>
      <div className="grid grid-cols-2 gap-3">
        {products.data.map((product) => (
          <Link key={product.id} href={`/produtos/${product.id}`} className="overflow-hidden rounded-2xl border border-line bg-surface">
            {product.images[0] ? <img src={product.images[0].url} alt="" className="aspect-square w-full object-cover" /> : <div className="grid aspect-[4/3] place-items-center bg-[#0C1222] text-xs text-muted">Sem foto</div>}
            <div className="p-3"><p className="text-sm font-semibold">{product.name}</p><p className="text-sm text-[#C4B5FF]">{formatBrl(product.promoPriceCents ?? product.priceCents)}</p></div>
          </Link>
        ))}
      </div>
      <div className="mt-8">
        <StoreForm store={{ name: store.name, description: store.description, whatsapp: store.whatsapp || "", published: store.published, slug: store.slug, primaryColor: store.primaryColor, seoTitle: store.settings?.seoTitle || "", seoDescription: store.settings?.seoDescription || "", address: store.settings?.address || "", allowOrders: store.settings?.allowOrders ?? true, showPrices: store.settings?.showPrices ?? true }} />
      </div>
    </div>
  );
}
