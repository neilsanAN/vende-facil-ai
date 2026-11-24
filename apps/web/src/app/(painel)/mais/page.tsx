import Link from "next/link";
import { PageHeader } from "@/components/ui";

const links = [
  ["/loja", "Minha loja"],
  ["/pedidos", "Pedidos"],
  ["/estatisticas", "Estatísticas"],
  ["/contatos", "Contatos"],
  ["/publicar", "Publicar"],
  ["/assinatura", "Assinatura"],
  ["/equipe", "Equipe"],
  ["/configuracoes", "Configurações"],
  ["/admin", "Administração"],
] as const;

export default function Page() {
  return (
    <div>
      <PageHeader title="Mais" text="Loja, pedidos, resultados e ajustes." />
      <ul className="space-y-2">
        {links.map(([href, label]) => (
          <li key={href}>
            <Link className="block rounded-[10px] border border-line bg-surface px-4 py-3 text-[12px] font-medium leading-4 shadow-card" href={href}>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
