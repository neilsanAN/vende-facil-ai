import {
  adGenerateSchema,
  adUpdateSchema,
  artworkSchema,
  productBackgroundSchema,
  categorySchema,
  contactSchema,
  deleteAccountSchema,
  forgotSchema,
  inviteSchema,
  loginSchema,
  manualOrderSchema,
  musicSchema,
  narrationSchema,
  onboardingSchema,
  orderUpdateSchema,
  passwordChangeSchema,
  productListSchema,
  productSchema,
  profileSchema,
  publicOrderSchema,
  publicationSchema,
  registerSchema,
  resendVerificationSchema,
  resetSchema,
  statsRangeSchema,
  storeSchema,
  storyboardSchema,
  ticketSchema,
  trackingSchema,
  uploadRequestSchema,
  verifySchema,
  videoCreateSchema,
  videoUpdateSchema,
} from "@vendefacil/validation";
import { AppError, getContainer } from "@vendefacil/business";
import { authCookies, clearCookies, clientIp, errorResponse, hashVisitor, idempotency, json, readCookie, readJson, requireTenantSession, devMail, type RouteContext } from "./http";

type Route = {
  method: string;
  pattern: string;
  auth: "public" | "user" | "tenant" | "admin";
  handle: (ctx: RouteContext) => Promise<Response>;
};

function match(pattern: string, parts: string[]) {
  const expected = pattern.split("/").filter(Boolean);
  if (expected.length !== parts.length) return null;
  const params: Record<string, string> = {};
  for (let index = 0; index < expected.length; index += 1) {
    const token = expected[index] as string;
    const value = parts[index] as string;
    if (token.startsWith(":")) params[token.slice(1)] = decodeURIComponent(value);
    else if (token !== value) return null;
  }
  return params;
}

