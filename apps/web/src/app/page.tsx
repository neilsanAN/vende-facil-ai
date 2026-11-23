import Link from "next/link";
import { BarChart3, Camera, Play, Share2, Sparkles, Store } from "lucide-react";
import { LogoMark } from "@/components/shell";

const features = [
  { icon: Camera, title: "Foto do produto", text: "Tire uma foto ou escolha da galeria.", color: "bg-[#6D4AFF]" },
  { icon: Sparkles, title: "IA que vende", text: "Gera título, descrição e hashtags.", color: "bg-[#7C5CFF]" },
  { icon: Play, title: "Vídeo com IA", text: "Crie vídeos profissionais com voz.", color: "bg-[#6D4AFF]" },
  { icon: Share2, title: "Publique nas redes", text: "WhatsApp, Instagram e Facebook.", color: "bg-[#14B8A6]" },
  { icon: Store, title: "Catálogo online", text: "Sua vitrine pronta para compartilhar.", color: "bg-[#7C5CFF]" },
  { icon: BarChart3, title: "Resultados", text: "Acompanhe visualizações, cliques e vendas.", color: "bg-[#22C55E]" },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#241552_0%,_#070B18_42%)] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-5 py-8">
        <LogoMark />
        <h1 className="mt-6 text-4xl font-bold tracking-tight">VendeFácil AI</h1>
        <p className="mt-2 max-w-sm text-sm text-white/75">Crie, divulgue e venda seus produtos nas redes sociais em minutos.</p>
        <ul className="mt-8 space-y-3">
          {features.map((feature) => (
            <li key={feature.title} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white ${feature.color}`}><feature.icon size={16} /></span>
              <span>
                <span className="block text-sm font-semibold">{feature.title}</span>
                <span className="text-xs text-white/60">{feature.text}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-8 rounded-2xl bg-gradient-to-r from-[#7C5CFF] to-[#6846F0] px-4 py-4 text-sm shadow-lift">Ideal para lojistas, autônomos e pequenos negócios.</div>
        <div className="mt-6 grid gap-3 pb-6">
          <Link href="/cadastro" className="flex h-10 items-center justify-center rounded-full bg-white px-4 text-[12px] font-semibold leading-[15px] text-[#1A1033]">Começar</Link>
          <Link href="/entrar" className="flex h-10 items-center justify-center rounded-full border border-white/15 px-4 text-[12px] font-semibold leading-[15px]">Já tenho conta</Link>
        </div>
      </div>
    </main>
  );
}
