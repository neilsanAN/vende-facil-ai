import { getContainer } from "@vendefacil/business";
import { requireAdminPage } from "@/server/session";
export const dynamic = "force-dynamic";
export default async function Page() {
  const session = await requireAdminPage();
  const stores = await getContainer().admin.stores(session);
  return <main className="mx-auto max-w-5xl px-4 py-6"><h1 className="text-xl font-semibold">Lojas</h1><ul className="mt-4 space-y-2 text-sm">{stores.map((store) => <li key={store.id} className="rounded-xl border border-line bg-surface p-3">{store.name} · /v/{store.slug} · {store.published ? "publicada" : "oculta"} · {store.organization.subscription?.plan.name || "sem plano"}</li>)}</ul></main>;
}
