import { AppShell } from "@/components/shell";
import { getContainer } from "@vendefacil/business";
import { requireTenantPage } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireTenantPage();
  const shell = await getContainer().tenants.shell({ ...session, organizationId: session.organizationId!, role: session.role! });
  return <AppShell store={shell.store?.name} plan={shell.plan} user={shell.user.name}>{children}</AppShell>;
}
