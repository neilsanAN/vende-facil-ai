import Link from "next/link";
import {
  BarChart3,
  ChevronRight,
  Link2,
  MessageSquare,
  Settings,
  Shield,
  ShoppingBag,
  Store,
  Users,
} from "lucide-react";

const links = [
  { href: "/loja", label: "Minha loja", text: "Vitrine, destaques e dados da loja", icon: Store },
  { href: "/pedidos", label: "Pedidos", text: "Pedidos da vitrine e lançamentos", icon: ShoppingBag },
  { href: "/estatisticas", label: "Estatísticas", text: "Visualizações, cliques e vendas", icon: BarChart3 },
  { href: "/contatos", label: "Contatos", text: "Mensagens recebidas na vitrine", icon: MessageSquare },
  { href: "/publicar", label: "Publicar", text: "WhatsApp, Instagram e Facebook", icon: Link2 },
  { href: "/equipe", label: "Equipe", text: "Convites e permissões", icon: Users },
  { href: "/configuracoes", label: "Configurações", text: "Perfil, senha e conta", icon: Settings },
  { href: "/admin", label: "Administração", text: "Painel da plataforma", icon: Shield },
] as const;

export default function Page() {
  return (
    <div>
      <h1 className="mb-1 text-[20px] font-bold leading-6 tracking-tight text-ink">Mais</h1>
      <p className="mb-4 text-[12px] font-medium text-muted">Loja, pedidos, resultados e ajustes.</p>
      <ul className="space-y-2">
        {links.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="flex items-center gap-3 rounded-[14px] border border-line bg-surface p-3.5 shadow-card">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-primary-soft text-primary">
                <item.icon size={18} strokeWidth={1.8} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold leading-4 text-ink">{item.label}</span>
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
