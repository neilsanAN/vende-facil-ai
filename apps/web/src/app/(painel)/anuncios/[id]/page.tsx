import { notFound } from "next/navigation";
import { getContainer } from "@vendefacil/business";
import { AdEditor } from "@/components/workspace";
import { PageHeader } from "@/components/ui";
import { tenant } from "@/server/session";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const session = await tenant();
  const { id } = await params;
  const ads = await getContainer().studio.listAds(session);
  const ad = ads.find((item) => item.id === id);
  if (!ad) notFound();
  return <div><PageHeader backHref="/inicio" title="Anúncio gerado" text="Revise título, descrição e hashtags. Nada é publicado sozinho." /><AdEditor ad={ad} /></div>;
}
