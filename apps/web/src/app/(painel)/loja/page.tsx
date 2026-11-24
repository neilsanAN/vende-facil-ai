import Link from "next/link";
import { Heart, Pencil, Store } from "lucide-react";
import { formatBrl } from "@vendefacil/types";
import { getContainer } from "@vendefacil/business";
import { buttonClass } from "@/components/controls";
import { StoreForm } from "@/components/ops-forms";
import { PageHeader } from "@/components/ui";
import { tenant } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await tenant();
  const params = await searchParams;
  const tab = params.tab === "destaques" || params.tab === "sobre" ? params.tab : "produtos";
  const container = getContainer();
  const store = await container.db.store.findUnique({ where: { organizationId: session.organizationId }, include: { settings: true } });
  if (!store) return null;
  const products = await container.catalog.list(session, { q: "", sort: "recent", page: 1, pageSize: 12, published: "true" });
  const categories = store.description ? store.description.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 3) : [];

  return (
    <div>
      <PageHeader backHref="/mais" title="Minha loja" />
      <div className="relative mb-16 overflow-hidden rounded-[20px] bg-gradient-to-br from-[#5B3DF0] via-[#7C5CFF] to-[#3B82F6] px-4 pb-14 pt-6 shadow-lift">
        <span aria-hidden className="absolute -right-6 top-4 h-20 w-20 rounded-full bg-white/10" />
        <span aria-hidden className="absolute left-4 top-8 h-12 w-12 rounded-full bg-white/10" />
      </div>
      <div className="-mt-12 mb-4 flex flex-col items-center gap-2 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-2xl border-4 border-background bg-gradient-to-br from-[#8B6CFF] to-[#5B3DF0] text-white shadow-lift">
          <Store size={24} />
        </span>
        <h2 className="text-[18px] font-bold leading-5 text-ink">{store.name}</h2>
        {categories.length > 0 ? (
          <p className="text-[11px] font-medium text-muted">{categories.join(" · ")}</p>
        ) : (
          <p className="text-[11px] font-medium text-muted">{store.published ? "Vitrine no ar" : "Vitrine oculta"}</p>
        )}
      </div>

      {/* Action buttons */}
      <div className="mb-5 grid grid-cols-2 gap-2">
        <a href="#editar-loja" className={`${buttonClass} border border-line bg-surface text-ink`}>
          <Pencil size={14} /> Editar loja
        </a>
        {store.published ? (
          <Link href={`/v/${store.slug}`} className={`${buttonClass} bg-primary text-white`}>
            Ver como cliente
          </Link>
        ) : (
          <span className={`${buttonClass} border border-line bg-surface text-muted`}>Ver como cliente</span>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2 overflow-auto">
        {([
          { key: "produtos", label: `Produtos (${products.meta.total})`, href: "/loja?tab=produtos" },
          { key: "destaques", label: "Destaques", href: "/loja?tab=destaques" },
          { key: "sobre", label: "Sobre", href: "/loja?tab=sobre" },
        ] as const).map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={`inline-flex items-center rounded-full px-4 py-2 text-[11px] font-semibold leading-[14px] transition ${
              tab === item.key ? "bg-primary text-white" : "border border-line bg-surface text-ink"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {/* Content */}
      {tab === "sobre" ? (
        <div className="rounded-[18px] border border-line bg-surface p-4 text-[12px] leading-4 text-muted shadow-card">
          <p className="text-[13px] font-semibold text-ink">{store.name}</p>
          <p className="mt-2">{store.description || "Sem descrição ainda."}</p>
          {store.whatsapp ? <p className="mt-3">WhatsApp: {store.whatsapp}</p> : null}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {(tab === "destaques" ? products.data.slice(0, 4) : products.data).map((product) => (
            <Link key={product.id} href={`/produtos/${product.id}`} className="relative overflow-hidden rounded-[18px] border border-line bg-surface shadow-card">
              <span className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-line shadow-card">
                <Heart size={14} />
              </span>
              {product.images[0] ? (
                <img src={product.images[0].url} alt="" className="aspect-square w-full object-cover" />
              ) : (
                <div className="grid aspect-square place-items-center bg-background text-xs text-muted">Sem foto</div>
              )}
              <div className="p-2.5">
                <p className="truncate text-[12px] font-semibold leading-4">{product.name}</p>
                <p className="text-[12px] font-bold text-ink">{formatBrl(product.promoPriceCents ?? product.priceCents)}</p>
              </div>
            </Link>
          ))}
          {products.data.length === 0 ? <p className="col-span-2 text-sm text-muted">Publique produtos para aparecerem na loja.</p> : null}
        </div>
      )}

      {/* Store edit form */}
      <div id="editar-loja" className="mt-8">
        <h2 className="mb-3 text-[13px] font-semibold">Editar loja</h2>
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
