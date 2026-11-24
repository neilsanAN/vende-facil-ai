import { getContainer } from "@vendefacil/business";
import { TeamPanel } from "@/components/ops-forms";
import { PageHeader } from "@/components/ui";
import { tenant } from "@/server/session";
export const dynamic = "force-dynamic";
export default async function Page() {
  const session = await tenant();
  const team = await getContainer().tenants.team(session);
  return <div><PageHeader backHref="/mais" title="Equipe" text="Papéis: proprietário, admin, editor e leitura." /><TeamPanel members={team.members} /></div>;
}
