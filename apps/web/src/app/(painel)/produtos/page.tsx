import Link from "next/link";
import { Eye, Filter, Plus, Search, ShoppingBag } from "lucide-react";
import { formatBrl } from "@vendefacil/types";
import { productListSchema } from "@vendefacil/validation";
import { getContainer } from "@vendefacil/business";
import { buttonClass, chipClass, inputClass } from "@/components/controls";
import { Badge, EmptyState } from "@/components/ui";
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

  const tabs = [
    { href: "/produtos", label: "Todos", count: all.meta.total, active: !query.status },
    { href: "/produtos?status=ACTIVE", label: "Ativos", count: active.meta.total, active: query.status === "ACTIVE" },
    { href: "/produtos?status=DRAFT", label: "Rascunhos", count: draft.meta.total, active: query.status === "DRAFT" },
  ];

  return (
    <div className="relative pb-16">
      <h1 className="mb-4 text-[20px] font-bold leading-6 tracking-tight">Produtos</h1>

      <form className="mb-3 flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={query.q} placeholder="Buscar produto" className={`${inputClass} pl-9`} />
        </div>
        <button className={`${buttonClass} border border-line bg-surface text-ink`} aria-label="Filtrar">
          <Filter size={16} />
        </button>
        {query.status ? <input type="hidden" name="status" value={query.status} /> : null}
      </form>

      <div className="mb-4 flex gap-2 overflow-auto">
        {tabs.map((tab) => (
          <Link key={tab.href} href={tab.href} className={`${chipClass} ${tab.active ? "bg-primary text-white" : "border border-line bg-surface text-muted"}`}>
            {tab.label} ({tab.count})
          </Link>
        ))}
      </div>

      {result.data.length === 0 ? (
        <EmptyState title="Nenhum produto neste filtro" text="Crie um produto ou limpe a busca." action={<Link href="/produtos/novo" className={`${buttonClass} bg-primary text-white`}>Novo produto</Link>} />
      ) : (
        <ul className="space-y-2">
          {result.data.map((product) => (
            <li key={product.id}>
              <Link href={`/produtos/${product.id}`} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 shadow-card">
                <span className="h-16 w-16 overflow-hidden rounded-xl bg-background">
                  {product.images[0] ? <img src={product.images[0].url} alt="" className="h-full w-full object-cover" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="block truncate text-[13px] font-semibold leading-4">{product.name}</span>
                    <Badge tone={product.status === "ACTIVE" ? "success" : "neutral"}>{product.status === "ACTIVE" ? "Ativo" : product.status === "DRAFT" ? "Rascunho" : "Arquivo"}</Badge>
                  </span>
                  <span className="mt-0.5 block text-[13px] font-semibold text-primary">{formatBrl(product.promoPriceCents ?? product.priceCents)}</span>
                  <span className="mt-1.5 flex items-center gap-3 text-[10px] font-medium text-muted">
                    <span className="inline-flex items-center gap-1">
                      <Eye size={12} /> {product.published ? "Na vitrine" : "Rascunho"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <ShoppingBag size={12} /> {product.trackStock ? `${product.stockQuantity ?? 0} un.` : "Sem estoque"}
                    </span>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link href="/produtos/novo" className="fixed bottom-24 right-4 z-20 inline-flex h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-[12px] font-semibold text-white shadow-lift md:bottom-8">
        <Plus size={16} /> Novo produto
      </Link>
    </div>
  );
}
