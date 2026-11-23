import { getContainer } from "@vendefacil/business";
import { NarrationForm, ArtForm } from "@/components/studio-forms";
import { PageHeader } from "@/components/ui";
import { tenant } from "@/server/session";

export const dynamic = "force-dynamic";

export async function NarrationPage() {
  const voices = await getContainer().videos.voices();
  return <div><PageHeader title="Narração" text="Português brasileiro, com as vozes de catálogo configuradas." /><NarrationForm voices={voices} /></div>;
}

export async function ArtPage() {
  const session = await tenant();
  const products = await getContainer().catalog.list(session, { q: "", sort: "recent", page: 1, pageSize: 50 });
  return <div><PageHeader title="Arte para redes" text="A arte é composta no servidor com a foto, o título e o preço informados." /><ArtForm products={products.data.map((item) => ({ id: item.id, name: item.name }))} /></div>;
}

export async function HistoryPage() {
  const session = await tenant();
  const history = await getContainer().studio.history(session);
  return <div><PageHeader title="Histórico de gerações" /><ul className="space-y-2 text-sm">{history.generations.map((item) => <li key={item.id} className="rounded-xl border border-line bg-surface px-3 py-2">{item.kind} · {item.provider}/{item.model} · {item.status} · {item.estimatedCostCents} centavos estimados</li>)}</ul></div>;
}

export async function PublishPage() {
  const session = await tenant();
  const container = getContainer();
  const [channels, products] = await Promise.all([container.publications.channels(session), container.catalog.list(session, { q: "", sort: "recent", page: 1, pageSize: 50 })]);
  const { PublishDesk } = await import("@/components/studio-forms");
  return <div><PageHeader title="Divulgar nas redes" text="Cada canal mostra o estado real. Instagram segue manual. Facebook só publica com a Página conectada." /><PublishDesk channels={channels} products={products.data.map((item) => ({ id: item.id, name: item.name }))} /></div>;
}