const routes: Route[] = [
  { method: "GET", pattern: "/health", auth: "public", handle: async () => json({ ok: true, service: "vendefacil" }) },
  { method: "POST", pattern: "/auth/register", auth: "public", handle: register },
  { method: "POST", pattern: "/auth/login", auth: "public", handle: login },
  { method: "POST", pattern: "/auth/logout", auth: "public", handle: logout },
  { method: "POST", pattern: "/auth/refresh", auth: "public", handle: refresh },
  { method: "POST", pattern: "/auth/forgot", auth: "public", handle: forgot },
  { method: "POST", pattern: "/auth/reset", auth: "public", handle: reset },
  { method: "POST", pattern: "/auth/verify", auth: "public", handle: verify },
  { method: "POST", pattern: "/auth/resend", auth: "public", handle: resend },
  { method: "GET", pattern: "/auth/me", auth: "user", handle: async ({ session }) => json({ user: session }) },
  { method: "POST", pattern: "/onboarding", auth: "user", handle: onboard },
  { method: "GET", pattern: "/shell", auth: "tenant", handle: async (ctx) => json(await ctx.container.tenants.shell(requireTenantSession(ctx))) },
  { method: "GET", pattern: "/dashboard", auth: "tenant", handle: async (ctx) => json(await ctx.container.commerce.dashboard(requireTenantSession(ctx))) },
  { method: "PATCH", pattern: "/store", auth: "tenant", handle: updateStore },
  { method: "POST", pattern: "/store/logo", auth: "tenant", handle: setLogo },
  { method: "GET", pattern: "/team", auth: "tenant", handle: async (ctx) => json(await ctx.container.tenants.team(requireTenantSession(ctx))) },
  { method: "POST", pattern: "/team", auth: "tenant", handle: invite },
  { method: "POST", pattern: "/team/accept", auth: "user", handle: acceptInvite },
  { method: "PATCH", pattern: "/team/:id", auth: "tenant", handle: updateMember },
  { method: "DELETE", pattern: "/team/:id", auth: "tenant", handle: removeMember },
  { method: "GET", pattern: "/categories", auth: "tenant", handle: async (ctx) => json(await ctx.container.catalog.categories(requireTenantSession(ctx))) },
  { method: "POST", pattern: "/categories", auth: "tenant", handle: createCategory },
  { method: "GET", pattern: "/products", auth: "tenant", handle: listProducts },
  { method: "POST", pattern: "/products", auth: "tenant", handle: createProduct },
  { method: "GET", pattern: "/products/:id", auth: "tenant", handle: async (ctx) => json(await ctx.container.catalog.get(requireTenantSession(ctx), ctx.params.id || "")) },
  { method: "PATCH", pattern: "/products/:id", auth: "tenant", handle: updateProduct },
  { method: "POST", pattern: "/products/:id/archive", auth: "tenant", handle: async (ctx) => { await ctx.container.catalog.archive(requireTenantSession(ctx), ctx.params.id || ""); return json({ ok: true }); } },
  { method: "POST", pattern: "/products/:id/duplicate", auth: "tenant", handle: async (ctx) => json(await ctx.container.catalog.duplicate(requireTenantSession(ctx), ctx.params.id || "")) },
  { method: "POST", pattern: "/products/:id/images", auth: "tenant", handle: addImage },
  { method: "DELETE", pattern: "/products/:id/images/:imageId", auth: "tenant", handle: async (ctx) => { await ctx.container.catalog.removeImage(requireTenantSession(ctx), ctx.params.id || "", ctx.params.imageId || ""); return json({ ok: true }); } },
  { method: "POST", pattern: "/uploads", auth: "tenant", handle: createUpload },
  { method: "POST", pattern: "/uploads/:id/confirm", auth: "tenant", handle: async (ctx) => json(await ctx.container.media.confirm(requireTenantSession(ctx), ctx.params.id || "")) },
  { method: "POST", pattern: "/ai/analyze", auth: "tenant", handle: analyze },
  { method: "POST", pattern: "/ai/ads", auth: "tenant", handle: generateAd },
  { method: "POST", pattern: "/ai/product-background", auth: "tenant", handle: productBackground },
  { method: "GET", pattern: "/ads", auth: "tenant", handle: async (ctx) => json(await ctx.container.studio.listAds(requireTenantSession(ctx))) },
  { method: "POST", pattern: "/ads", auth: "tenant", handle: saveAd },
  { method: "PATCH", pattern: "/ads/:id", auth: "tenant", handle: saveAd },
  { method: "POST", pattern: "/ads/:id/archive", auth: "tenant", handle: async (ctx) => json(await ctx.container.studio.archiveAd(requireTenantSession(ctx), ctx.params.id || "")) },
  { method: "DELETE", pattern: "/ads/:id", auth: "tenant", handle: async (ctx) => json(await ctx.container.studio.archiveAd(requireTenantSession(ctx), ctx.params.id || "")) },
  { method: "POST", pattern: "/artwork", auth: "tenant", handle: artwork },
  { method: "GET", pattern: "/studio", auth: "tenant", handle: async (ctx) => json(await ctx.container.studio.history(requireTenantSession(ctx))) },
  { method: "GET", pattern: "/voices", auth: "tenant", handle: async (ctx) => json(await ctx.container.videos.voices()) },
  { method: "GET", pattern: "/music", auth: "tenant", handle: async (ctx) => json(await ctx.container.videos.music(requireTenantSession(ctx))) },
  { method: "POST", pattern: "/music", auth: "tenant", handle: addMusic },
  { method: "GET", pattern: "/videos", auth: "tenant", handle: async (ctx) => json(await ctx.container.videos.list(requireTenantSession(ctx))) },
  { method: "POST", pattern: "/videos", auth: "tenant", handle: createVideo },
  { method: "GET", pattern: "/videos/:id", auth: "tenant", handle: async (ctx) => json(await ctx.container.videos.get(requireTenantSession(ctx), ctx.params.id || "")) },
  { method: "PATCH", pattern: "/videos/:id", auth: "tenant", handle: updateVideo },
  { method: "POST", pattern: "/videos/:id/storyboard", auth: "tenant", handle: storyboard },
  { method: "POST", pattern: "/narration", auth: "tenant", handle: narrate },
  { method: "POST", pattern: "/videos/:id/render", auth: "tenant", handle: renderVideo },
  { method: "POST", pattern: "/videos/:id/cancel", auth: "tenant", handle: async (ctx) => json(await ctx.container.videos.cancel(requireTenantSession(ctx), ctx.params.id || "")) },
  { method: "GET", pattern: "/orders", auth: "tenant", handle: listOrders },
  { method: "POST", pattern: "/orders", auth: "tenant", handle: manualOrder },
  { method: "GET", pattern: "/orders/:id", auth: "tenant", handle: async (ctx) => json(await ctx.container.commerce.getOrder(requireTenantSession(ctx), ctx.params.id || "")) },
  { method: "PATCH", pattern: "/orders/:id", auth: "tenant", handle: updateOrder },
  { method: "GET", pattern: "/contacts", auth: "tenant", handle: async (ctx) => json(await ctx.container.commerce.contacts(requireTenantSession(ctx))) },
  { method: "PATCH", pattern: "/contacts/:id", auth: "tenant", handle: markContact },
  { method: "GET", pattern: "/stats", auth: "tenant", handle: stats },
  { method: "GET", pattern: "/billing", auth: "tenant", handle: async (ctx) => json(await ctx.container.billing.overview(requireTenantSession(ctx))) },
  { method: "POST", pattern: "/billing/checkout", auth: "tenant", handle: checkout },
  { method: "POST", pattern: "/billing/change", auth: "tenant", handle: changePlan },
  { method: "POST", pattern: "/billing/cancel", auth: "tenant", handle: async (ctx) => json(await ctx.container.billing.cancel(requireTenantSession(ctx))) },
  { method: "POST", pattern: "/billing/reactivate", auth: "tenant", handle: async (ctx) => json(await ctx.container.billing.reactivate(requireTenantSession(ctx))) },
  { method: "POST", pattern: "/webhooks/mercadopago", auth: "public", handle: webhook },
  { method: "GET", pattern: "/publications", auth: "tenant", handle: async (ctx) => json({ items: await ctx.container.publications.list(requireTenantSession(ctx)), channels: await ctx.container.publications.channels(requireTenantSession(ctx)) }) },
  { method: "POST", pattern: "/publications", auth: "tenant", handle: publish },
  {
    method: "GET",
    pattern: "/integrations/facebook/start",
    auth: "tenant",
    handle: async (ctx) =>
      json({ url: ctx.container.publications.facebookStart(requireTenantSession(ctx), ctx.query.get("from") === "app" ? "app" : "web") }),
  },
  { method: "GET", pattern: "/integrations/facebook/callback", auth: "public", handle: facebookCallback },
  { method: "GET", pattern: "/notifications", auth: "user", handle: async (ctx) => json(await ctx.container.account.notifications(ctx.session!)) },
  { method: "POST", pattern: "/notifications/read", auth: "user", handle: async (ctx) => { await ctx.container.account.readNotifications(ctx.session!); return json({ ok: true }); } },
  { method: "PATCH", pattern: "/profile", auth: "user", handle: profile },
  { method: "POST", pattern: "/account/password", auth: "user", handle: password },
  { method: "GET", pattern: "/account/export", auth: "user", handle: exportAccount },
  { method: "POST", pattern: "/account/delete", auth: "user", handle: deleteAccount },
  { method: "GET", pattern: "/sessions", auth: "user", handle: async (ctx) => json(await ctx.container.auth.sessions(ctx.session!.userId, ctx.session!.sessionId)) },
  { method: "DELETE", pattern: "/sessions/:id", auth: "user", handle: async (ctx) => { await ctx.container.auth.revoke(ctx.session!.userId, ctx.params.id || ""); return json({ ok: true }); } },
  { method: "GET", pattern: "/tickets", auth: "user", handle: async (ctx) => json(await ctx.container.account.tickets(ctx.session!)) },
  { method: "POST", pattern: "/tickets", auth: "user", handle: ticket },
  { method: "GET", pattern: "/public/stores/:slug", auth: "public", handle: publicStore },
  { method: "GET", pattern: "/public/stores/:slug/products/:productSlug", auth: "public", handle: publicProduct },
  { method: "POST", pattern: "/public/:slug/orders", auth: "public", handle: publicOrder },
  { method: "POST", pattern: "/public/:slug/contact", auth: "public", handle: publicContact },
  { method: "POST", pattern: "/public/:slug/events", auth: "public", handle: track },
  { method: "GET", pattern: "/admin/overview", auth: "admin", handle: async (ctx) => json(await ctx.container.admin.overview(ctx.session!)) },
  { method: "GET", pattern: "/admin/users", auth: "admin", handle: async (ctx) => json(await ctx.container.admin.users(ctx.session!)) },
  { method: "GET", pattern: "/admin/stores", auth: "admin", handle: async (ctx) => json(await ctx.container.admin.stores(ctx.session!)) },
  { method: "GET", pattern: "/admin/jobs", auth: "admin", handle: async (ctx) => json(await ctx.container.admin.jobs(ctx.session!)) },
  { method: "POST", pattern: "/admin/jobs/:id/retry", auth: "admin", handle: async (ctx) => { await ctx.container.admin.retryJob(ctx.session!, ctx.params.id || ""); return json({ ok: true }); } },
  { method: "GET", pattern: "/admin/audit", auth: "admin", handle: async (ctx) => json(await ctx.container.admin.audit(ctx.session!)) },
  { method: "GET", pattern: "/admin/tickets", auth: "admin", handle: async (ctx) => json(await ctx.container.admin.tickets(ctx.session!)) },
  { method: "POST", pattern: "/admin/tickets/:id", auth: "admin", handle: replyTicket },
  { method: "GET", pattern: "/admin/settings", auth: "admin", handle: async (ctx) => json(await ctx.container.admin.settings(ctx.session!)) },
  { method: "PUT", pattern: "/admin/settings/:key", auth: "admin", handle: updateSetting },
  { method: "GET", pattern: "/admin/plans", auth: "admin", handle: async (ctx) => json(await ctx.container.admin.listPlans(ctx.session!)) },
  { method: "PUT", pattern: "/admin/plans/:code", auth: "admin", handle: updateAdminPlan },
  { method: "GET", pattern: "/metrics", auth: "admin", handle: metrics },
];

