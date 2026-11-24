import Link from "next/link";
import { ChevronRight, Clapperboard, FolderOpen, ImageIcon, Mic2, Play } from "lucide-react";
import { getContainer } from "@vendefacil/business";
import { tenant } from "@/server/session";

export const dynamic = "force-dynamic";

const items = [
  { href: "/estudio/video/novo", label: "Criar vídeo com IA", text: "Transforme fotos em um vídeo com voz", icon: Clapperboard, tone: "bg-[#F3EEFF] text-primary" },
  { href: "/estudio/arte", label: "Criar arte para redes", text: "Posts, Stories e ofertas", icon: ImageIcon, tone: "bg-[#FFF4E6] text-orange-500" },
  { href: "/estudio/narracao", label: "Gerar narração", text: "Voz profissional com IA", icon: Mic2, tone: "bg-[#F0FFF4] text-emerald-600" },
  { href: "/estudio/historico", label: "Meus projetos", text: "Vídeos, artes e rascunhos", icon: FolderOpen, tone: "bg-[#F0F4FF] text-blue-600" },
] as const;

export default async function StudioPage() {
  const session = await tenant();
  const videos = await getContainer().videos.list(session);
  return (
    <div>
      <h1 className="mb-4 text-[22px] font-bold leading-7 tracking-tight text-ink">Estúdio IA</h1>

      {/* Hero CTA */}
      <Link
        href="/estudio/video/novo"
        className="relative mb-5 flex items-center gap-4 overflow-hidden rounded-[22px] bg-gradient-to-br from-[#3B1D8F] via-[#5B3DF0] to-[#8B6CFF] p-5 text-white shadow-lift"
      >
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/15 ring-8 ring-white/10">
          <Play size={22} fill="currentColor" />
        </span>
        <span>
          <strong className="block text-[15px] font-bold leading-5">Crie vídeos profissionais com IA</strong>
        </span>
      </Link>

      {/* Menu items */}
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="flex items-center gap-3 rounded-[18px] border border-line bg-surface p-3.5 shadow-card">
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${item.tone}`}>
                <item.icon size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-bold leading-4 text-ink">{item.label}</span>
                <span className="mt-0.5 block text-[11px] font-medium leading-[14px] text-muted">{item.text}</span>
              </span>
              <ChevronRight size={16} className="shrink-0 text-line" />
            </Link>
          </li>
        ))}
      </ul>

      {videos.length > 0 ? (
        <>
          <h2 className="mb-2 mt-6 text-[13px] font-semibold leading-4">Recentes</h2>
          <ul className="space-y-2">
            {videos.slice(0, 5).map((video) => (
              <li key={video.id}>
                <Link className="block rounded-xl border border-line bg-surface px-3 py-3 text-[12px] font-medium" href={`/estudio/video/${video.id}`}>
                  {video.title}
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
