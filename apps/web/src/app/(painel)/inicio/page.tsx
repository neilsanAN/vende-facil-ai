import Link from "next/link";
import { Bell, Camera, DollarSign, Eye, ImageIcon, MousePointer2, Share2, ShoppingCart, Sparkles, Video } from "lucide-react";
import { formatBrl } from "@vendefacil/types";
import { getContainer } from "@vendefacil/business";
import { tenant } from "@/server/session";

export const dynamic = "force-dynamic";

const actions = [
  { href: "/anuncios/novo", label: "Anúncio com IA", icon: Sparkles },
  { href: "/estudio/video/novo", label: "Vídeo com voz", icon: Video },
  { href: "/estudio/arte", label: "Arte para redes", icon: ImageIcon },
  { href: "/publicar", label: "Publicar nas redes", icon: Share2 },
] as const;

export default async function InicioPage() {
  const session = await tenant();
  const data = await getContainer().commerce.dashboard(session);
  const { stats, recent } = data;
  const first =
    (data.greeting?.name || "").trim() ||
    session.name.trim().split(/\s+/)[0] ||
    session.email.split("@")[0] ||
    "você";
  const metrics = [
    { label: "Visualizações", value: String(stats.productViews || stats.views), icon: Eye, tone: "text-primary bg-primary-soft" },
    { label: "Cliques", value: String(stats.whatsappClicks), icon: MousePointer2, tone: "text-primary bg-primary-soft" },
    { label: "Pedidos", value: String(stats.orders), icon: ShoppingCart, tone: "text-primary bg-primary-soft" },
    { label: "Vendas", value: formatBrl(stats.salesCents), icon: DollarSign, tone: "text-success bg-emerald-50" },
  ] as const;

  return (
    <div>
      <div className="flex items-center gap-2.5">
        <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#8B6CFF] to-[#5B3DF0] text-xs font-bold text-white shadow-card ring-2 ring-white">
          {first.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-[18px] font-bold leading-5 tracking-tight text-ink">
            Olá, {first}! <span aria-hidden>👋</span>
          </h1>
          <p className="text-[11px] font-medium text-muted">Pronto para vender hoje?</p>
        </div>
        <button type="button" aria-label="Notificações" className="grid h-8 w-8 place-items-center rounded-full border border-line bg-surface text-muted">
          <Bell size={15} />
        </button>
      </div>

      <Link href="/anuncios/novo" className="relative mt-3 flex items-center justify-between overflow-hidden rounded-[16px] bg-gradient-to-r from-[#8B6CFF] to-[#6D4AFF] px-3.5 py-3 text-white shadow-lift">
        <span className="relative z-10 max-w-[210px]">
          <strong className="block text-[13px] font-bold leading-4">Crie seu próximo anúncio</strong>
          <span className="mt-1 block text-[10px] font-medium leading-[13px] text-white/85">Tire uma foto, use a IA e divulgue em todas as suas redes.</span>
        </span>
        <span className="relative z-10 grid h-10 w-10 place-items-center rounded-full bg-white/15 ring-4 ring-white/10">
          <Camera size={18} />
        </span>
      </Link>

      <div className="mt-2.5 grid grid-cols-4 gap-1.5">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex flex-col items-center gap-1.5 rounded-[12px] border border-[#EFEAFF] bg-[#F7F4FF] px-0.5 py-2 text-center text-[9px] font-semibold leading-[11px] text-ink"
          >
            <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-white text-primary shadow-card">
              <action.icon size={15} strokeWidth={1.9} />
            </span>
            {action.label}
          </Link>
        ))}
      </div>

      <div className="mt-4 flex items-end justify-between">
        <h2 className="text-[13px] font-bold leading-4 text-ink">Resultados (7 dias)</h2>
        <Link href="/estatisticas" className="text-[11px] font-semibold text-primary">
          Ver tudo
        </Link>
      </div>
      <div className="mt-1.5 grid grid-cols-4 gap-1.5">
        {metrics.map((item) => (
          <div key={item.label} className="rounded-[12px] border border-line bg-surface px-1.5 py-2 shadow-card">
            <span className={`grid h-5 w-5 place-items-center rounded-md ${item.tone}`}>
              <item.icon size={11} />
            </span>
            <p className="mt-1 truncate text-[12px] font-bold leading-3.5 text-ink sm:text-[13px]">{item.value}</p>
            <p className="mt-0.5 text-[8px] font-medium leading-2.5 text-muted">{item.label}</p>
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
                {product.images[0] ? <img src={product.images[0].url} alt="" className="h-full w-full object-cover" /> : null}
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
