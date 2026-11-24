import { getContainer } from "@vendefacil/business";
import { VideoCreator } from "@/components/workspace";
import { PageHeader } from "@/components/ui";
import { tenant } from "@/server/session";
export const dynamic = "force-dynamic";
export default async function Page() {
  const session = await tenant();
  const [products, voices] = await Promise.all([
    getContainer().catalog.list(session, { q: "", sort: "recent", page: 1, pageSize: 50 }),
    getContainer().videos.voices(),
  ]);
  return <div><PageHeader backHref="/estudio" title="Gerar vídeo com IA" /><VideoCreator products={products.data.map((item) => ({ id: item.id, name: item.name, imageUrl: item.images[0]?.url || null }))} voices={voices.map((voice) => ({ id: voice.id, name: voice.name, gender: voice.gender }))} /></div>;
}
