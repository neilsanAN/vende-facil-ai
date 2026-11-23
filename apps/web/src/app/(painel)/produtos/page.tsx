import Link from "next/link";
import { formatBrl } from "@vendefacil/types";
import { productListSchema } from "@vendefacil/validation";
import { getContainer } from "@vendefacil/business";
import { buttonClass, inputClass } from "@/components/controls";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { tenant } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const session = await tenant();
  const query = productListSchema.parse(await searchParams);
  const result = await getContainer().catalog.list(session, query);
  return (
    <div>
      <PageHeader title="Produtos" text="Cadastro comercial da loja." action={<Link href="/produtos/novo" className={`${buttonClass} bg-primary text-white`}>Novo produto</Link>} />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={query.q} placeholder="Buscar" className={`${inputClass} w-auto min-w-[160px] flex-1`} />
        <select name="status" defaultValue={query.status || ""} className={`${inputClass} w-auto`}><option value="">Todos</option><option value="ACTIVE">Ativos</option><option value="DRAFT">Rascunhos</option><option value="ARCHIVED">Arquivados</option></select>
        <button className={`${buttonClass} border border-line bg-surface text-ink`}>Filtrar</button>
      </form>
      {result.data.length === 0 ? <EmptyState title="Nenhum produto neste filtro" text="Crie um produto ou limpe a busca." /> : (
        <ul className="space-y-2">
          {result.data.map((product) => (
            <li key={product.id}><Link href={`/produtos/${product.id}`} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3"><span className="h-14 w-14 overflow-hidden rounded-lg bg-background">{product.images[0] ? <img src={product.images[0].url} alt="" className="h-full w-full object-cover" /> : null}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{product.name}</span><span className="text-xs text-muted">{formatBrl(product.promoPriceCents ?? product.priceCents)}</span></span><Badge tone={product.published ? "success" : "neutral"}>{product.published ? "No ar" : "Rascunho"}</Badge></Link></li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-muted">{result.meta.total} produtos</p>
    </div>
  );
}
