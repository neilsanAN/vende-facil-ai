import { getContainer } from "@vendefacil/business";
import { requireAdminPage } from "@/server/session";
import { AdminPlansPanel } from "./plans-form";

export const dynamic = "force-dynamic";

export default async function AdminPlansPage() {
  const session = await requireAdminPage();
  const plans = await getContainer().admin.listPlans(session);
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-xl font-semibold">Administração de planos</h1>
      <p className="mt-1 text-sm text-muted">Preços, benefícios, limites, créditos e disponibilidade.</p>
      <div className="mt-4">
        <AdminPlansPanel plans={JSON.parse(JSON.stringify(plans))} />
      </div>
      <a href="/admin" className="mt-6 inline-block text-sm text-primary">
        Voltar
      </a>
    </main>
  );
}
