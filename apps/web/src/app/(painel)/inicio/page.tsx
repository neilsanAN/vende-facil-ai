import Link from "next/link";
import { Camera, Clapperboard, Share2, Store } from "lucide-react";
import { getContainer } from "@vendefacil/business";
import { tenant } from "@/server/session";

export const dynamic = "force-dynamic";

const actions = [
  { href: "/anuncios/novo", label: "Novo anúncio", icon: Camera },
  { href: "/estudio/video/novo", label: "Gerar vídeo", icon: Clapperboard },
  { href: "/loja", label: "Meu catálogo", icon: Store },
  { href: "/publicar", label: "Divulgar", icon: Share2 },
] as const;

export default async function InicioPage() {
  const session = await tenant();
  const data = await getContainer().commerce.dashboard(session);
  const { stats } = data;
  const first = data.greeting.name.split(" ")[0] || data.greeting.name;
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-soft text-sm font-bold text-[#D7CCFF]">{first.slice(0, 1).toUpperCase()}</span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Olá, {first}!</h1>
          <p className="text-sm text-muted">Pronto para vender hoje?</p>
        </div>
      </div>
      <Link href="/anuncios/novo" className="mt-5 flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#7C5CFF] to-[#6846F0] px-4 py-4 text-white shadow-lift">
        <span>
          <strong className="block text-[12px] font-semibold leading-[15px]">Criar novo anúncio</strong>
          <span className="mt-1 block max-w-[220px] text-[10px] font-medium leading-[13px] text-white/80">Tire uma foto, use a IA e divulgue em todas as suas redes.</span>
        </span>
        <span className="grid h-10 w-10 place-items-center rounded-[8px] bg-white/15"><Camera size={16} /></span>
      </Link>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-line bg-surface px-3 py-3"><p className="text-lg font-bold">{stats.products}</p><p className="text-xs text-muted">Produtos</p></div>
        <div className="rounded-2xl border border-line bg-surface px-3 py-3"><p className="text-lg font-bold">{stats.views}</p><p className="text-xs text-muted">Visualizações</p></div>
        <div className="rounded-2xl border border-line bg-surface px-3 py-3"><p className="text-lg font-bold">{stats.orders}</p><p className="text-xs text-muted">Pedidos</p></div>
      </div>
      <p className="mt-2 text-[11px] leading-[15px] text-muted">Números reais dos últimos 7 dias.</p>
      <h2 className="mb-2 mt-6 text-[12px] font-semibold leading-4">Ações rápidas</h2>
      <div className="grid grid-cols-4 gap-2">
        {actions.map((action) => (
          <Link key={action.href} href={action.href} className="flex flex-col items-center gap-2 rounded-[10px] border border-line bg-surface px-2 py-3 text-center text-[10px] font-medium leading-[13px] text-muted">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-[#D7CCFF]"><action.icon size={16} /></span>
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
