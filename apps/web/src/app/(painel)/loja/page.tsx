import Link from "next/link";
import { formatBrl } from "@vendefacil/types";
import { getContainer } from "@vendefacil/business";
import { StoreForm } from "@/components/ops-forms";
import { buttonClass } from "@/components/controls";
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
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-sm font-bold text-primary">{store.name.slice(0, 1)}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold leading-[18px]">{store.name}</p>
          <p className="text-[10px] font-medium leading-[13px] text-muted">{store.published ? "Vitrine no ar" : "Vitrine oculta"}</p>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {categories.slice(0, 6).map((item) => (
          <span key={item.id} className="rounded-full border border-line bg-surface px-3 py-2 text-[10px] font-medium leading-[13px] text-muted">
            {item.name}
          </span>
        ))}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <a href="#editar-loja" className={`${buttonClass} border border-line bg-surface text-ink`}>
          Editar loja
        </a>
        {store.published ? (
          <Link href={`/v/${store.slug}`} className={`${buttonClass} bg-primary text-white`}>
            Ver como cliente
          </Link>
        ) : (
          <span className={`${buttonClass} border border-line bg-surface text-muted`}>Ver como cliente</span>
        )}
      </div>

      <div className="mb-3 flex gap-4 border-b border-line text-[12px] font-semibold">
        <span className="border-b-2 border-primary pb-2 text-primary">Produtos ({products.meta.total})</span>
        <span className="pb-2 text-muted">Destaques</span>
        <span className="pb-2 text-muted">Sobre</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {products.data.map((product) => (
          <Link key={product.id} href={`/produtos/${product.id}`} className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
            {product.images[0] ? (
              <img src={product.images[0].url} alt="" className="aspect-square w-full object-cover" />
            ) : (
              <div className="grid aspect-square place-items-center bg-background text-xs text-muted">Sem foto</div>
            )}
            <div className="p-3">
              <p className="truncate text-[12px] font-semibold leading-4">{product.name}</p>
              <p className="text-[12px] font-medium text-primary">{formatBrl(product.promoPriceCents ?? product.priceCents)}</p>
            </div>
          </Link>
        ))}
      </div>

      <div id="editar-loja" className="mt-8">
        <StoreForm
          store={{
            name: store.name,
            description: store.description,
            whatsapp: store.whatsapp || "",
            published: store.published,
            slug: store.slug,
            primaryColor: store.primaryColor,
            seoTitle: store.settings?.seoTitle || "",
            seoDescription: store.settings?.seoDescription || "",
            address: store.settings?.address || "",
            allowOrders: store.settings?.allowOrders ?? true,
            showPrices: store.settings?.showPrices ?? true,
          }}
        />
      </div>
    </div>
  );
}
