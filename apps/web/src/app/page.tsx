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
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 py-10">
        <div className="flex flex-col items-center text-center">
          <LogoMark className="h-14 w-14 rounded-2xl" />
          <h1 className="mt-5 text-4xl font-bold tracking-tight">VendeFácil AI</h1>
          <p className="mt-2 max-w-xs text-sm text-white/70">Crie, divulgue e venda seus produtos nas redes sociais em minutos.</p>
        </div>
        <ul className="mt-10 space-y-3">
          {features.map((feature) => (
            <li key={feature.title} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-white">
                <feature.icon size={16} />
              </span>
              <span>
                <span className="block text-[12px] font-semibold leading-[15px]">{feature.title}</span>
                <span className="text-[10px] font-medium leading-[13px] text-white/55">{feature.text}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-auto grid gap-3 pb-2 pt-10">
          <Link href="/cadastro" className="flex h-10 items-center justify-center rounded-full bg-primary px-4 text-[12px] font-semibold leading-[15px] text-white shadow-lift">
            Começar
          </Link>
          <Link href="/entrar" className="flex h-10 items-center justify-center rounded-full border border-white/20 px-4 text-[12px] font-semibold leading-[15px]">
            Já tenho conta
          </Link>
        </div>
      </div>
    </main>
  );
}
