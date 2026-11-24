"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Menu, Package, Play, Plus, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/http";
import { SessionKeepAlive } from "@/components/session-keepalive";

const items = [
  { href: "/inicio", label: "Início", icon: Home },
  { href: "/produtos", label: "Produtos", icon: Package },
  { href: "/anuncios/novo", label: "Criar", icon: Plus, fab: true },
  { href: "/estudio", label: "Estúdio", icon: Play },
  { href: "/mais", label: "Mais", icon: Menu },
];

const side = [
  { href: "/inicio", label: "Início" },
  { href: "/produtos", label: "Produtos" },
  { href: "/anuncios/novo", label: "Criar anúncio" },
  { href: "/estudio", label: "Estúdio" },
  { href: "/estudio/video/novo", label: "Criar vídeo" },
  { href: "/publicar", label: "Divulgar" },
  { href: "/pedidos", label: "Pedidos" },
  { href: "/estatisticas", label: "Estatísticas" },
  { href: "/loja", label: "Minha loja" },
  { href: "/assinatura", label: "Assinatura" },
  { href: "/equipe", label: "Equipe" },
  { href: "/configuracoes", label: "Configurações" },
];

export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn("relative grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#9A7BFF] to-[#5B3DF0] text-white shadow-lift", className)}>
      <ShoppingBag size={18} />
      <span className="absolute bottom-1 right-1 grid h-3.5 w-3.5 place-items-center rounded-full bg-white text-primary">
        <span className="ml-px block h-0 w-0 border-y-[3px] border-l-[5px] border-y-transparent border-l-primary" />
      </span>
    </span>
  );
}

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link href={light ? "/" : "/inicio"} className="flex items-center gap-2.5">
      <LogoMark className="h-9 w-9 rounded-xl" />
      <span className={cn("text-lg font-bold tracking-tight", light ? "text-white" : "text-ink")}>VendeFácil AI</span>
    </Link>
  );
}

export function AppShell({ children, store, plan, user }: { children: React.ReactNode; store?: string; plan: string; user: string }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-background">
      <SessionKeepAlive />
      <div className="mx-auto grid min-h-screen max-w-6xl md:grid-cols-[232px_1fr]">
        <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-surface px-4 py-5 md:flex">
          <Brand />
          <p className="mt-4 truncate text-[10px] font-medium leading-[13px] text-muted">{store || "Sua loja"}</p>
          <nav className="mt-4 space-y-1">
            {side.map((item) => {
              const active = pathname === item.href || (item.href !== "/inicio" && pathname.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href} className={cn("block rounded-[10px] px-3 py-2 text-[12px] font-medium leading-4", active ? "bg-primary-soft text-primary" : "text-muted hover:bg-background hover:text-ink")}>
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto rounded-[10px] border border-line bg-background p-3">
            <p className="text-[12px] font-semibold leading-4 text-ink">{user}</p>
            <p className="mt-1 text-[10px] font-medium capitalize leading-[13px] text-muted">Plano {plan}</p>
          </div>
        </aside>
        <main className="mx-auto w-full max-w-lg px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))] md:max-w-3xl md:px-8 md:pb-10 md:pt-8">
          {children}
        </main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {items.map((item) => {
            const active =
              item.href === "/inicio"
                ? pathname === "/inicio"
                : item.href === "/produtos"
                  ? pathname.startsWith("/produtos")
                  : item.href === "/estudio"
                    ? pathname.startsWith("/estudio")
                    : item.href === "/mais"
                      ? pathname === "/mais"
                      : pathname.startsWith(item.href);
            const Icon = item.icon;
            if (item.fab) {
              return (
                <li key={item.href} className="relative flex justify-center">
                  <Link href={item.href} aria-label={item.label} className="-mt-4 grid h-14 w-14 place-items-center rounded-full bg-primary text-white shadow-lift">
                    <Icon size={24} strokeWidth={2.5} />
                  </Link>
                </li>
              );
            }
            return (
              <li key={item.href}>
                <Link href={item.href} className={cn("flex min-h-12 flex-col items-center justify-center gap-0.5 pt-1.5 text-tiny font-semibold leading-[11px]", active ? "text-primary" : "text-muted")}>
                  <Icon size={20} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
