import Link from "next/link";
import { Bell, Camera, Clapperboard, DollarSign, Eye, ImageIcon, MousePointer2, Share2, ShoppingCart, Sparkles } from "lucide-react";
import { formatBrl } from "@vendefacil/types";
import { getContainer } from "@vendefacil/business";
import { tenant } from "@/server/session";

export const dynamic = "force-dynamic";

const actions = [
  { href: "/anuncios/novo", label: "Anúncio com IA", icon: Sparkles },
  { href: "/estudio/video/novo", label: "Vídeo com voz", icon: Clapperboard },
  { href: "/estudio/arte", label: "Arte para redes", icon: ImageIcon },
  { href: "/publicar", label: "Publicar nas redes", icon: Share2 },
] as const;

export default async function InicioPage() {
  const session = await tenant();
  const data = await getContainer().commerce.dashboard(session);
  const { stats, recent } = data;
  const first = data.greeting.name;
  const metrics = [
    { label: "Visualizações", value: String(stats.productViews || stats.views), icon: Eye },
    { label: "Cliques", value: String(stats.whatsappClicks), icon: MousePointer2 },
    { label: "Pedidos", value: String(stats.orders), icon: ShoppingCart },
    { label: "Vendas", value: formatBrl(stats.salesCents), icon: DollarSign },
  ] as const;

  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#8B6CFF] to-[#5B3DF0] text-sm font-bold text-white shadow-card">
          {first.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-[20px] font-bold leading-6 tracking-tight text-ink">Olá, {first}!</h1>
          <p className="text-[12px] font-medium text-muted">Pronto para vender hoje?</p>
        </div>
        <button type="button" aria-label="Notificações" className="grid h-10 w-10 place-items-center rounded-full border border-line bg-surface text-muted">
          <Bell size={18} />
        </button>
      </div>

      <Link href="/anuncios/novo" className="relative mt-5 flex items-center justify-between overflow-hidden rounded-[22px] bg-gradient-to-r from-[#8B6CFF] to-[#6D4AFF] px-5 py-5 text-white shadow-lift">
        <span className="relative z-10 max-w-[220px]">
          <strong className="block text-[15px] font-bold leading-5">Crie seu próximo anúncio</strong>
          <span className="mt-1.5 block text-[11px] font-medium leading-[15px] text-white/85">Tire uma foto, use a IA e divulgue em todas as suas redes.</span>
        </span>
        <span className="relative z-10 grid h-14 w-14 place-items-center rounded-full bg-white/15 ring-8 ring-white/10">
          <Camera size={22} />
        </span>
      </Link>

      <div className="mt-5 grid grid-cols-4 gap-2">
        {actions.map((action) => (
          <Link key={action.href} href={action.href} className="flex flex-col items-center gap-2 px-0.5 text-center text-[10px] font-semibold leading-[12px] text-ink">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-[#8B6CFF] to-[#6D4AFF] text-white shadow-[0_8px_18px_rgba(109,74,255,0.35)]">
              <action.icon size={18} strokeWidth={1.9} />
            </span>
            {action.label}
          </Link>
        ))}
      </div>

      <div className="mt-6 flex items-end justify-between">
        <h2 className="text-[13px] font-bold leading-4 text-ink">Resultados (7 dias)</h2>
        <Link href="/estatisticas" className="text-[11px] font-semibold text-primary">
          Ver tudo
        </Link>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {metrics.map((item) => (
          <div key={item.label} className="rounded-[16px] border border-line bg-surface px-2 py-3 shadow-card">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary-soft text-primary">
              <item.icon size={14} />
            </span>
            <p className="mt-2 truncate text-[13px] font-bold leading-4 text-ink sm:text-[15px]">{item.value}</p>
            <p className="mt-0.5 text-[9px] font-medium leading-3 text-muted">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="mb-2 mt-6 flex items-end justify-between">
        <h2 className="text-[13px] font-bold leading-4">Produtos recentes</h2>
        <Link href="/produtos" className="text-[11px] font-semibold text-primary">
          Ver todos
        </Link>
      </div>
      {recent.length === 0 ? (
        <p className="text-sm text-muted">Cadastre o primeiro produto para aparecer aqui.</p>
      ) : (
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
          {recent.map((product) => (
            <Link key={product.id} href={`/produtos/${product.id}`} className="w-[118px] shrink-0 overflow-hidden rounded-[18px] border border-line bg-surface shadow-card">
              <div className="aspect-square bg-background">
                {product.images[0] ? <img src={`/api/media/${product.images[0].mediaAssetId}`} alt="" className="h-full w-full object-cover" /> : null}
              </div>
              <div className="px-2 py-2">
                <p className="truncate text-[10px] font-semibold leading-3 text-ink">{product.name}</p>
                <p className="mt-0.5 text-[10px] font-bold text-ink">{formatBrl(product.promoPriceCents ?? product.priceCents)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