function allowedOrigins(appUrl: string, extra: string) {
  const list = new Set(
    [appUrl, ...extra.split(",")]
      .map((value) => value.trim())
      .filter(Boolean),
  );
  return list;
}

function isAllowedOrigin(origin: string | null, appUrl: string, extra: string) {
  if (!origin) return false;
  if (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1")) return true;
  return allowedOrigins(appUrl, extra).has(origin);
}

export async function handleApi(req: Request, parts: string[]) {
  const container = getContainer();
  const cors = corsHeaders(req, container.config.APP_URL, container.config.CORS_ORIGINS || "");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (["POST", "PATCH", "PUT", "DELETE"].includes(req.method) && !req.headers.get("authorization")) {
    const origin = req.headers.get("origin");
    if (origin && !isAllowedOrigin(origin, container.config.APP_URL, container.config.CORS_ORIGINS || "")) {
      return json({ error: { code: "ORIGIN", message: "Origem recusada." } }, 403);
    }
  }
  const route = routes.find((item) => item.method === req.method && match(item.pattern, parts));
  if (!route) return json({ error: { code: "NOT_FOUND", message: "Recurso não encontrado." } }, 404);
  const params = match(route.pattern, parts) || {};
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || readCookie(req, "vf_access");
  const session = await container.auth.fromAccess(token);
  if (route.auth !== "public" && !session) return json({ error: { code: "UNAUTHENTICATED", message: "Entre para continuar." } }, 401);
  if (route.auth === "admin" && session?.platformRole !== "PLATFORM_ADMIN") return json({ error: { code: "FORBIDDEN", message: "Acesso restrito à administração." } }, 403);
  try {
    const response = await route.handle({ req, params, query: new URL(req.url).searchParams, container, session, ip: clientIp(req) });
    cors.forEach((value, key) => response.headers.set(key, value));
    return response;
  } catch (error) {
    const response = errorResponse(error);
    cors.forEach((value, key) => response.headers.set(key, value));
    return response;
  }
}

function corsHeaders(req: Request, appUrl: string, extra: string) {
  const headers = new Headers();
  const origin = req.headers.get("origin");
  if (origin && isAllowedOrigin(origin, appUrl, extra)) {
    headers.set("access-control-allow-origin", origin);
    headers.set("access-control-allow-credentials", "true");
    headers.set("access-control-allow-headers", "content-type, authorization, idempotency-key");
    headers.set("access-control-allow-methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
    headers.set("vary", "Origin");
  }
  return headers;
}

async function register(ctx: RouteContext) {
  const body = await readJson(ctx.req, registerSchema);
  if (!body.ok) return body.response;
  const enabled = await ctx.container.db.platformSetting.findUnique({ where: { key: "registrationEnabled" } });
  if (enabled && enabled.value === false) throw new AppError("REGISTRATION_CLOSED", "O cadastro está temporariamente fechado.", 403);
  const result = await ctx.container.auth.register(body.data);
  return json(
    {
      email: result.email,
      message: result.message,
      delivered: result.delivered,
      devCode: process.env.NODE_ENV === "production" ? null : result.devCode,
    },
    201,
  );
}

async function login(ctx: RouteContext) {
  const body = await readJson(ctx.req, loginSchema);
  if (!body.ok) return body.response;
  await ctx.container.auth.hitLoginLimit(`login:${ctx.ip}:${body.data.email}`);
  const result = await ctx.container.auth.login({ ...body.data, ip: ctx.ip, userAgent: ctx.req.headers.get("user-agent") || undefined });
  const mobile = ctx.req.headers.get("x-vendefacil-client") === "mobile";
  return json(mobile ? { accessToken: result.accessToken, refreshToken: result.refreshToken } : { ok: true }, 200, authCookies(result.accessToken, result.refreshToken));
}

async function logout(ctx: RouteContext) {
  await ctx.container.auth.logout(readCookie(ctx.req, "vf_access") || ctx.req.headers.get("authorization")?.replace(/^Bearer\s+/i, ""));
  return json({ ok: true }, 200, clearCookies());
}

async function refresh(ctx: RouteContext) {
  const token = readCookie(ctx.req, "vf_refresh") || (await ctx.req.json().catch(() => null))?.refreshToken;
  if (!token || typeof token !== "string") throw new AppError("UNAUTHENTICATED", "Sessão expirada.", 401);
  const result = await ctx.container.auth.refresh(token, { ip: ctx.ip, userAgent: ctx.req.headers.get("user-agent") || undefined });
  return json({ accessToken: result.accessToken, refreshToken: result.refreshToken }, 200, authCookies(result.accessToken, result.refreshToken));
}

async function forgot(ctx: RouteContext) {
  const body = await readJson(ctx.req, forgotSchema);
  if (!body.ok) return body.response;
  const result = await ctx.container.auth.forgotPassword(body.data.email);
  const link = result ? `${ctx.container.config.APP_URL}/redefinir-senha?token=${result.token}` : "";
  const devResetUrl = result ? await devMail({ to: result.email, subject: "Redefinir senha — VendeFacil AI", text: `Crie uma nova senha: ${link}`, devUrl: link }) : null;
  return json({ ok: true, devResetUrl });
}

async function reset(ctx: RouteContext) {
  const body = await readJson(ctx.req, resetSchema);
  if (!body.ok) return body.response;
  await ctx.container.auth.resetPassword(body.data.token, body.data.password);
  return json({ ok: true });
}

async function verify(ctx: RouteContext) {
  const body = await readJson(ctx.req, verifySchema);
  if (!body.ok) return body.response;
  const result = await ctx.container.auth.verifyEmail(body.data.email, body.data.code);
  const mobile = ctx.req.headers.get("x-vendefacil-client") === "mobile";
  return json(
    mobile ? { accessToken: result.accessToken, refreshToken: result.refreshToken, already: result.already } : { ok: true, already: result.already },
    200,
    authCookies(result.accessToken, result.refreshToken),
  );
}

async function resend(ctx: RouteContext) {
  const body = await readJson(ctx.req, resendVerificationSchema);
  if (!body.ok) return body.response;
  const result = await ctx.container.auth.resendVerification(body.data.email);
  return json({
    ok: true,
    message: result.message,
    delivered: result.delivered,
    devCode: process.env.NODE_ENV === "production" ? null : result.devCode,
  });
}

async function onboard(ctx: RouteContext) {
  const body = await readJson(ctx.req, onboardingSchema);
  if (!body.ok) return body.response;
  if (!ctx.session) throw new AppError("UNAUTHENTICATED", "Entre para continuar.", 401);
  return json(await ctx.container.tenants.onboard(ctx.session, body.data, ctx.ip));
}

async function updateStore(ctx: RouteContext) {
  const body = await readJson(ctx.req, storeSchema);
  if (!body.ok) return body.response;
  return json(await ctx.container.tenants.updateStore(requireTenantSession(ctx), { ...body.data, contactEmail: body.data.contactEmail || undefined }));
}

async function setLogo(ctx: RouteContext) {
  const payload = (await ctx.req.json()) as { assetId?: string };
  if (!payload.assetId) throw new AppError("VALIDATION", "Informe a imagem.", 422);
  const tenant = requireTenantSession(ctx);
  await ctx.container.tenants.setLogo(tenant, payload.assetId);
  await ctx.container.catalog.publishAsset(payload.assetId);
  return json({ ok: true });
}

async function invite(ctx: RouteContext) {
  const body = await readJson(ctx.req, inviteSchema);
  if (!body.ok) return body.response;
  const result = await ctx.container.tenants.invite(requireTenantSession(ctx), body.data);
  const link = `${ctx.container.config.APP_URL}/convite?token=${result.token}`;
  const devInviteUrl = await devMail({ to: body.data.email, subject: "Convite para a loja — VendeFacil AI", text: link, devUrl: link });
  return json({ ok: true, devInviteUrl });
}

async function acceptInvite(ctx: RouteContext) {
  const payload = (await ctx.req.json()) as { token?: string };
  if (!ctx.session || !payload.token) throw new AppError("VALIDATION", "Convite inválido.", 422);
  await ctx.container.tenants.acceptInvite(ctx.session, payload.token);
  return json({ ok: true });
}

async function updateMember(ctx: RouteContext) {
  const payload = (await ctx.req.json()) as { role?: "ADMIN" | "EDITOR" | "VIEWER" };
  if (!payload.role) throw new AppError("VALIDATION", "Informe o papel.", 422);
  await ctx.container.tenants.updateMember(requireTenantSession(ctx), ctx.params.id || "", payload.role);
  return json({ ok: true });
}

async function removeMember(ctx: RouteContext) {
  await ctx.container.tenants.removeMember(requireTenantSession(ctx), ctx.params.id || "");
  return json({ ok: true });
}

async function createCategory(ctx: RouteContext) {
  const body = await readJson(ctx.req, categorySchema);
  if (!body.ok) return body.response;
  return json(await ctx.container.catalog.createCategory(requireTenantSession(ctx), body.data.name));
}

async function listProducts(ctx: RouteContext) {
  const parsed = productListSchema.safeParse(Object.fromEntries(ctx.query.entries()));
  if (!parsed.success) throw new AppError("VALIDATION", "Filtro inválido.", 422);
  return json(await ctx.container.catalog.list(requireTenantSession(ctx), parsed.data));
}

async function createProduct(ctx: RouteContext) {
  const body = await readJson(ctx.req, productSchema);
  if (!body.ok) return body.response;
  return json(await ctx.container.catalog.create(requireTenantSession(ctx), body.data), 201);
}

async function updateProduct(ctx: RouteContext) {
  const body = await readJson(ctx.req, productSchema);
  if (!body.ok) return body.response;
  return json(await ctx.container.catalog.update(requireTenantSession(ctx), ctx.params.id || "", body.data));
}

async function addImage(ctx: RouteContext) {
  const payload = (await ctx.req.json()) as { assetId?: string; alt?: string };
  if (!payload.assetId) throw new AppError("VALIDATION", "Informe a imagem.", 422);
  return json(await ctx.container.catalog.addImage(requireTenantSession(ctx), ctx.params.id || "", payload.assetId, payload.alt));
}

async function createUpload(ctx: RouteContext) {
  const body = await readJson(ctx.req, uploadRequestSchema);
  if (!body.ok) return body.response;
  return json(await ctx.container.media.request(requireTenantSession(ctx), body.data));
}

async function analyze(ctx: RouteContext) {
  const payload = (await ctx.req.json()) as { assetId?: string };
  if (!payload.assetId) throw new AppError("VALIDATION", "Informe a imagem.", 422);
  return json(await ctx.container.studio.analyze(requireTenantSession(ctx), payload.assetId));
}

async function generateAd(ctx: RouteContext) {
  const body = await readJson(ctx.req, adGenerateSchema);
  if (!body.ok) return body.response;
  return json(await ctx.container.studio.generateAd(requireTenantSession(ctx), { ...body.data, facts: body.data.facts }, idempotency(ctx.req)));
}

async function productBackground(ctx: RouteContext) {
  const body = await readJson(ctx.req, productBackgroundSchema);
  if (!body.ok) return body.response;
  return json(await ctx.container.studio.productBackground(requireTenantSession(ctx), body.data, idempotency(ctx.req)));
}

async function saveAd(ctx: RouteContext) {
  const body = await readJson(ctx.req, adUpdateSchema);
  if (!body.ok) return body.response;
  const data = body.data;
  return json(
    await ctx.container.studio.saveAd(requireTenantSession(ctx), {
      id: ctx.params.id || undefined,
      title: data.title,
      description: data.description,
      hashtags: data.hashtags,
      tone: data.tone,
      status: data.status,
      productId: data.productId ?? null,
      imageAssetIds: data.imageAssetIds,
    }),
  );
}

async function artwork(ctx: RouteContext) {
  const body = await readJson(ctx.req, artworkSchema);
  if (!body.ok) return body.response;
  return json(await ctx.container.studio.artwork(requireTenantSession(ctx), body.data));
}

async function addMusic(ctx: RouteContext) {
  const body = await readJson(ctx.req, musicSchema);
  if (!body.ok) return body.response;
  return json(await ctx.container.videos.addMusic(requireTenantSession(ctx), body.data));
}

async function createVideo(ctx: RouteContext) {
  const body = await readJson(ctx.req, videoCreateSchema);
  if (!body.ok) return body.response;
  return json(await ctx.container.videos.create(requireTenantSession(ctx), body.data), 201);
}

async function updateVideo(ctx: RouteContext) {
  const body = await readJson(ctx.req, videoUpdateSchema);
  if (!body.ok) return body.response;
  return json(await ctx.container.videos.update(requireTenantSession(ctx), ctx.params.id || "", body.data));
}

async function storyboard(ctx: RouteContext) {
  const body = await readJson(ctx.req, storyboardSchema);
  if (!body.ok) return body.response;
  return json(await ctx.container.videos.storyboard(requireTenantSession(ctx), ctx.params.id || "", body.data.mode));
}

async function narrate(ctx: RouteContext) {
  const body = await readJson(ctx.req, narrationSchema);
  if (!body.ok) return body.response;
  return json(await ctx.container.videos.narrate(requireTenantSession(ctx), body.data, idempotency(ctx.req)));
}

async function renderVideo(ctx: RouteContext) {
  return json(await ctx.container.videos.requestRender(requireTenantSession(ctx), ctx.params.id || "", idempotency(ctx.req)), 202);
}

async function listOrders(ctx: RouteContext) {
  const status = ctx.query.get("status") as "NEW" | "CONFIRMED" | "PREPARING" | "COMPLETED" | "CANCELLED" | null;
  return json(await ctx.container.commerce.listOrders(requireTenantSession(ctx), status || undefined));
}

async function manualOrder(ctx: RouteContext) {
  const body = await readJson(ctx.req, manualOrderSchema);
  if (!body.ok) return body.response;
  return json(await ctx.container.commerce.manualOrder(requireTenantSession(ctx), { ...body.data, email: body.data.email || undefined }), 201);
}

async function updateOrder(ctx: RouteContext) {
  const body = await readJson(ctx.req, orderUpdateSchema);
  if (!body.ok) return body.response;
  return json(await ctx.container.commerce.updateOrder(requireTenantSession(ctx), ctx.params.id || "", body.data));
}

async function markContact(ctx: RouteContext) {
  const payload = (await ctx.req.json()) as { status?: "NEW" | "READ" | "ARCHIVED" };
  if (!payload.status) throw new AppError("VALIDATION", "Informe o status.", 422);
  await ctx.container.commerce.markContact(requireTenantSession(ctx), ctx.params.id || "", payload.status);
  return json({ ok: true });
}

async function stats(ctx: RouteContext) {
  const parsed = statsRangeSchema.safeParse({ range: ctx.query.get("range") || "7d" });
  if (!parsed.success) throw new AppError("VALIDATION", "Período inválido.", 422);
  const days = parsed.data.range === "90d" ? 90 : parsed.data.range === "30d" ? 30 : 7;
  return json(await ctx.container.commerce.stats(requireTenantSession(ctx), days));
}

async function checkout(ctx: RouteContext) {
  const payload = (await ctx.req.json()) as { planCode?: string; interval?: "MONTH" | "YEAR" };
  if (!payload.planCode) throw new AppError("VALIDATION", "Informe o plano.", 422);
  const interval = payload.interval === "YEAR" ? "YEAR" : "MONTH";
  return json(await ctx.container.billing.checkout(requireTenantSession(ctx), payload.planCode, ctx.container.config.APP_URL, interval));
}

async function changePlan(ctx: RouteContext) {
  const payload = (await ctx.req.json()) as { planCode?: string; interval?: "MONTH" | "YEAR" };
  if (!payload.planCode) throw new AppError("VALIDATION", "Informe o plano.", 422);
  const interval = payload.interval === "YEAR" ? "YEAR" : "MONTH";
  return json(await ctx.container.billing.changePlan(requireTenantSession(ctx), payload.planCode, interval, ctx.container.config.APP_URL));
}

async function updateAdminPlan(ctx: RouteContext) {
  const payload = (await ctx.req.json()) as {
    name?: string;
    description?: string;
    priceCents?: number;
    active?: boolean;
    limits?: unknown;
    features?: string[];
    badge?: string | null;
    highlighted?: boolean;
    icon?: string;
    position?: number;
    prices?: Array<{ interval: "MONTH" | "YEAR"; priceCents: number; active?: boolean }>;
  };
  return json(await ctx.container.admin.updatePlan(ctx.session!, ctx.params.code || "", payload));
}

async function webhook(ctx: RouteContext) {
  const body = await ctx.req.json().catch(() => ({}));
  const dataId = ctx.query.get("data.id") || (body as { data?: { id?: string } }).data?.id || null;
  return json(await ctx.container.billing.webhook({
    body,
    signature: ctx.req.headers.get("x-signature"),
    requestId: ctx.req.headers.get("x-request-id"),
    dataId: dataId ? String(dataId) : null,
  }));
}

async function publish(ctx: RouteContext) {
  const body = await readJson(ctx.req, publicationSchema);
  if (!body.ok) return body.response;
  return json(await ctx.container.publications.create(requireTenantSession(ctx), body.data));
}

function metaResultPage(input: { ok: boolean; from: "app" | "web"; title: string; detail: string; appUrl: string }) {
  const escape = (text: string) => text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
  const appLink = `vendefacil://estudio/publicar?meta=${input.ok ? "ok" : "erro"}`;
  const back = input.from === "app" ? appLink : `${input.appUrl}/publicar?conectado=${input.ok ? "facebook" : "erro"}`;
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(input.title)}</title>
<style>body{font-family:system-ui,sans-serif;background:#F5F6FA;margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px}
.card{background:#fff;border-radius:20px;padding:28px;max-width:420px;width:100%;text-align:center;box-shadow:0 8px 30px rgba(20,20,60,.08)}
h1{font-size:20px;margin:12px 0 8px;color:#151229}p{color:#5B5873;line-height:1.5;font-size:15px}
a{display:block;margin-top:20px;background:#6D28D9;color:#fff;text-decoration:none;padding:14px;border-radius:999px;font-weight:700}
.icon{font-size:44px}</style></head><body><div class="card"><div class="icon">${input.ok ? "✅" : "⚠️"}</div>
<h1>${escape(input.title)}</h1><p>${escape(input.detail)}</p><a href="${escape(back)}">Voltar ao VendeFácil</a></div>
${input.ok && input.from === "app" ? `<script>setTimeout(function(){location.href=${JSON.stringify(appLink)}},600)</script>` : ""}
</body></html>`;
  return new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
}

async function facebookCallback(ctx: RouteContext) {
  const code = ctx.query.get("code");
  const state = ctx.query.get("state");
  const appUrl = ctx.container.config.APP_URL;
  const from = ctx.container.publications.callbackOrigin(state);
  const metaError = ctx.query.get("error_description") || ctx.query.get("error_message") || ctx.query.get("error");
  if (metaError || !code || !state) {
    return metaResultPage({
      ok: false,
      from,
      appUrl,
      title: "Autorização não concluída",
      detail: metaError ? `A Meta respondeu: ${metaError}` : "A autorização foi cancelada. Volte ao app e toque em Conectar de novo.",
    });
  }
  try {
    const result = await ctx.container.publications.facebookCallback(code, state);
    return metaResultPage({
      ok: true,
      from: result.from,
      appUrl,
      title: "Conta conectada!",
      detail: result.instagram
        ? `Página “${result.page}” e Instagram @${result.instagram} autorizados. Já pode publicar direto pelo app.`
        : `Página “${result.page}” autorizada. Para o Instagram, vincule uma conta profissional a essa Página e conecte de novo.`,
    });
  } catch (cause) {
    return metaResultPage({
      ok: false,
      from,
      appUrl,
      title: "Não foi possível conectar",
      detail: cause instanceof AppError ? cause.message : "Falha ao falar com a Meta. Tente de novo em instantes.",
    });
  }
}

async function profile(ctx: RouteContext) {
  const body = await readJson(ctx.req, profileSchema);
  if (!body.ok) return body.response;
  await ctx.container.account.updateProfile(ctx.session!, body.data);
  return json({ ok: true });
}

async function password(ctx: RouteContext) {
  const body = await readJson(ctx.req, passwordChangeSchema);
  if (!body.ok) return body.response;
  await ctx.container.auth.changePassword(ctx.session!.userId, body.data.currentPassword, body.data.password, ctx.session!.sessionId);
  return json({ ok: true });
}

async function exportAccount(ctx: RouteContext) {
  const data = await ctx.container.account.exportData(ctx.session!);
  return new Response(JSON.stringify(data, null, 2), {
    headers: { "content-type": "application/json", "content-disposition": "attachment; filename=vendefacil-dados.json" },
  });
}

async function deleteAccount(ctx: RouteContext) {
  const body = await readJson(ctx.req, deleteAccountSchema);
  if (!body.ok) return body.response;
  await ctx.container.account.deleteAccount(ctx.session!, body.data);
  return json({ ok: true }, 200, clearCookies());
}

async function ticket(ctx: RouteContext) {
  const body = await readJson(ctx.req, ticketSchema);
  if (!body.ok) return body.response;
  return json(await ctx.container.account.createTicket(ctx.session!, body.data), 201);
}

async function publicStore(ctx: RouteContext) {
  const store = await ctx.container.commerce.publicStore(ctx.params.slug || "");
  if (!store) throw new AppError("NOT_FOUND", "Loja não encontrada.", 404);
  return json(store);
}

async function publicProduct(ctx: RouteContext) {
  const product = await ctx.container.commerce.publicProduct(ctx.params.slug || "", ctx.params.productSlug || "");
  if (!product) throw new AppError("NOT_FOUND", "Produto não encontrado.", 404);
  return json(product);
}

async function publicOrder(ctx: RouteContext) {
  const body = await readJson(ctx.req, publicOrderSchema);
  if (!body.ok) return body.response;
  return json(await ctx.container.commerce.publicOrder(ctx.params.slug || "", { ...body.data, email: body.data.email || undefined }), 201);
}

async function publicContact(ctx: RouteContext) {
  const body = await readJson(ctx.req, contactSchema);
  if (!body.ok) return body.response;
  await ctx.container.commerce.publicContact(ctx.params.slug || "", { ...body.data, email: body.data.email || undefined });
  return json({ ok: true }, 201);
}

async function track(ctx: RouteContext) {
  const body = await readJson(ctx.req, trackingSchema);
  if (!body.ok) return body.response;
  await ctx.container.commerce.track({ ...body.data, slug: ctx.params.slug || body.data.slug, visitorHash: hashVisitor(ctx.req, ctx.container.config.ENCRYPTION_KEY) });
  return json({ ok: true });
}

async function replyTicket(ctx: RouteContext) {
  const payload = (await ctx.req.json()) as { message?: string };
  if (!payload.message) throw new AppError("VALIDATION", "Escreva a resposta.", 422);
  await ctx.container.admin.reply(ctx.session!, ctx.params.id || "", payload.message);
  return json({ ok: true });
}

async function updateSetting(ctx: RouteContext) {
  const payload = await ctx.req.json();
  await ctx.container.admin.updateSetting(ctx.session!, ctx.params.key || "", payload);
  return json({ ok: true });
}

async function metrics(ctx: RouteContext) {
  const text = await ctx.container.admin.metrics(ctx.session!);
  return new Response(text, { headers: { "content-type": "text/plain; version=0.0.4" } });
}
