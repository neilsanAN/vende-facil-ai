import { createHash } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { ProviderNotConfiguredError, type AiRegistry, type ConfirmedFacts } from "@vendefacil/ai";
import { composeArtwork, type StorageService } from "@vendefacil/media";
import { formatBrl, normalizeHashtags } from "@vendefacil/types";
import { AppError } from "./errors";
import { assertGroundedCopy, debitKind } from "./ledger";
import { assertMinRole } from "./permissions";
import { audit, type Tenant, type TenantService } from "./tenant";
import { CatalogService } from "./catalog";
import type { BillingService } from "./billing";

export class StudioService {
  constructor(
    private db: PrismaClient,
    private ai: AiRegistry,
    private storage: StorageService,
    private tenants: TenantService,
    private catalog: CatalogService,
    private billing: BillingService,
  ) {}

  async analyze(tenant: Tenant, assetId: string) {
    assertMinRole(tenant.role, "EDITOR");
    if (!this.ai.vision) throw new AppError("PROVIDER_NOT_CONFIGURED", "A análise de imagem precisa de um provedor de IA configurado.", 503);
    await this.guardHourly(tenant.organizationId);
    const asset = await this.ownedImage(tenant.organizationId, assetId);
    const image = await this.storage.getObject("private", asset.objectKey);
    try {
      const result = await this.ai.vision.analyze({ image, mimeType: asset.mimeType });
      await this.record(tenant, "IMAGE_ANALYSIS", result.usage, { assetId });
      return result.analysis;
    } catch (error) {
      await this.recordFailure(tenant, "IMAGE_ANALYSIS", this.ai.vision?.id || "ai", error);
      throw new AppError("AI_FAILED", "Não foi possível analisar a imagem.", 502);
    }
  }

  async generateAd(tenant: Tenant, input: { assetIds: string[]; tone: "PROFESSIONAL" | "FRIENDLY" | "URGENT" | "ELEGANT"; facts: ConfirmedFacts & { priceCents?: number | null }; productId?: string | null }, idempotencyKey: string) {
    assertMinRole(tenant.role, "EDITOR");
    if (!this.ai.text) throw new AppError("PROVIDER_NOT_CONFIGURED", "A geração de texto precisa de um provedor de IA configurado. Você ainda pode escrever o anúncio manualmente.", 503);
    await this.guardHourly(tenant.organizationId);
    for (const assetId of input.assetIds) await this.ownedImage(tenant.organizationId, assetId);
    if (input.productId) {
      const product = await this.db.product.findFirst({ where: { id: input.productId, organizationId: tenant.organizationId } });
      if (!product) throw new AppError("NOT_FOUND", "Produto não encontrado.", 404);
    }
    let result;
    try {
      result = await this.ai.text.adCopy({ facts: { ...input.facts, priceLabel: input.facts.priceCents != null ? formatBrl(input.facts.priceCents) : undefined }, tone: input.tone });
    } catch (error) {
      if (error instanceof ProviderNotConfiguredError) throw new AppError("PROVIDER_NOT_CONFIGURED", error.message, 503);
      await this.recordFailure(tenant, "TEXT", this.ai.text?.id || "ai", error);
      throw new AppError("AI_FAILED", "Não foi possível gerar o anúncio.", 502);
    }
    assertGroundedCopy(`${result.copy.title}\n${result.copy.description}`, input.facts.priceCents != null);
    const generation = await this.record(tenant, "TEXT", result.usage, { tone: input.tone });
    await debitKind(this.db, { organizationId: tenant.organizationId, kind: "ANNOUNCEMENT", amount: 1, reason: "ad_generation", idempotencyKey: `ad:${idempotencyKey}`, referenceType: "AiGeneration", referenceId: generation.id });
    await this.billing.recordUsage(tenant.organizationId, "ai.announcement", 1, { generationId: generation.id });
    const ad = await this.db.advertisement.create({
      data: {
        organizationId: tenant.organizationId,
        productId: input.productId ?? null,
        title: result.copy.title,
        description: result.copy.description,
        hashtags: normalizeHashtags(result.copy.hashtags, input.facts.name),
        tone: input.tone,
        versions: {
          create: {
            organizationId: tenant.organizationId,
            title: result.copy.title,
            description: result.copy.description,
            hashtags: normalizeHashtags(result.copy.hashtags, input.facts.name),
            source: "AI",
            aiGenerationId: generation.id,
          },
        },
      },
    });
    await audit(this.db, { organizationId: tenant.organizationId, actorUserId: tenant.userId, action: "ad.generated", entityType: "Advertisement", entityId: ad.id });
    return this.presentAd(ad.id, tenant.organizationId);
  }

