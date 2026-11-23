import type { PrismaClient, PublicationTarget, SocialProvider } from "@prisma/client";
import { openJson, sealJson } from "@vendefacil/media";
import { AppError } from "./errors";
import { whatsAppLink } from "./ledger";
import { assertMinRole } from "./permissions";
import { audit, type Tenant, type TenantService } from "./tenant";

export class PublicationService {
  constructor(private db: PrismaClient, private tenants: TenantService, private encryptionKey: string, private appUrl: string) {}

  async channels(tenant: Tenant) {
    const connections = await this.db.socialConnection.findMany({ where: { organizationId: tenant.organizationId } });
    const byProvider = new Map(connections.map((item) => [item.provider, item]));
    const facebook = byProvider.get("FACEBOOK");
    return [
      { provider: "WHATSAPP" as const, status: "MANUAL_ONLY", detail: "Abre o WhatsApp com a mensagem pronta. A plataforma não envia a mensagem sozinha." },
      { provider: "INSTAGRAM" as const, status: "MANUAL_ONLY", detail: "Baixe a mídia e copie a legenda. A publicação direta só existe com a API oficial autorizada, que não está simulada aqui." },
      {
        provider: "FACEBOOK" as const,
        status: !process.env.FACEBOOK_APP_ID ? "REQUIRES_AUTH" : facebook?.status || "DISCONNECTED",
        detail: !process.env.FACEBOOK_APP_ID ? "O aplicativo Meta ainda não foi configurado no servidor." : facebook?.externalAccountName || "Conecte uma Página do Facebook para publicar pela API.",
      },
    ];
  }

  async list(tenant: Tenant) {
    return this.db.publication.findMany({ where: { organizationId: tenant.organizationId }, orderBy: { createdAt: "desc" }, take: 50, include: { attempts: { orderBy: { createdAt: "desc" }, take: 1 } } });
  }

  facebookStart(tenant: Tenant) {
    assertMinRole(tenant.role, "ADMIN");
    if (!process.env.FACEBOOK_APP_ID) throw new AppError("PROVIDER_NOT_CONFIGURED", "O aplicativo Meta não está configurado.", 503);
    const state = sealJson({ organizationId: tenant.organizationId, userId: tenant.userId, exp: Date.now() + 10 * 60 * 1000 }, this.encryptionKey);
    const url = new URL("https://www.facebook.com/v21.0/dialog/oauth");
    url.searchParams.set("client_id", process.env.FACEBOOK_APP_ID);
    url.searchParams.set("redirect_uri", `${this.appUrl}/api/integrations/facebook/callback`);
    url.searchParams.set("state", state);
    url.searchParams.set("scope", "pages_show_list,pages_manage_posts,pages_read_engagement");
    return url.toString();
  }

