import { notFound } from "next/navigation";
import { getContainer } from "@vendefacil/business";
import { ProductForm } from "@/components/workspace";
import { PageHeader } from "@/components/ui";
import { ProductActions } from "@/components/actions";
import { tenant } from "@/server/session";

export const dynamic = "force-dynamic";
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await tenant();
  const { id } = await params;
  const container = getContainer();
  try {
    const [product, categories] = await Promise.all([container.catalog.get(session, id), container.catalog.categories(session)]);
    return <div><PageHeader backHref="/produtos" title={product.name} action={<ProductActions id={product.id} />} /><ProductForm product={product} categories={categories} /></div>;
  } catch {
    notFound();
  }
}
