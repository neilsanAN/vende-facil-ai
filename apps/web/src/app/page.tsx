import Link from "next/link";
import { Camera, Play, Share2, Sparkles } from "lucide-react";

const features = [
  { icon: Camera, title: "Tire foto do produto" },
  { icon: Sparkles, title: "IA cria o anúncio" },
  { icon: Play, title: "Gere vídeos com voz" },
  { icon: Share2, title: "Publique nas redes" },
] as const;

function WelcomeLogo() {
  return (
    <span className="relative grid h-[72px] w-[72px] place-items-center">
      <span className="absolute inset-0 rounded-[22px] bg-[#7C5CFF]/45 blur-xl" />
      <span className="relative grid h-[72px] w-[72px] place-items-center rounded-[22px] bg-gradient-to-br from-[#9B7BFF] to-[#5B3DF0] shadow-[0_0_0_3px_rgba(167,139,250,0.55),0_12px_32px_rgba(124,92,255,0.45)]">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6.5 8.5h11l-.8 10.2a1.6 1.6 0 0 1-1.6 1.5H9a1.6 1.6 0 0 1-1.6-1.5L6.5 8.5Z" stroke="white" strokeWidth="1.7" />
          <path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" stroke="white" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M10.4 13.2v3.1l3.2-1.55-3.2-1.55Z" fill="white" />
        </svg>
      </span>
    </span>
  );
}

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070617] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(124,92,255,0.35),transparent_42%),radial-gradient(circle_at_85%_78%,rgba(168,85,247,0.38),transparent_36%),radial-gradient(circle_at_20%_90%,rgba(91,61,240,0.22),transparent_40%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[390px] flex-col px-6 pb-8 pt-14">
        <div className="flex flex-col items-center text-center">
          <WelcomeLogo />
          <h1 className="mt-5 text-[28px] font-bold leading-8 tracking-tight">
            VendeFácil <span className="text-[#C4B5FD]">AI</span>
          </h1>
          <p className="mt-2 max-w-[250px] text-[13px] font-medium leading-[18px] text-white/75">Crie, divulgue e venda seus produtos com IA</p>
        </div>

        <ul className="mt-10 space-y-3">
          {features.map((feature) => (
            <li key={feature.title} className="flex items-center gap-3.5">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] border border-white/10 bg-white/[0.07] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <feature.icon size={20} strokeWidth={1.8} />
              </span>
              <span className="text-[14px] font-semibold leading-5">{feature.title}</span>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex items-center justify-center gap-2" aria-hidden="true">
          <span className="h-1.5 w-1.5 rounded-full bg-white" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
        </div>

        <div className="mt-auto grid gap-3 pt-10">
          <Link
            href="/cadastro"
            className="flex h-12 items-center justify-center rounded-2xl bg-gradient-to-r from-[#8B6CFF] to-[#6D4AFF] px-4 text-[14px] font-semibold text-white shadow-[0_10px_28px_rgba(109,74,255,0.45)]"
          >
            Começar
          </Link>
          <Link href="/entrar" className="flex h-12 items-center justify-center rounded-2xl border border-white/35 bg-transparent px-4 text-[14px] font-semibold text-white">
            Já tenho conta
          </Link>
        </div>
      </div>
    </main>
  );
}