  async facebookCallback(code: string, state: string) {
    const parsed = openJson<{ organizationId: string; userId: string; exp: number }>(state, this.encryptionKey);
    if (!parsed.exp || parsed.exp < Date.now()) throw new AppError("TOKEN_EXPIRED", "A autorização expirou.", 400);
    if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) throw new AppError("PROVIDER_NOT_CONFIGURED", "Aplicativo Meta incompleto.", 503);
    const tokenUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", process.env.FACEBOOK_APP_ID);
    tokenUrl.searchParams.set("client_secret", process.env.FACEBOOK_APP_SECRET);
    tokenUrl.searchParams.set("redirect_uri", `${this.appUrl}/api/integrations/facebook/callback`);
    tokenUrl.searchParams.set("code", code);
    const tokenResponse = await fetch(tokenUrl);
    const tokenPayload = (await tokenResponse.json()) as { access_token?: string; error?: { message?: string } };
    if (!tokenResponse.ok || !tokenPayload.access_token) {
      throw new AppError("OAUTH_FAILED", tokenPayload.error?.message || "O Facebook não autorizou a conexão.", 502);
    }
    const pagesResponse = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${encodeURIComponent(tokenPayload.access_token)}`);
    const pages = (await pagesResponse.json()) as { data?: Array<{ id: string; name: string; access_token: string }> };
    const page = pages.data?.[0];
    if (!page) throw new AppError("OAUTH_FAILED", "Nenhuma Página do Facebook foi encontrada nesta conta.", 422);
    await this.db.socialConnection.upsert({
      where: { organizationId_provider: { organizationId: parsed.organizationId, provider: "FACEBOOK" } },
      create: {
        organizationId: parsed.organizationId,
        provider: "FACEBOOK",
        status: "CONNECTED",
        externalAccountId: page.id,
        externalAccountName: page.name,
        encryptedCredentials: sealJson({ pageAccessToken: page.access_token }, this.encryptionKey),
        scopes: ["pages_manage_posts"],
      },
      update: {
        status: "CONNECTED",
        externalAccountId: page.id,
        externalAccountName: page.name,
        encryptedCredentials: sealJson({ pageAccessToken: page.access_token }, this.encryptionKey),
      },
    });
    await audit(this.db, { organizationId: parsed.organizationId, actorUserId: parsed.userId, action: "facebook.connected", entityType: "SocialConnection", metadata: { page: page.name } });
  }

  async create(tenant: Tenant, input: { channel: SocialProvider; targetType: PublicationTarget; targetId: string; caption?: string; scheduledAt?: string | null; confirmManual?: boolean }) {
    assertMinRole(tenant.role, "EDITOR");
    const limits = await this.tenants.limits(tenant.organizationId);
    if (input.scheduledAt && !limits.scheduledPosts) throw new AppError("PLAN_LIMIT", "O agendamento está disponível nos planos Profissional e Empresarial.", 402);
    const caption = input.caption || (await this.captionFor(tenant, input.targetType, input.targetId));
    if (input.channel === "FACEBOOK" && !input.scheduledAt) {
      return this.publishFacebook(tenant, input.targetType, input.targetId, caption);
    }
    const status = input.scheduledAt ? "SCHEDULED" : input.confirmManual ? "PUBLISHED" : "MANUAL_REQUIRED";
    const publication = await this.db.publication.create({
      data: {
        organizationId: tenant.organizationId,
        channel: input.channel,
        status,
        targetType: input.targetType,
        targetId: input.targetId,
        caption,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
        publishedAt: status === "PUBLISHED" ? new Date() : null,
        manual: input.channel !== "FACEBOOK",
      },
    });
    return { publication, share: await this.sharePayload(tenant, publication.channel, caption, input.targetType, input.targetId) };
  }

  async dispatchDue() {
    const due = await this.db.publication.findMany({ where: { status: "SCHEDULED", scheduledAt: { lte: new Date() } }, take: 20 });
    for (const publication of due) {
      if (publication.channel === "FACEBOOK") {
        const tenant = { organizationId: publication.organizationId, role: "ADMIN" as const, userId: publication.organizationId, name: "", email: "", platformRole: "USER" as const, emailVerified: true, sessionId: "" };
        try {
          await this.publishFacebook(tenant, publication.targetType, publication.targetId, publication.caption, publication.id);
        } catch (error) {
          await this.db.publication.update({ where: { id: publication.id }, data: { status: "FAILED" } });
          await this.db.publicationAttempt.create({ data: { publicationId: publication.id, status: "FAILED", errorMessage: error instanceof Error ? error.message : "Falha" } });
        }
      } else {
        await this.db.publication.update({ where: { id: publication.id }, data: { status: "MANUAL_REQUIRED" } });
        await this.db.notification.create({ data: { organizationId: publication.organizationId, title: "Hora de publicar", body: "Um agendamento precisa da sua ação no canal.", href: "/publicar" } });
      }
    }
  }

  private async publishFacebook(tenant: Pick<Tenant, "organizationId" | "userId">, targetType: PublicationTarget, targetId: string, caption: string, publicationId?: string) {
    const connection = await this.db.socialConnection.findUnique({ where: { organizationId_provider: { organizationId: tenant.organizationId, provider: "FACEBOOK" } } });
    if (!connection?.encryptedCredentials || connection.status !== "CONNECTED" || !connection.externalAccountId) {
      throw new AppError("REQUIRES_AUTH", "Conecte uma Página do Facebook antes de publicar por API.", 409);
    }
    const credentials = openJson<{ pageAccessToken: string }>(connection.encryptedCredentials, this.encryptionKey);
    const response = await fetch(`https://graph.facebook.com/v21.0/${connection.externalAccountId}/feed`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: caption, access_token: credentials.pageAccessToken }),
    });
    const payload = (await response.json()) as { id?: string; error?: { message?: string } };
    const publication = publicationId
      ? await this.db.publication.update({ where: { id: publicationId }, data: { status: response.ok ? "PUBLISHED" : "FAILED", publishedAt: response.ok ? new Date() : null, externalUrl: payload.id ? `https://facebook.com/${payload.id}` : null } })
      : await this.db.publication.create({
          data: { organizationId: tenant.organizationId, channel: "FACEBOOK", status: response.ok ? "PUBLISHED" : "FAILED", targetType, targetId, caption, publishedAt: response.ok ? new Date() : null, externalUrl: payload.id ? `https://facebook.com/${payload.id}` : null },
        });
    await this.db.publicationAttempt.create({ data: { publicationId: publication.id, status: response.ok ? "PUBLISHED" : "FAILED", errorMessage: payload.error?.message, metadata: { id: payload.id ?? null } } });
    if (!response.ok) throw new AppError("PUBLISH_FAILED", payload.error?.message || "O Facebook recusou a publicação.", 502);
    return { publication, share: null };
  }

  private async captionFor(tenant: Tenant, targetType: PublicationTarget, targetId: string) {
    if (targetType === "ADVERTISEMENT") {
      const ad = await this.db.advertisement.findFirst({ where: { id: targetId, organizationId: tenant.organizationId } });
      if (!ad) throw new AppError("NOT_FOUND", "Anúncio não encontrado.", 404);
      return `${ad.title}\n\n${ad.description}\n\n${ad.hashtags.map((tag) => `#${tag}`).join(" ")}`.trim();
    }
    if (targetType === "PRODUCT") {
      const product = await this.db.product.findFirst({ where: { id: targetId, organizationId: tenant.organizationId } });
      if (!product) throw new AppError("NOT_FOUND", "Produto não encontrado.", 404);
      return product.description || product.name;
    }
    return "";
  }

  private async sharePayload(tenant: Tenant, channel: SocialProvider, caption: string, targetType: PublicationTarget, targetId: string) {
    const store = await this.db.store.findUnique({ where: { organizationId: tenant.organizationId } });
    const link = store ? `${this.appUrl}/v/${store.slug}` : this.appUrl;
    if (channel === "WHATSAPP") {
      return { whatsappUrl: whatsAppLink(store?.whatsapp || "", `${caption}\n${link}`.trim()), link, caption };
    }
    return { link, caption, targetType, targetId };
  }
}
