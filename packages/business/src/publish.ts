import type { PrismaClient, PublicationTarget, SocialProvider } from "@prisma/client";
import { formatBrl } from "@vendefacil/types";
import { openJson, sealJson } from "@vendefacil/media";
import type { CatalogService } from "./catalog";
import { AppError } from "./errors";
import { whatsAppLink } from "./ledger";
import { assertMinRole } from "./permissions";
import { audit, type Tenant, type TenantService } from "./tenant";

type SharePayload = {
  whatsappUrl?: string;
  link: string;
  caption: string;
  imageUrl?: string | null;
  productName?: string | null;
};

const META_SCOPES = [
  "pages_show_list",
  "pages_manage_posts",
  "pages_read_engagement",
  "instagram_basic",
  "instagram_content_publish",
  "business_management",
];

export class PublicationService {
  constructor(
    private db: PrismaClient,
    private tenants: TenantService,
    private encryptionKey: string,
    private appUrl: string,
    private catalog?: CatalogService,
  ) {}

  async channels(tenant: Tenant) {
    const connections = await this.db.socialConnection.findMany({ where: { organizationId: tenant.organizationId } });
    const byProvider = new Map(connections.map((item) => [item.provider, item]));
    const facebook = byProvider.get("FACEBOOK");
    const instagram = byProvider.get("INSTAGRAM");
    const metaConfigured = Boolean(process.env.FACEBOOK_APP_ID);
    return [
      {
        provider: "WHATSAPP" as const,
        status: "READY",
        detail: "Abre o WhatsApp com o produto pronto (nome, preço, descrição e link).",
        connectUrl: null as string | null,
      },
      {
        provider: "INSTAGRAM" as const,
        status: !metaConfigured ? "REQUIRES_AUTH" : instagram?.status === "CONNECTED" ? "CONNECTED" : "DISCONNECTED",
        detail: !metaConfigured
          ? "Configure o aplicativo Meta no servidor para conectar o Instagram."
          : instagram?.status === "CONNECTED"
            ? `Conectado: ${instagram.externalAccountName || "Instagram Business"}`
            : "Autorize sua conta Instagram Business para publicar direto.",
        connectUrl: metaConfigured ? "/api/integrations/facebook/start" : null,
      },
      {
        provider: "FACEBOOK" as const,
        status: !metaConfigured ? "REQUIRES_AUTH" : facebook?.status === "CONNECTED" ? "CONNECTED" : "DISCONNECTED",
        detail: !metaConfigured
          ? "Configure o aplicativo Meta no servidor para conectar o Facebook."
          : facebook?.status === "CONNECTED"
            ? `Conectado: ${facebook.externalAccountName || "Página"}`
            : "Autorize uma Página do Facebook para publicar direto.",
        connectUrl: metaConfigured ? "/api/integrations/facebook/start" : null,
      },
    ];
  }

