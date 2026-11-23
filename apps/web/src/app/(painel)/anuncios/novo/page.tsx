import { getContainer } from "@vendefacil/business";
import { AdStudio } from "@/components/workspace";
import { PageHeader } from "@/components/ui";
import { tenant } from "@/server/session";
export const dynamic = "force-dynamic";
export default async function Page() {
  const session = await tenant();
  const products = await getContainer().catalog.list(session, { q: "", sort: "recent", page: 1, pageSize: 50 });
  return <div><PageHeader title="Criar anúncio com IA" text="A geração usa somente foto e fatos confirmados. Sem provedor configurado, o texto pode ser escrito à mão." /><AdStudio products={products.data.map((item) => ({ id: item.id, name: item.name, priceCents: item.priceCents }))} /></div>;
}
