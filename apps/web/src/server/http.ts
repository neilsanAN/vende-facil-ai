import { AppError, getContainer, isAppError, visitorHash, deliverEmail } from "@vendefacil/business";
import type { ZodType } from "zod";

export type RouteContext = {
  req: Request;
  params: Record<string, string>;
  query: URLSearchParams;
  container: ReturnType<typeof getContainer>;
  session: Awaited<ReturnType<ReturnType<typeof getContainer>["auth"]["fromAccess"]>>;
  ip: string;
};

export function json(data: unknown, status = 200, headers?: Headers) {
  const response = Response.json(data, { status });
  headers?.forEach((value, key) => response.headers.append(key, value));
  return response;
}

export function errorResponse(error: unknown) {
  if (isAppError(error)) return json({ error: { code: error.code, message: error.message, details: error.details } }, error.status);
  console.error(JSON.stringify({ level: "error", message: "api.unhandled", detail: error instanceof Error ? error.message : "erro" }));
  return json({ error: { code: "INTERNAL", message: "Não foi possível concluir a ação." } }, 500);
}

export async function readJson<T>(req: Request, schema: ZodType<T>) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || "Dados inválidos.";
    return { ok: false as const, response: json({ error: { code: "VALIDATION", message } }, 422) };
  }
  return { ok: true as const, data: parsed.data };
}

export function clientIp(req: Request) {
  if (process.env.TRUST_PROXY === "true") {
    const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (forwarded) return forwarded;
  }
  return "local";
}

export function readCookie(req: Request, name: string) {
  const raw = req.headers.get("cookie") || "";
  const item = raw.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : null;
}

export function authCookies(access: string, refresh: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const headers = new Headers();
  // Path=/ nos dois: ao voltar da câmera o browser remonta a página e precisa do refresh fora de /api.
  headers.append("set-cookie", `vf_access=${access}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}${secure}`);
  headers.append("set-cookie", `vf_refresh=${refresh}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}${secure}`);
  // Limpa cookie antigo com Path=/api (migração).
  headers.append("set-cookie", `vf_refresh=; HttpOnly; Path=/api; Max-Age=0${secure}`);
  return headers;
}

export function clearCookies() {
  const headers = new Headers();
  headers.append("set-cookie", "vf_access=; HttpOnly; Path=/; Max-Age=0");
  headers.append("set-cookie", "vf_refresh=; HttpOnly; Path=/; Max-Age=0");
  headers.append("set-cookie", "vf_refresh=; HttpOnly; Path=/api; Max-Age=0");
  return headers;
}

export function idempotency(req: Request) {
  return req.headers.get("idempotency-key") || crypto.randomUUID();
}

export async function devMail(input: { to: string; subject: string; text: string; devUrl?: string }) {
  const sent = await deliverEmail(input);
  if (process.env.NODE_ENV !== "production" && !sent.delivered && input.devUrl) return input.devUrl;
  return null;
}

export function hashVisitor(req: Request, secret: string) {
  return visitorHash(clientIp(req), req.headers.get("user-agent") || "", secret);
}

export function requireTenantSession(ctx: RouteContext) {
  const session = ctx.session;
  if (!session) throw new AppError("UNAUTHENTICATED", "Entre para continuar.", 401);
  if (!session.emailVerified) throw new AppError("EMAIL_UNVERIFIED", "Confirme seu e-mail para continuar.", 403);
  if (!session.organizationId || !session.role) throw new AppError("ONBOARDING_REQUIRED", "Configure sua loja para continuar.", 409);
  return { ...session, organizationId: session.organizationId, role: session.role };
}
