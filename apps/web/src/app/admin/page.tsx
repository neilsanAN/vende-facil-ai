import { getContainer } from "@vendefacil/business";
import { requireAdminPage } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const session = await requireAdminPage();
  const data = await getContainer().admin.overview(session);
  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-xl font-semibold">Administração da plataforma</h1>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 text-sm">
        <div className="rounded-xl border border-line bg-surface p-3">Usuários<strong className="block text-lg">{data.users}</strong></div>
        <div className="rounded-xl border border-line bg-surface p-3">Lojas<strong className="block text-lg">{data.stores}</strong></div>
        <div className="rounded-xl border border-line bg-surface p-3">Jobs mortos em 24h<strong className="block text-lg">{data.jobsFailed24h}</strong></div>
        <div className="rounded-xl border border-line bg-surface p-3">Custo estimado de IA em 30 dias<strong className="block text-lg">{data.ai.estimatedCostCents} centavos</strong></div>
      </div>
      <h2 className="mt-6 text-sm font-semibold">Provedores configurados</h2>
      <ul className="mt-2 text-sm">{Object.entries(data.providers).map(([key, enabled]) => <li key={key}>{key}: {enabled ? "configurado" : "ausente"}</li>)}</ul>
      <nav className="mt-6 flex flex-wrap gap-3 text-sm text-primary">
        <a href="/admin/usuarios">Usuários</a><a href="/admin/lojas">Lojas</a><a href="/admin/planos">Planos</a><a href="/admin/jobs">Jobs</a><a href="/admin/auditoria">Auditoria</a><a href="/admin/suporte">Suporte</a>
      </nav>
    </main>
  );
}
