import Link from "next/link";
import { ChevronRight, Clapperboard, FolderOpen, ImageIcon, Mic2 } from "lucide-react";

export const dynamic = "force-dynamic";

const items = [
  { href: "/estudio/video/novo", label: "Criar vídeo com IA", text: "Transforme fotos em um vídeo com voz", icon: Clapperboard },
  { href: "/estudio/arte", label: "Criar arte para redes", text: "Posts, Stories e ofertas", icon: ImageIcon },
  { href: "/estudio/narracao", label: "Gerar narração", text: "Voz profissional com IA", icon: Mic2 },
  { href: "/estudio/historico", label: "Meus projetos", text: "Vídeos, artes e rascunhos", icon: FolderOpen },
] as const;

export default function StudioPage() {
  return (
    <div>
      <h1 className="mb-4 text-[22px] font-bold leading-7 tracking-tight text-ink">Estúdio IA</h1>

      <Link
        href="/estudio/video/novo"
        className="relative mb-5 flex items-center gap-4 overflow-hidden rounded-[22px] bg-gradient-to-br from-[#5B3DF0] via-[#7C5CFF] to-[#8B6CFF] p-5 text-white shadow-lift"
      >
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/15 ring-8 ring-white/10">
          <Clapperboard size={24} />
        </span>
        <span>
          <strong className="block text-[15px] font-bold leading-5">Crie vídeos profissionais com IA</strong>
          <span className="mt-1 block text-[11px] font-medium text-white/80">Com narração, artes e exportação para redes</span>
        </span>
      </Link>

      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="flex items-center gap-3 rounded-[18px] border border-line bg-surface p-3.5 shadow-card">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
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
    </div>
  );
}
