import { notFound } from "next/navigation";
import { getContainer } from "@vendefacil/business";
import { AdEditor } from "@/components/workspace";
import { PageHeader } from "@/components/ui";
import { tenant } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const session = await tenant();
  const { id } = await params;
  const container = getContainer();
  const ads = await container.studio.listAds(session);
  const ad = ads.find((item: { id: string }) => item.id === id);
  if (!ad) notFound();

  let imageUrl: string | null = null;
  if (ad.productId) {
    const product = await container.catalog.get(session, ad.productId).catch(() => null);
    imageUrl = product?.images[0]?.url ?? null;
  }

  return (
    <div>
      <PageHeader backHref="/inicio" title="Anúncio gerado pela IA" />
      <AdEditor ad={{ ...ad, imageUrl }} />
    </div>
  );
}
