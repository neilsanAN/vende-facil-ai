import Link from "next/link";
import { Camera, Play, Share2, Sparkles } from "lucide-react";
import { LogoMark } from "@/components/shell";

const features = [
  { icon: Camera, title: "Tire foto do produto", text: "Câmera ou galeria em segundos." },
  { icon: Sparkles, title: "IA cria o anúncio", text: "Título, descrição e hashtags." },
  { icon: Play, title: "Gere vídeos com voz", text: "Conteúdo pronto para as redes." },
  { icon: Share2, title: "Publique nas redes", text: "WhatsApp, Instagram e Facebook." },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#241552_0%,_#070B18_48%)] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[390px] flex-col px-6 py-10">
        <div className="flex flex-col items-center text-center">
          <LogoMark className="h-16 w-16 rounded-2xl" />
          <h1 className="mt-5 text-[28px] font-bold leading-8 tracking-tight">VendeFácil AI</h1>
          <p className="mt-2 max-w-[260px] text-[13px] leading-4 text-white/70">Crie, divulgue e venda seus produtos com IA</p>
        </div>
        <ul className="mt-10 space-y-3">
          {features.map((feature) => (
            <li key={feature.title} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-3.5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-white shadow-lift">
                <feature.icon size={18} />
              </span>
              <span>
                <span className="block text-[13px] font-semibold leading-[16px]">{feature.title}</span>
                <span className="mt-0.5 block text-[11px] font-medium leading-[14px] text-white/55">{feature.text}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-auto grid gap-3 pb-2 pt-10">
          <Link href="/cadastro" className="flex h-11 items-center justify-center rounded-full bg-primary px-4 text-[13px] font-semibold text-white shadow-lift">
            Começar
          </Link>
          <Link href="/entrar" className="flex h-11 items-center justify-center rounded-full border border-white/25 px-4 text-[13px] font-semibold">
            Já tenho conta
          </Link>
        </div>
      </div>
    </main>
  );
}
