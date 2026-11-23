import { getContainer } from "@vendefacil/business";
import { requireAdminPage } from "@/server/session";
import { AdminReply } from "@/components/admin-reply";
export const dynamic = "force-dynamic";
export default async function Page() {
  const session = await requireAdminPage();
  const tickets = await getContainer().admin.tickets(session);
  return <main className="mx-auto max-w-5xl px-4 py-6"><h1 className="text-xl font-semibold">Suporte</h1><ul className="mt-4 space-y-3">{tickets.map((ticket) => <li key={ticket.id} className="rounded-xl border border-line bg-surface p-3 text-sm"><strong>{ticket.subject}</strong> · {ticket.status}<ul className="mt-2 space-y-1">{ticket.messages.map((message) => <li key={message.id}>{message.staff ? "Equipe" : "Cliente"}: {message.body}</li>)}</ul><AdminReply id={ticket.id} /></li>)}</ul></main>;
}
