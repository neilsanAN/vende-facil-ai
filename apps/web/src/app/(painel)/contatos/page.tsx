import { getContainer } from "@vendefacil/business";
import { PageHeader } from "@/components/ui";
import { tenant } from "@/server/session";
export const dynamic = "force-dynamic";
export default async function Page() {
  const session = await tenant();
  const contacts = await getContainer().commerce.contacts(session);
  return <div><PageHeader backHref="/mais" title="Contatos" text="Mensagens da vitrine. Não são pedidos." /><ul className="space-y-2 text-sm">{contacts.map((item) => <li key={item.id} className="rounded-xl border border-line bg-surface p-3"><strong>{item.name}</strong><p>{item.message}</p><p className="text-xs text-muted">{item.phone} {item.email}</p></li>)}{contacts.length === 0 ? <li className="text-muted">Nenhum contato ainda.</li> : null}</ul></div>;
}
