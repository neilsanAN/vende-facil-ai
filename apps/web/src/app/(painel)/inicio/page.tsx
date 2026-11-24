import Link from "next/link";
import { Bell, Camera, Clapperboard, ImageIcon, Share2 } from "lucide-react";
import { formatBrl } from "@vendefacil/types";
import { getContainer } from "@vendefacil/business";
import { tenant } from "@/server/session";

export const dynamic = "force-dynamic";

const actions = [
  { href: "/anuncios/novo", label: "Criar anúncio", icon: Camera, color: "bg-[#6D4AFF]" },
  { href: "/estudio/video/novo", label: "Vídeo com voz", icon: Clapperboard, color: "bg-[#7C5CFF]" },
  { href: "/estudio/arte", label: "Arte social", icon: ImageIcon, color: "bg-[#14B8A6]" },
  { href: "/publicar", label: "Publicar", icon: Share2, color: "bg-[#22C55E]" },
] as const;

export default async function InicioPage() {
  const session = await tenant();
  const data = await getContainer().commerce.dashboard(session);
  const { stats, recent } = data;
  const first = data.greeting.name.split(" ")[0] || data.greeting.name;
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-soft text-sm font-bold text-primary">{first.slice(0, 1).toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Olá, {first}!</h1>
          <p className="text-sm text-muted">Pronto para vender hoje?</p>
        </div>
        <button type="button" aria-label="Notificações" className="grid h-10 w-10 place-items-center rounded-full border border-line bg-surface text-muted">
          <Bell size={16} />
        </button>
      </div>

      <Link href="/anuncios/novo" className="mt-5 flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#7C5CFF] to-[#6846F0] px-4 py-4 text-white shadow-lift">
        <span>
          <strong className="block text-[12px] font-semibold leading-[15px]">Crie seu próximo anúncio</strong>
          <span className="mt-1 block max-w-[220px] text-[10px] font-medium leading-[13px] text-white/80">Tire uma foto, use a IA e divulgue nas redes.</span>
        </span>
        <span className="grid h-10 w-10 place-items-center rounded-[8px] bg-white/15">
          <Camera size={16} />
        </span>
      </Link>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {actions.map((action) => (
          <Link key={action.href} href={action.href} className="flex flex-col items-center gap-2 rounded-[10px] bg-surface px-1 py-3 text-center text-[10px] font-medium leading-[13px] text-muted shadow-card">
            <span className={`grid h-9 w-9 place-items-center rounded-xl text-white ${action.color}`}>
              <action.icon size={16} />
            </span>
            {action.label}
          </Link>
        ))}
      </div>

      <div className="mt-6 flex items-end justify-between">
        <h2 className="text-[12px] font-semibold leading-4">Resultados · 7 dias</h2>
        <Link href="/estatisticas" className="text-[10px] font-medium text-primary">
          Ver tudo
        </Link>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-line bg-surface px-3 py-3 shadow-card">
          <p className="text-lg font-bold">{stats.views}</p>
          <p className="text-xs text-muted">Visualizações</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface px-3 py-3 shadow-card">
          <p className="text-lg font-bold">{stats.whatsappClicks}</p>
          <p className="text-xs text-muted">Cliques WhatsApp</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface px-3 py-3 shadow-card">
          <p className="text-lg font-bold">{stats.orders}</p>
          <p className="text-xs text-muted">Pedidos</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface px-3 py-3 shadow-card">
          <p className="text-lg font-bold">{formatBrl(stats.salesCents)}</p>
          <p className="text-xs text-muted">Vendas</p>
        </div>
      </div>
      <p className="mt-2 text-[11px] leading-[15px] text-muted">Números reais dos últimos 7 dias.</p>

      <h2 className="mb-2 mt-6 text-[12px] font-semibold leading-4">Produtos recentes</h2>
      {recent.length === 0 ? (
        <p className="text-sm text-muted">Cadastre o primeiro produto para aparecer aqui.</p>
      ) : (
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
          {recent.map((product) => (
            <Link key={product.id} href={`/produtos/${product.id}`} className="w-28 shrink-0 overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
              <div className="aspect-square bg-background">
                {product.images[0] ? <img src={`/api/media/${product.images[0].mediaAssetId}`} alt="" className="h-full w-full object-cover" /> : null}
              </div>
              <div className="p-2">
                <p className="truncate text-[10px] font-semibold leading-[13px]">{product.name}</p>
                <p className="text-[10px] font-medium text-primary">{formatBrl(product.promoPriceCents ?? product.priceCents)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
