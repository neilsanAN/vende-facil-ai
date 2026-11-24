import Link from "next/link";
import { Eye, Plus, Search, ShoppingCart, SlidersHorizontal } from "lucide-react";
import { formatBrl } from "@vendefacil/types";
import { productListSchema } from "@vendefacil/validation";
import { getContainer } from "@vendefacil/business";
import { buttonClass, chipClass, inputClass } from "@/components/controls";
import { ProductCardMenu } from "@/components/product-card-menu";
import { EmptyState } from "@/components/ui";
import { tenant } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const session = await tenant();
  const query = productListSchema.parse(await searchParams);
  const container = getContainer();
  const [result, all, active, draft] = await Promise.all([
    container.catalog.list(session, query),
    container.catalog.list(session, { ...query, status: undefined, page: 1, pageSize: 1 }),
    container.catalog.list(session, { ...query, status: "ACTIVE", page: 1, pageSize: 1 }),
    container.catalog.list(session, { ...query, status: "DRAFT", page: 1, pageSize: 1 }),
  ]);

  const productIds = result.data.map((item) => item.id);
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [viewGroups, saleGroups] = await Promise.all([
    productIds.length
      ? container.db.productView.groupBy({
          by: ["productId"],
          where: { organizationId: session.organizationId, createdAt: { gte: since }, productId: { in: productIds } },
          _count: { productId: true },
        })
      : Promise.resolve([]),
    productIds.length
      ? container.db.orderItem.groupBy({
          by: ["productId"],
          where: { productId: { in: productIds }, order: { organizationId: session.organizationId } },
          _sum: { quantity: true },
        })
      : Promise.resolve([]),
  ]);
  const viewsByProduct = new Map(viewGroups.map((item) => [item.productId, item._count.productId]));
  const salesByProduct = new Map(saleGroups.filter((item) => item.productId).map((item) => [item.productId as string, item._sum.quantity ?? 0]));

  const tabs = [
    { href: "/produtos", label: "Todos", count: all.meta.total, active: !query.status },
    { href: "/produtos?status=ACTIVE", label: "Ativos", count: active.meta.total, active: query.status === "ACTIVE" },
    { href: "/produtos?status=DRAFT", label: "Rascunhos", count: draft.meta.total, active: query.status === "DRAFT" },
  ];

  return (
    <div className="relative pb-16">
      <h1 className="mb-4 text-[22px] font-bold leading-7 tracking-tight text-ink">Produtos</h1>

      <form className="mb-3 flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={query.q} placeholder="Buscar produto..." className={`${inputClass} rounded-full bg-[#F3F4F8] pl-10`} />
        </div>
        <button type="submit" className="grid h-10 w-10 place-items-center rounded-full border border-line bg-surface text-ink" aria-label="Filtrar">
          <SlidersHorizontal size={16} />
        </button>
        {query.status ? <input type="hidden" name="status" value={query.status} /> : null}
      </form>

      <div className="mb-4 flex gap-2 overflow-auto">
        {tabs.map((tab) => (
          <Link key={tab.href} href={tab.href} className={`${chipClass} ${tab.active ? "bg-primary text-white" : "border border-line bg-surface text-ink"}`}>
            {tab.label} ({tab.count})
          </Link>
        ))}
      </div>

      {result.data.length === 0 ? (
        <EmptyState title="Nenhum produto neste filtro" text="Crie um produto ou limpe a busca." action={<Link href="/produtos/novo" className={`${buttonClass} bg-primary text-white`}>Novo produto</Link>} />
      ) : (
        <ul className="space-y-2.5">
          {result.data.map((product) => {
            const views = viewsByProduct.get(product.id) || 0;
            const sales = salesByProduct.get(product.id) || 0;
            return (
              <li key={product.id}>
                <div className="flex items-start gap-3 rounded-[18px] border border-line bg-surface p-3 shadow-card">
                  <Link href={`/produtos/${product.id}`} className="h-[64px] w-[64px] shrink-0 overflow-hidden rounded-[14px] bg-background">
                    {product.images[0] ? <img src={product.images[0].url} alt="" className="h-full w-full object-cover" /> : null}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/produtos/${product.id}`} className="block min-w-0">
                      <p className="truncate text-[13px] font-bold leading-4 text-ink">{product.name}</p>
                      <p className="mt-1 text-[13px] font-bold text-ink">{formatBrl(product.promoPriceCents ?? product.priceCents)}</p>
                    </Link>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          product.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : product.status === "DRAFT" ? "bg-orange-50 text-orange-700" : "bg-background text-muted"
                        }`}
                      >
                        {product.status === "ACTIVE" ? "Ativo" : product.status === "DRAFT" ? "Rascunho" : "Arquivo"}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted">
                        <Eye size={12} /> {views}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted">
                        <ShoppingCart size={12} /> {sales}
                      </span>
                    </div>
                  </div>
                  <ProductCardMenu id={product.id} name={product.name} />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Link href="/produtos/novo" className="fixed bottom-24 right-4 z-20 inline-flex h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-[12px] font-semibold text-white shadow-lift md:bottom-8">
        <Plus size={16} /> Novo produto
      </Link>
    </div>
  );
}
