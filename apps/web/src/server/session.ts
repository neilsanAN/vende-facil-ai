import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getContainer, type SessionContext } from "@vendefacil/business";

export async function loadSession(): Promise<SessionContext | null> {
  const jar = await cookies();
  return getContainer().auth.fromAccess(jar.get("vf_access")?.value ?? null);
}

export async function requireUser(): Promise<SessionContext> {
  const session = await loadSession();
  if (!session) redirect("/entrar");
  return session;
}

export async function requireTenantPage(): Promise<SessionContext> {
  const session = await requireUser();
  if (!session.emailVerified) redirect("/verificar-email");
  if (!session.organizationId || !session.role) redirect("/onboarding");
  return session;
}

export async function tenant() {
  const session = await requireTenantPage();
  return { ...session, organizationId: session.organizationId as string, role: session.role as NonNullable<typeof session.role> };
}

export async function requireAdminPage(): Promise<SessionContext> {
  const session = await requireUser();
  if (session.platformRole !== "PLATFORM_ADMIN") redirect("/inicio");
  return session;
}