  async list(tenant: Tenant) {
    return this.db.publication.findMany({
      where: { organizationId: tenant.organizationId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { attempts: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
  }

  facebookStart(tenant: Tenant) {
    assertMinRole(tenant.role, "EDITOR");
    if (!process.env.FACEBOOK_APP_ID) throw new AppError("PROVIDER_NOT_CONFIGURED", "O aplicativo Meta não está configurado.", 503);
    const state = sealJson({ organizationId: tenant.organizationId, userId: tenant.userId, exp: Date.now() + 10 * 60 * 1000 }, this.encryptionKey);
    const url = new URL("https://www.facebook.com/v21.0/dialog/oauth");
    url.searchParams.set("client_id", process.env.FACEBOOK_APP_ID);
    url.searchParams.set("redirect_uri", `${this.appUrl}/api/integrations/facebook/callback`);
    url.searchParams.set("state", state);
    url.searchParams.set("scope", META_SCOPES.join(","));
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
        scopes: META_SCOPES,
      },
      update: {
        status: "CONNECTED",
        externalAccountId: page.id,
        externalAccountName: page.name,
        encryptedCredentials: sealJson({ pageAccessToken: page.access_token }, this.encryptionKey),
        scopes: META_SCOPES,
      },
    });

    const igResponse = await fetch(
      `https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account{id,username}&access_token=${encodeURIComponent(page.access_token)}`,
    );
    const igPayload = (await igResponse.json()) as {
      instagram_business_account?: { id: string; username?: string };
      error?: { message?: string };
    };
    if (igPayload.instagram_business_account?.id) {
      await this.db.socialConnection.upsert({
        where: { organizationId_provider: { organizationId: parsed.organizationId, provider: "INSTAGRAM" } },
        create: {
          organizationId: parsed.organizationId,
          provider: "INSTAGRAM",
          status: "CONNECTED",
          externalAccountId: igPayload.instagram_business_account.id,
          externalAccountName: igPayload.instagram_business_account.username || "Instagram Business",
          encryptedCredentials: sealJson(
            {
              pageAccessToken: page.access_token,
              pageId: page.id,
              igUserId: igPayload.instagram_business_account.id,
            },
            this.encryptionKey,
          ),
          scopes: META_SCOPES,
        },
        update: {
          status: "CONNECTED",
          externalAccountId: igPayload.instagram_business_account.id,
          externalAccountName: igPayload.instagram_business_account.username || "Instagram Business",
          encryptedCredentials: sealJson(
            {
              pageAccessToken: page.access_token,
              pageId: page.id,
              igUserId: igPayload.instagram_business_account.id,
            },
            this.encryptionKey,
          ),
          scopes: META_SCOPES,
        },
      });
    }

    await audit(this.db, {
      organizationId: parsed.organizationId,
      actorUserId: parsed.userId,
      action: "meta.connected",
      entityType: "SocialConnection",
      metadata: { page: page.name, instagram: igPayload.instagram_business_account?.username || null },
    });
  }

  async create(
    tenant: Tenant,
    input: {
      channel: SocialProvider;
      targetType: PublicationTarget;
      targetId: string;
      caption?: string;
      scheduledAt?: string | null;
      confirmManual?: boolean;
    },
  ) {
    assertMinRole(tenant.role, "EDITOR");
    const limits = await this.tenants.limits(tenant.organizationId);
    if (input.scheduledAt && !limits.scheduledPosts) {
      throw new AppError("PLAN_LIMIT", "O agendamento está disponível nos planos Profissional e Empresarial.", 402);
    }

    const built = await this.buildShareContent(tenant, input.targetType, input.targetId, input.caption);
    const caption = built.caption;

    if (!input.scheduledAt && input.channel === "FACEBOOK") {
      return this.publishFacebook(tenant, input.targetType, input.targetId, caption, built.imageUrl);
    }
    if (!input.scheduledAt && input.channel === "INSTAGRAM") {
      return this.publishInstagram(tenant, input.targetType, input.targetId, caption, built.imageUrl);
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
        manual: input.channel === "WHATSAPP" || input.channel === "INSTAGRAM",
      },
    });
    return {
      publication,
      share: await this.sharePayload(tenant, publication.channel, caption, input.targetType, input.targetId, built),
    };
  }

  async dispatchDue() {
    const due = await this.db.publication.findMany({ where: { status: "SCHEDULED", scheduledAt: { lte: new Date() } }, take: 20 });
    for (const publication of due) {
      if (publication.channel === "FACEBOOK" || publication.channel === "INSTAGRAM") {
        const tenant = {
          organizationId: publication.organizationId,
          role: "ADMIN" as const,
          userId: publication.organizationId,
          name: "",
          email: "",
          platformRole: "USER" as const,
          emailVerified: true,
          sessionId: "",
        };
        try {
          const built = await this.buildShareContent(tenant as Tenant, publication.targetType, publication.targetId, publication.caption);
          if (publication.channel === "FACEBOOK") {
            await this.publishFacebook(tenant, publication.targetType, publication.targetId, publication.caption, built.imageUrl, publication.id);
          } else {
            await this.publishInstagram(tenant, publication.targetType, publication.targetId, publication.caption, built.imageUrl, publication.id);
          }
        } catch (error) {
          await this.db.publication.update({ where: { id: publication.id }, data: { status: "FAILED" } });
          await this.db.publicationAttempt.create({
            data: {
              publicationId: publication.id,
              status: "FAILED",
              errorMessage: error instanceof Error ? error.message : "Falha",
            },
          });
        }
      } else {
        await this.db.publication.update({ where: { id: publication.id }, data: { status: "MANUAL_REQUIRED" } });
        await this.db.notification.create({
          data: {
            organizationId: publication.organizationId,
            title: "Hora de publicar",
            body: "Um agendamento precisa da sua ação no canal.",
            href: "/publicar",
          },
        });
      }
    }
  }

  private async publishFacebook(
    tenant: Pick<Tenant, "organizationId" | "userId">,
    targetType: PublicationTarget,
    targetId: string,
    caption: string,
    imageUrl?: string | null,
    publicationId?: string,
  ) {
    const connection = await this.db.socialConnection.findUnique({
      where: { organizationId_provider: { organizationId: tenant.organizationId, provider: "FACEBOOK" } },
    });
    if (!connection?.encryptedCredentials || connection.status !== "CONNECTED" || !connection.externalAccountId) {
      throw new AppError("REQUIRES_AUTH", "Conecte uma Página do Facebook antes de publicar.", 409);
    }
    const credentials = openJson<{ pageAccessToken: string }>(connection.encryptedCredentials, this.encryptionKey);
    let response: Response;
    let payload: { id?: string; post_id?: string; error?: { message?: string } };
    if (imageUrl) {
      response = await fetch(`https://graph.facebook.com/v21.0/${connection.externalAccountId}/photos`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: imageUrl, caption, access_token: credentials.pageAccessToken }),
      });
      payload = (await response.json()) as typeof payload;
    } else {
      response = await fetch(`https://graph.facebook.com/v21.0/${connection.externalAccountId}/feed`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: caption, access_token: credentials.pageAccessToken }),
      });
      payload = (await response.json()) as typeof payload;
    }
    const externalId = payload.id || payload.post_id;
    const publication = publicationId
      ? await this.db.publication.update({
          where: { id: publicationId },
          data: {
            status: response.ok ? "PUBLISHED" : "FAILED",
            publishedAt: response.ok ? new Date() : null,
            externalUrl: externalId ? `https://facebook.com/${externalId}` : null,
            manual: false,
          },
        })
      : await this.db.publication.create({
          data: {
            organizationId: tenant.organizationId,
            channel: "FACEBOOK",
            status: response.ok ? "PUBLISHED" : "FAILED",
            targetType,
            targetId,
            caption,
            publishedAt: response.ok ? new Date() : null,
            externalUrl: externalId ? `https://facebook.com/${externalId}` : null,
            manual: false,
          },
        });
    await this.db.publicationAttempt.create({
      data: {
        publicationId: publication.id,
        status: response.ok ? "PUBLISHED" : "FAILED",
        errorMessage: payload.error?.message,
        metadata: { id: externalId ?? null },
      },
    });
    if (!response.ok) throw new AppError("PUBLISH_FAILED", payload.error?.message || "O Facebook recusou a publicação.", 502);
    return { publication, share: null as SharePayload | null };
  }

  private async publishInstagram(
    tenant: Pick<Tenant, "organizationId" | "userId">,
    targetType: PublicationTarget,
    targetId: string,
    caption: string,
    imageUrl?: string | null,
    publicationId?: string,
  ) {
    const connection = await this.db.socialConnection.findUnique({
      where: { organizationId_provider: { organizationId: tenant.organizationId, provider: "INSTAGRAM" } },
    });
    if (!connection?.encryptedCredentials || connection.status !== "CONNECTED" || !connection.externalAccountId) {
      throw new AppError("REQUIRES_AUTH", "Conecte o Instagram Business (via Meta) antes de publicar.", 409);
    }
    if (!imageUrl) {
      throw new AppError("IMAGES_REQUIRED", "O Instagram precisa de uma foto do produto para publicar.", 422);
    }
    const credentials = openJson<{ pageAccessToken: string; igUserId: string }>(connection.encryptedCredentials, this.encryptionKey);
    const igUserId = credentials.igUserId || connection.externalAccountId;
    const createResponse = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        image_url: imageUrl,
        caption,
        access_token: credentials.pageAccessToken,
      }),
    });
    const created = (await createResponse.json()) as { id?: string; error?: { message?: string } };
    if (!createResponse.ok || !created.id) {
      throw new AppError("PUBLISH_FAILED", created.error?.message || "Não foi possível preparar a mídia no Instagram.", 502);
    }
    const publishResponse = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media_publish`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ creation_id: created.id, access_token: credentials.pageAccessToken }),
    });
    const published = (await publishResponse.json()) as { id?: string; error?: { message?: string } };
    const ok = publishResponse.ok && Boolean(published.id);
    const publication = publicationId
      ? await this.db.publication.update({
          where: { id: publicationId },
          data: {
            status: ok ? "PUBLISHED" : "FAILED",
            publishedAt: ok ? new Date() : null,
            externalUrl: published.id ? `https://instagram.com/p/${published.id}` : null,
            manual: false,
          },
        })
      : await this.db.publication.create({
          data: {
            organizationId: tenant.organizationId,
            channel: "INSTAGRAM",
            status: ok ? "PUBLISHED" : "FAILED",
            targetType,
            targetId,
            caption,
            publishedAt: ok ? new Date() : null,
            externalUrl: published.id ? `https://instagram.com/p/${published.id}` : null,
            manual: false,
          },
        });
    await this.db.publicationAttempt.create({
      data: {
        publicationId: publication.id,
        status: ok ? "PUBLISHED" : "FAILED",
        errorMessage: published.error?.message || created.error?.message,
        metadata: { id: published.id ?? null, creationId: created.id },
      },
    });
    if (!ok) throw new AppError("PUBLISH_FAILED", published.error?.message || "O Instagram recusou a publicação.", 502);
    return { publication, share: null as SharePayload | null };
  }

  private async buildShareContent(
    tenant: Pick<Tenant, "organizationId">,
    targetType: PublicationTarget,
    targetId: string,
    customCaption?: string,
  ) {
    const store = await this.db.store.findUnique({ where: { organizationId: tenant.organizationId } });
    let productName: string | null = null;
    let imageAssetId: string | null = null;
    let productSlug: string | null = null;
    let autoCaption = "";

    if (targetType === "ADVERTISEMENT") {
      const ad = await this.db.advertisement.findFirst({ where: { id: targetId, organizationId: tenant.organizationId } });
      if (!ad) throw new AppError("NOT_FOUND", "Anúncio não encontrado.", 404);
      productName = ad.title;
      autoCaption = `${ad.title}\n\n${ad.description}\n\n${ad.hashtags.map((tag) => `#${tag}`).join(" ")}`.trim();
      if (ad.productId) {
        const product = await this.db.product.findFirst({
          where: { id: ad.productId, organizationId: tenant.organizationId },
          include: { images: { orderBy: { position: "asc" }, take: 1 } },
        });
        productSlug = product?.slug || null;
        imageAssetId = product?.images[0]?.mediaAssetId || null;
      }
    } else if (targetType === "PRODUCT") {
      const product = await this.db.product.findFirst({
        where: { id: targetId, organizationId: tenant.organizationId },
        include: { images: { orderBy: { position: "asc" }, take: 1 } },
      });
      if (!product) throw new AppError("NOT_FOUND", "Produto não encontrado.", 404);
      productName = product.name;
      productSlug = product.slug;
      imageAssetId = product.images[0]?.mediaAssetId || null;
      const price = product.promoPriceCents ?? product.priceCents;
      const priceLine = formatBrl(price);
      const promoLine =
        product.promoPriceCents != null && product.promoPriceCents < product.priceCents
          ? `De ${formatBrl(product.priceCents)} por ${formatBrl(product.promoPriceCents)}`
          : priceLine;
      autoCaption = [`*${product.name}*`, promoLine, "", product.description?.trim() || "Confira este produto na nossa loja."].filter(Boolean).join("\n").trim();
    } else if (targetType === "VIDEO") {
      const video = await this.db.videoProject.findFirst({ where: { id: targetId, organizationId: tenant.organizationId } });
      if (!video) throw new AppError("NOT_FOUND", "Vídeo não encontrado.", 404);
      productName = video.title;
      autoCaption = video.title;
    }

    const storeLink = store ? `${this.appUrl}/v/${store.slug}` : this.appUrl;
    const productLink = store && productSlug ? `${this.appUrl}/v/${store.slug}/${productSlug}` : storeLink;
    const userCaption = (customCaption || "").trim();
    const body = userCaption || autoCaption;
    const caption = `${body}\n\n🔗 ${productLink}`.trim();

    let imageUrl: string | null = null;
    if (imageAssetId) {
      if (this.catalog) await this.catalog.publishAsset(imageAssetId).catch(() => undefined);
      imageUrl = `${this.appUrl}/api/media/${imageAssetId}`;
    }

    return { caption, link: productLink, imageUrl, productName, autoCaption };
  }

  private async sharePayload(
    tenant: Tenant,
    channel: SocialProvider,
    caption: string,
    _targetType: PublicationTarget,
    _targetId: string,
    built: { link: string; imageUrl: string | null; productName: string | null },
  ): Promise<SharePayload> {
    if (channel === "WHATSAPP") {
      // Sem número fixo: o usuário escolhe o contato/grupo no WhatsApp.
      return {
        whatsappUrl: whatsAppLink("", caption),
        link: built.link,
        caption,
        imageUrl: built.imageUrl,
        productName: built.productName,
      };
    }
    return {
      link: built.link,
      caption,
      imageUrl: built.imageUrl,
      productName: built.productName,
    };
  }
}
