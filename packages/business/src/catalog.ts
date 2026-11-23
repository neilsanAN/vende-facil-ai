import type { Prisma, PrismaClient, ProductStatus } from "@prisma/client";
import { derivativeImage, extensionForMime, type StorageService } from "@vendefacil/media";
import { AppError } from "./errors";
import { assertMinRole } from "./permissions";
import { slugify, uniqueSlug } from "./ledger";
import { audit, type Tenant, type TenantService } from "./tenant";

const productInclude = {
  category: true,
  variants: { orderBy: { position: "asc" as const } },
  images: { orderBy: { position: "asc" as const }, include: { mediaAsset: true } },
} satisfies Prisma.ProductInclude;

export class CatalogService {
  constructor(
    private db: PrismaClient,
    private storage: StorageService,
    private tenants: TenantService,
  ) {}

  async categories(tenant: Tenant) {
    return this.db.category.findMany({ where: { organizationId: tenant.organizationId }, orderBy: { name: "asc" } });
  }

  async createCategory(tenant: Tenant, name: string) {
    assertMinRole(tenant.role, "EDITOR");
    const slug = await uniqueSlug(`${name}`, async (value) =>
      Boolean(await this.db.category.findUnique({ where: { organizationId_slug: { organizationId: tenant.organizationId, slug: value } } })),
    );
    return this.db.category.create({ data: { organizationId: tenant.organizationId, name, slug } });
  }

