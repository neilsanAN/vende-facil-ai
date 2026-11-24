"use client";

import Link from "next/link";
import { BarChart3, Camera, PlayCircle, Sparkles, type LucideIcon } from "lucide-react";
import { brand, welcomeSlides } from "@vendefacil/ui-tokens";
import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/http";

const slideIcons: Record<(typeof welcomeSlides)[number]["key"], LucideIcon> = {
  create: Camera,
  studio: PlayCircle,
  sell: BarChart3,
};

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

export function WelcomeScreen() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const syncIndex = useCallback(() => {
    const node = trackRef.current;
    if (!node || !node.clientWidth) return;
    const next = Math.round(node.scrollLeft / node.clientWidth);
    setIndex(Math.min(Math.max(next, 0), welcomeSlides.length - 1));
  }, []);

  const goTo = (target: number) => {
    const node = trackRef.current;
    if (!node) return;
    node.scrollTo({ left: target * node.clientWidth, behavior: "smooth" });
    setIndex(target);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070617] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(124,92,255,0.35),transparent_42%),radial-gradient(circle_at_85%_78%,rgba(168,85,247,0.38),transparent_36%),radial-gradient(circle_at_20%_90%,rgba(91,61,240,0.22),transparent_40%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[390px] flex-col px-6 pb-8 pt-14">
        <div className="flex flex-col items-center text-center">
          <WelcomeLogo />
          <h1 className="mt-5 text-[28px] font-bold leading-8 tracking-tight">
            VendeFácil <span className="text-[#C4B5FD]">AI</span>
          </h1>
          <p className="mt-2 max-w-[280px] text-[13px] font-medium leading-[18px] text-white/75">{brand.tagline}</p>
        </div>

        <div
          ref={trackRef}
          className="mt-8 flex snap-x snap-mandatory overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={syncIndex}
          aria-roledescription="carrossel"
          aria-label="Conheça o VendeFácil AI"
        >
          {welcomeSlides.map((slide) => {
            const Icon = slideIcons[slide.key];
            return (
              <article
                key={slide.key}
                className="w-full shrink-0 snap-center px-0.5"
                aria-roledescription="slide"
              >
                <div className="rounded-[20px] border border-white/10 bg-white/[0.06] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_20px_40px_rgba(0,0,0,0.25)] backdrop-blur-sm">
                  <div className="flex items-start gap-4">
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#8B6CFF] to-[#5B3DF0] shadow-[0_8px_24px_rgba(109,74,255,0.45)]">
                      <Icon size={26} strokeWidth={1.75} className="text-white" />
                    </span>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#C4B5FD]">{slide.eyebrow}</p>
                      <h2 className="mt-1 text-[17px] font-bold leading-6 tracking-tight text-white">{slide.title}</h2>
                    </div>
                  </div>
                  <p className="mt-4 text-left text-[13px] font-medium leading-[19px] text-white/80">{slide.description}</p>
                  <ul className="mt-4 space-y-2.5">
                    {slide.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2.5 text-left text-[12px] font-medium leading-4 text-white/90">
                        <Sparkles size={14} className="mt-0.5 shrink-0 text-[#A78BFA]" aria-hidden />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            );
          })}
        </div>

        <p className="mt-4 text-center text-[11px] font-medium text-white/45">Deslize para o lado</p>

        <div className="mt-3 flex items-center justify-center gap-2" role="tablist" aria-label="Slides">
          {welcomeSlides.map((slide, i) => (
            <button
              key={slide.key}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`${slide.title}`}
              onClick={() => goTo(i)}
              className={cn(
                "rounded-full transition-all duration-300",
                i === index ? "h-2 w-6 bg-white" : "h-2 w-2 bg-white/30 hover:bg-white/50",
              )}
            />
          ))}
        </div>

        <div className="mt-auto grid gap-3 pt-8">
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