  async saveAd(tenant: Tenant, input: { id?: string; title: string; description: string; hashtags: string[]; tone: "PROFESSIONAL" | "FRIENDLY" | "URGENT" | "ELEGANT"; status?: "DRAFT" | "PUBLISHED" | "ARCHIVED"; productId?: string | null }) {
    assertMinRole(tenant.role, "EDITOR");
    const hashtags = normalizeHashtags(input.hashtags);
    if (input.id) {
      const current = await this.db.advertisement.findFirst({ where: { id: input.id, organizationId: tenant.organizationId } });
      if (!current) throw new AppError("NOT_FOUND", "Anúncio não encontrado.", 404);
      await this.db.advertisement.update({
        where: { id: current.id },
        data: { title: input.title, description: input.description, hashtags, tone: input.tone, status: input.status, productId: input.productId },
      });
      await this.db.advertisementVersion.create({
        data: { advertisementId: current.id, organizationId: tenant.organizationId, title: input.title, description: input.description, hashtags, source: "MANUAL" },
      });
      return this.presentAd(current.id, tenant.organizationId);
    }
    const created = await this.db.advertisement.create({
      data: {
        organizationId: tenant.organizationId,
        title: input.title,
        description: input.description,
        hashtags,
        tone: input.tone,
        status: input.status ?? "DRAFT",
        productId: input.productId ?? null,
        versions: { create: { organizationId: tenant.organizationId, title: input.title, description: input.description, hashtags, source: "MANUAL" } },
      },
    });
    return this.presentAd(created.id, tenant.organizationId);
  }

