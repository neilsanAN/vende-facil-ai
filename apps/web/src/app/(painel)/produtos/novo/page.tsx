import { getContainer } from "@vendefacil/business";
import { ProductForm } from "@/components/workspace";
import { PageHeader } from "@/components/ui";
import { tenant } from "@/server/session";

export const dynamic = "force-dynamic";
export default async function NewProductPage() {
  const session = await tenant();
  const categories = await getContainer().catalog.categories(session);
  return <div><PageHeader backHref="/produtos" title="Novo produto" /><ProductForm categories={categories} /></div>;
}
