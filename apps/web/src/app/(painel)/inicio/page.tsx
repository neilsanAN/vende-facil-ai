import Link from "next/link";
import { Bell, Camera, Clapperboard, ImageIcon, Share2 } from "lucide-react";
import { formatBrl } from "@vendefacil/types";
import { getContainer } from "@vendefacil/business";
import { tenant } from "@/server/session";

export const dynamic = "force-dynamic";

const actions = [
  { href: "/anuncios/novo", label: "Anúncio com IA", icon: Camera, color: "bg-[#6D4AFF]" },
  { href: "/estudio/video/novo", label: "Vídeo com voz", icon: Clapperboard, color: "bg-[#7C5CFF]" },
  { href: "/estudio/arte", label: "Arte para redes", icon: ImageIcon, color: "bg-[#14B8A6]" },
  { href: "/publicar", label: "Publicar nas redes", icon: Share2, color: "bg-[#22C55E]" },
] as const;

export default async function InicioPage() {
  const session = await tenant();
  const data = await getContainer().commerce.dashboard(session);
  const { stats, recent } = data;
  const first = data.greeting.name.split(" ")[0] || data.greeting.name;
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-primary-soft text-sm font-bold text-primary">{first.slice(0, 1).toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <h1 className="text-[20px] font-bold leading-6 tracking-tight">Olá, {first}!</h1>
          <p className="text-[12px] text-muted">Pronto para vender hoje?</p>
        </div>
        <button type="button" aria-label="Notificações" className="grid h-10 w-10 place-items-center rounded-full border border-line bg-surface text-muted">
          <Bell size={16} />
        </button>
      </div>

      <Link href="/anuncios/novo" className="mt-5 flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#7C5CFF] to-[#6846F0] px-4 py-4 text-white shadow-lift">
        <span>
          <strong className="block text-[13px] font-semibold leading-[16px]">Crie seu próximo anúncio</strong>
          <span className="mt-1 block max-w-[220px] text-[11px] font-medium leading-[14px] text-white/80">Tire uma foto, use a IA e divulgue nas redes.</span>
        </span>
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15">
          <Camera size={18} />
        </span>
      </Link>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {actions.map((action) => (
          <Link key={action.href} href={action.href} className="flex flex-col items-center gap-2 rounded-[12px] bg-surface px-1 py-3 text-center text-[10px] font-semibold leading-[12px] text-muted shadow-card">
            <span className={`grid h-10 w-10 place-items-center rounded-xl text-white ${action.color}`}>
              <action.icon size={16} />
            </span>
            {action.label}
          </Link>
        ))}
      </div>

      <div className="mt-6 flex items-end justify-between">
        <h2 className="text-[13px] font-semibold leading-4">Resultados · 7 dias</h2>
        <Link href="/estatisticas" className="text-[11px] font-semibold text-primary">
          Ver tudo
        </Link>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {[
          [String(stats.views), "Visualizações"],
          [String(stats.whatsappClicks), "Cliques"],
          [String(stats.orders), "Pedidos"],
          [formatBrl(stats.salesCents), "Vendas"],
        ].map(([value, label]) => (
          <div key={label} className="rounded-2xl border border-line bg-surface px-3 py-3 shadow-card">
            <p className="text-[18px] font-bold leading-6">{value}</p>
            <p className="text-[11px] text-muted">{label}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] leading-[15px] text-muted">Números reais dos últimos 7 dias.</p>

      <h2 className="mb-2 mt-6 text-[13px] font-semibold leading-4">Produtos recentes</h2>
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
                <p className="truncate text-[11px] font-semibold leading-[13px]">{product.name}</p>
                <p className="text-[11px] font-medium text-primary">{formatBrl(product.promoPriceCents ?? product.priceCents)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