  async list(tenant: Tenant, query: { q: string; status?: ProductStatus; categoryId?: string; published?: "true" | "false"; sort: string; page: number; pageSize: number }) {
    const where: Prisma.ProductWhereInput = {
      organizationId: tenant.organizationId,
      ...(query.status ? { status: query.status } : { status: { not: "ARCHIVED" } }),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.published ? { published: query.published === "true" } : {}),
      ...(query.q
        ? { OR: [{ name: { contains: query.q, mode: "insensitive" } }, { sku: { contains: query.q, mode: "insensitive" } }, { description: { contains: query.q, mode: "insensitive" } }] }
        : {}),
    };
    const orderBy: Prisma.ProductOrderByWithRelationInput =
      query.sort === "price_asc" ? { priceCents: "asc" } : query.sort === "price_desc" ? { priceCents: "desc" } : query.sort === "name" ? { name: "asc" } : { updatedAt: "desc" };
    const [total, rows] = await Promise.all([
      this.db.product.count({ where }),
      this.db.product.findMany({ where, orderBy, skip: (query.page - 1) * query.pageSize, take: query.pageSize, include: productInclude }),
    ]);
    return { data: rows.map((row) => this.present(row)), meta: { page: query.page, pageSize: query.pageSize, total } };
  }

  async get(tenant: Tenant, id: string) {
    const row = await this.db.product.findFirst({ where: { id, organizationId: tenant.organizationId }, include: productInclude });
    if (!row) throw new AppError("NOT_FOUND", "Produto não encontrado.", 404);
    return this.present(row);
  }

  async create(tenant: Tenant, input: ProductInput) {
    assertMinRole(tenant.role, "EDITOR");
    const limits = await this.tenants.limits(tenant.organizationId);
    if (limits.products >= 0) {
      const count = await this.db.product.count({ where: { organizationId: tenant.organizationId, status: { not: "ARCHIVED" } } });
      if (count >= limits.products) throw new AppError("PLAN_LIMIT", "Seu plano atingiu o limite de produtos.", 402);
    }
    const store = await this.store(tenant.organizationId);
    if (input.categoryId) await this.ensureCategory(tenant.organizationId, input.categoryId);
    const slug = await uniqueSlug(input.name, async (value) => Boolean(await this.db.product.findUnique({ where: { storeId_slug: { storeId: store.id, slug: value } } })));
    const variants = input.variants ?? [];
    const product = await this.db.product.create({
      data: {
        organizationId: tenant.organizationId,
        storeId: store.id,
        ...this.data(input),
        slug,
        variants: { create: variants.map((variant, index) => ({ ...this.variant(variant), organizationId: tenant.organizationId, position: index })) },
      },
      include: productInclude,
    });
    if (product.published) await this.syncPublicImages(product.id);
    await audit(this.db, { organizationId: tenant.organizationId, actorUserId: tenant.userId, action: "product.created", entityType: "Product", entityId: product.id });
    return this.present(product);
  }

  async update(tenant: Tenant, id: string, input: ProductInput) {
    assertMinRole(tenant.role, "EDITOR");
    const current = await this.db.product.findFirst({ where: { id, organizationId: tenant.organizationId } });
    if (!current) throw new AppError("NOT_FOUND", "Produto não encontrado.", 404);
    if (input.categoryId) await this.ensureCategory(tenant.organizationId, input.categoryId);
    await this.db.$transaction([
      this.db.productVariant.deleteMany({ where: { productId: id, organizationId: tenant.organizationId } }),
      this.db.product.update({ where: { id }, data: { ...this.data(input), variants: { create: (input.variants ?? []).map((variant, index) => ({ ...this.variant(variant), organizationId: tenant.organizationId, position: index })) } } }),
    ]);
    if (input.published) await this.syncPublicImages(id);
    if (current.published && input.published === false) await this.hideImages(id);
    await audit(this.db, { organizationId: tenant.organizationId, actorUserId: tenant.userId, action: "product.updated", entityType: "Product", entityId: id });
    return this.get(tenant, id);
  }

  async archive(tenant: Tenant, id: string) {
    assertMinRole(tenant.role, "EDITOR");
    const current = await this.db.product.findFirst({ where: { id, organizationId: tenant.organizationId } });
    if (!current) throw new AppError("NOT_FOUND", "Produto não encontrado.", 404);
    await this.db.product.update({ where: { id }, data: { status: "ARCHIVED", published: false } });
    await this.hideImages(id);
    await audit(this.db, { organizationId: tenant.organizationId, actorUserId: tenant.userId, action: "product.archived", entityType: "Product", entityId: id });
  }

  async duplicate(tenant: Tenant, id: string) {
    const current = await this.get(tenant, id);
    return this.create(tenant, {
      name: `${current.name} cópia`.slice(0, 120),
      description: current.description,
      priceCents: current.priceCents,
      promoPriceCents: current.promoPriceCents,
      categoryId: current.categoryId,
      sku: "",
      stockQuantity: current.stockQuantity,
      trackStock: current.trackStock,
      status: "DRAFT",
      published: false,
      variants: current.variants.map((variant) => ({ name: variant.name, sku: variant.sku ?? "", priceCents: variant.priceCents, stockQuantity: variant.stockQuantity })),
    }).then(async (copy) => {
      const images = await this.db.productImage.findMany({ where: { productId: id, organizationId: tenant.organizationId }, orderBy: { position: "asc" } });
      if (images.length) {
        await this.db.productImage.createMany({
          data: images.map((image) => ({ organizationId: tenant.organizationId, productId: copy.id, mediaAssetId: image.mediaAssetId, alt: image.alt, position: image.position })),
        });
      }
      return this.get(tenant, copy.id);
    });
  }

  async addImage(tenant: Tenant, productId: string, assetId: string, alt = "") {
    assertMinRole(tenant.role, "EDITOR");
    const product = await this.db.product.findFirst({ where: { id: productId, organizationId: tenant.organizationId } });
    const asset = await this.db.mediaAsset.findFirst({ where: { id: assetId, organizationId: tenant.organizationId, status: "READY", kind: "IMAGE" } });
    if (!product || !asset) throw new AppError("NOT_FOUND", "Produto ou imagem não encontrado.", 404);
    const position = await this.db.productImage.count({ where: { productId } });
    await this.db.productImage.create({ data: { organizationId: tenant.organizationId, productId, mediaAssetId: assetId, alt, position } });
    if (product.published) await this.publishAsset(asset.id);
    return this.get(tenant, productId);
  }

  async removeImage(tenant: Tenant, productId: string, imageId: string) {
    assertMinRole(tenant.role, "EDITOR");
    const image = await this.db.productImage.findFirst({ where: { id: imageId, productId, organizationId: tenant.organizationId } });
    if (!image) throw new AppError("NOT_FOUND", "Imagem não encontrada.", 404);
    await this.db.productImage.delete({ where: { id: image.id } });
    await this.maybeUnpublish(image.mediaAssetId);
  }

  private data(input: ProductInput) {
    const trackStock = input.trackStock ?? false;
    const published = input.published ?? false;
    return {
      name: input.name,
      description: input.description ?? "",
      priceCents: input.priceCents,
      promoPriceCents: input.promoPriceCents ?? null,
      categoryId: input.categoryId ?? null,
      sku: input.sku || null,
      stockQuantity: trackStock ? input.stockQuantity ?? 0 : input.stockQuantity ?? null,
      trackStock,
      status: published ? "ACTIVE" : input.status ?? "DRAFT",
      published,
    };
  }

  private variant(input: NonNullable<ProductInput["variants"]>[number]) {
    return { name: input.name, sku: input.sku || null, priceCents: input.priceCents ?? null, stockQuantity: input.stockQuantity ?? null };
  }

  private async store(organizationId: string) {
    const store = await this.db.store.findUnique({ where: { organizationId } });
    if (!store) throw new AppError("NOT_FOUND", "Loja não encontrada.", 404);
    return store;
  }

  private async ensureCategory(organizationId: string, categoryId: string) {
    const category = await this.db.category.findFirst({ where: { id: categoryId, organizationId } });
    if (!category) throw new AppError("NOT_FOUND", "Categoria não encontrada.", 404);
  }

  private present(row: Prisma.ProductGetPayload<{ include: typeof productInclude }>) {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      priceCents: row.priceCents,
      promoPriceCents: row.promoPriceCents,
      categoryId: row.categoryId,
      category: row.category ? { id: row.category.id, name: row.category.name } : null,
      sku: row.sku,
      stockQuantity: row.stockQuantity,
      trackStock: row.trackStock,
      status: row.status,
      published: row.published,
      updatedAt: row.updatedAt,
      variants: row.variants.map((variant) => ({ id: variant.id, name: variant.name, sku: variant.sku, priceCents: variant.priceCents, stockQuantity: variant.stockQuantity })),
      images: row.images.map((image) => ({ id: image.id, assetId: image.mediaAssetId, alt: image.alt, url: `/api/media/${image.mediaAssetId}` })),
    };
  }

  private async syncPublicImages(productId: string) {
    const images = await this.db.productImage.findMany({ where: { productId } });
    for (const image of images) await this.publishAsset(image.mediaAssetId);
  }

  async publishAsset(assetId: string) {
    const asset = await this.db.mediaAsset.findUnique({ where: { id: assetId } });
    if (!asset || asset.kind !== "IMAGE" || asset.status !== "READY") return;
    if (asset.publicObjectKey) {
      await this.db.mediaAsset.update({ where: { id: asset.id }, data: { visibility: "PUBLIC" } });
      return;
    }
    const original = await this.storage.getObject("private", asset.objectKey);
    const derivative = await derivativeImage(original);
    const key = `org/${asset.organizationId}/public/${asset.id}.${extensionForMime(derivative.mimeType)}`;
    await this.storage.putObject("public", key, derivative.buffer, derivative.mimeType);
    await this.db.mediaAsset.update({ where: { id: asset.id }, data: { publicObjectKey: key, visibility: "PUBLIC" } });
  }

  private async hideImages(productId: string) {
    const images = await this.db.productImage.findMany({ where: { productId } });
    for (const image of images) await this.maybeUnpublish(image.mediaAssetId);
  }

  private async maybeUnpublish(assetId: string) {
    const still = await this.db.productImage.count({ where: { mediaAssetId: assetId, product: { published: true } } });
    const logo = await this.db.store.count({ where: { logoAssetId: assetId, published: true } });
    if (still || logo) return;
    const asset = await this.db.mediaAsset.findUnique({ where: { id: assetId } });
    if (asset?.publicObjectKey) await this.storage.deleteObject("public", asset.publicObjectKey).catch(() => undefined);
    if (asset) await this.db.mediaAsset.update({ where: { id: asset.id }, data: { publicObjectKey: null, visibility: "PRIVATE" } });
  }
}

type ProductInput = {
  name: string;
  description?: string;
  priceCents: number;
  promoPriceCents?: number | null;
  categoryId?: string | null;
  sku?: string;
  stockQuantity?: number | null;
  trackStock?: boolean;
  status?: ProductStatus;
  published?: boolean;
  variants?: Array<{ name: string; sku?: string; priceCents?: number | null; stockQuantity?: number | null }>;
};
