import { SettingsPanel } from "@/components/ops-forms";
import { PageHeader } from "@/components/ui";
import { tenant } from "@/server/session";
export const dynamic = "force-dynamic";
export default async function Page() {
  const session = await tenant();
  return <div><PageHeader backHref="/mais" title="Configurações" text="Perfil, senha, exportação e exclusão da conta." /><SettingsPanel email={session.email} /></div>;
}
