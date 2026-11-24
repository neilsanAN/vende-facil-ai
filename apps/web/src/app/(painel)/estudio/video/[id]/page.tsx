import { notFound } from "next/navigation";
import { getContainer } from "@vendefacil/business";
import { VideoEditor } from "@/components/workspace";
import { PageHeader } from "@/components/ui";
import { tenant } from "@/server/session";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const session = await tenant();
  const { id } = await params;
  try {
    const project = await getContainer().videos.get(session, id);
    const plain = JSON.parse(JSON.stringify(project));
    return <div><PageHeader backHref="/estudio" title="Editor de vídeo" text={project.title} /><VideoEditor project={plain} /></div>;
  } catch { notFound(); }
}