  async listAds(tenant: Tenant) {
    const rows = await this.db.advertisement.findMany({
      where: { organizationId: tenant.organizationId, status: { not: "ARCHIVED" } },
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: { product: { select: { name: true } } },
    });
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      hashtags: row.hashtags,
      tone: row.tone,
      status: row.status,
      productId: row.productId,
      product: row.product?.name ?? null,
      updatedAt: row.updatedAt,
    }));
  }

  async archiveAd(tenant: Tenant, id: string) {
    assertMinRole(tenant.role, "EDITOR");
    const current = await this.db.advertisement.findFirst({ where: { id, organizationId: tenant.organizationId } });
    if (!current) throw new AppError("NOT_FOUND", "Anúncio não encontrado.", 404);
    await this.db.advertisement.update({ where: { id: current.id }, data: { status: "ARCHIVED" } });
    await audit(this.db, { organizationId: tenant.organizationId, actorUserId: tenant.userId, action: "ad.archived", entityType: "Advertisement", entityId: id });
    return { ok: true };
  }

  async artwork(tenant: Tenant, input: { productId: string; template: "story" | "feed" | "portrait"; title: string; priceLabel?: string }) {
    assertMinRole(tenant.role, "EDITOR");
    const product = await this.db.product.findFirst({ where: { id: input.productId, organizationId: tenant.organizationId }, include: { images: { orderBy: { position: "asc" }, take: 1, include: { mediaAsset: true } }, store: true } });
    const image = product?.images[0]?.mediaAsset;
    if (!product || !image) throw new AppError("NOT_FOUND", "Escolha um produto com foto.", 404);
    const source = await this.storage.getObject("private", image.objectKey);
    const buffer = await composeArtwork({ image: source, template: input.template, title: input.title, priceLabel: input.priceLabel ?? "", storeName: product.store.name, color: product.store.primaryColor });
    const key = `org/${tenant.organizationId}/art/${createHash("sha1").update(buffer).digest("hex").slice(0, 16)}.jpg`;
    await this.storage.putObject("private", key, buffer, "image/jpeg");
    const asset = await this.db.mediaAsset.create({
      data: { organizationId: tenant.organizationId, ownerUserId: tenant.userId, kind: "IMAGE", status: "READY", bucket: "private", objectKey: key, mimeType: "image/jpeg", sizeBytes: buffer.byteLength },
    });
    const art = await this.db.artwork.create({ data: { organizationId: tenant.organizationId, productId: product.id, template: input.template, title: input.title, mediaAssetId: asset.id } });
    await this.catalog.publishAsset(asset.id);
    await audit(this.db, { organizationId: tenant.organizationId, actorUserId: tenant.userId, action: "artwork.created", entityType: "Artwork", entityId: art.id });
    return { id: art.id, url: `/api/media/${asset.id}` };
  }

  async history(tenant: Tenant) {
    const [generations, wallets] = await Promise.all([
      this.db.aiGeneration.findMany({ where: { organizationId: tenant.organizationId }, orderBy: { createdAt: "desc" }, take: 40 }),
      this.db.creditWallet.findMany({ where: { organizationId: tenant.organizationId } }),
    ]);
    return {
      generations: generations.map((item) => ({ id: item.id, kind: item.kind, provider: item.provider, model: item.model, status: item.status, estimatedCostCents: item.estimatedCostCents, latencyMs: item.latencyMs, createdAt: item.createdAt })),
      wallets: wallets.map((wallet) => ({ kind: wallet.kind, balance: wallet.balance })),
    };
  }

  private async presentAd(id: string, organizationId: string) {
    const ad = await this.db.advertisement.findFirst({ where: { id, organizationId }, include: { versions: { orderBy: { createdAt: "desc" }, take: 8 } } });
    if (!ad) throw new AppError("NOT_FOUND", "Anúncio não encontrado.", 404);
    return ad;
  }

  private async ownedImage(organizationId: string, assetId: string) {
    const asset = await this.db.mediaAsset.findFirst({ where: { id: assetId, organizationId, kind: "IMAGE", status: "READY" } });
    if (!asset) throw new AppError("NOT_FOUND", "Imagem não encontrada nesta loja.", 404);
    return asset;
  }

  private async guardHourly(organizationId: string) {
    const limits = await this.tenants.limits(organizationId);
    const count = await this.db.aiGeneration.count({ where: { organizationId, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } } });
    if (count >= limits.aiPerHour) throw new AppError("RATE_LIMITED", "O limite de gerações desta hora foi atingido.", 429);
  }

  private async record(tenant: Tenant, kind: "IMAGE_ANALYSIS" | "TEXT" | "TTS" | "VIDEO" | "ARTWORK", usage: { provider: string; model: string; inputTokens: number; outputTokens: number; units: number; latencyMs: number; estimatedCostCents: number }, metadata: Prisma.InputJsonValue) {
    return this.db.aiGeneration.create({
      data: { organizationId: tenant.organizationId, userId: tenant.userId, kind, status: "SUCCEEDED", metadata, ...usage },
    });
  }

  private async recordFailure(tenant: Tenant, kind: "IMAGE_ANALYSIS" | "TEXT" | "TTS" | "VIDEO", provider: string, error: unknown) {
    await this.db.aiGeneration.create({
      data: { organizationId: tenant.organizationId, userId: tenant.userId, kind, provider, model: "unknown", status: "FAILED", errorCode: error instanceof Error ? error.name : "ERROR" },
    });
  }
}
