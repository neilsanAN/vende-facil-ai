import { getContainer } from "@vendefacil/business";
import { requireAdminPage } from "@/server/session";
export const dynamic = "force-dynamic";
export default async function Page() {
  const session = await requireAdminPage();
  const rows = await getContainer().admin.audit(session);
  return <main className="mx-auto max-w-5xl px-4 py-6"><h1 className="text-xl font-semibold">Auditoria</h1><ul className="mt-4 space-y-2 text-sm">{rows.map((row) => <li key={row.id} className="rounded-xl border border-line bg-surface p-3">{row.action} · {row.entityType} · {row.actor?.email || "sistema"}</li>)}</ul></main>;
}
