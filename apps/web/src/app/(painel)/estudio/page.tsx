import Link from "next/link";
import { Clapperboard, FolderOpen, ImageIcon, Mic2, Sparkles } from "lucide-react";
import { getContainer } from "@vendefacil/business";
import { tenant } from "@/server/session";

export const dynamic = "force-dynamic";

const items = [
  { href: "/estudio/video/novo", label: "Criar vídeo com IA", text: "Roteiro, cenas e narração.", icon: Clapperboard },
  { href: "/estudio/arte", label: "Criar arte para redes", text: "Peça visual para feed e stories.", icon: ImageIcon },
  { href: "/estudio/narracao", label: "Gerar narração", text: "Áudio para o anúncio ou vídeo.", icon: Mic2 },
  { href: "/estudio/historico", label: "Meus projetos", text: "Histórico de gerações e vídeos.", icon: FolderOpen },
] as const;

export default async function StudioPage() {
  const session = await tenant();
  const videos = await getContainer().videos.list(session);
  return (
    <div>
      <div className="rounded-2xl bg-gradient-to-br from-[#7C5CFF] to-[#5B3DF0] px-4 py-5 text-white shadow-lift">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15">
            <Sparkles size={18} />
          </span>
          <div>
            <h1 className="text-[14px] font-bold leading-[18px]">Estúdio IA</h1>
            <p className="mt-1 text-[12px] font-medium leading-4 text-white/85">Crie vídeos profissionais com IA.</p>
          </div>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 shadow-card">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
                <item.icon size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-semibold leading-4">{item.label}</span>
                <span className="text-[10px] font-medium leading-[13px] text-muted">{item.text}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {videos.length > 0 ? (
        <>
          <h2 className="mb-2 mt-6 text-[12px] font-semibold leading-4">Recentes</h2>
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
