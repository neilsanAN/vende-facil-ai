import { getContainer } from "@vendefacil/business";
import { requireAdminPage } from "@/server/session";
export const dynamic = "force-dynamic";
export default async function Page() {
  const session = await requireAdminPage();
  const users = await getContainer().admin.users(session);
  return <main className="mx-auto max-w-5xl px-4 py-6"><h1 className="text-xl font-semibold">Usuários</h1><ul className="mt-4 space-y-2 text-sm">{users.map((user) => <li key={user.id} className="rounded-xl border border-line bg-surface p-3">{user.name} · {user.email} · {user.platformRole}</li>)}</ul></main>;
}
