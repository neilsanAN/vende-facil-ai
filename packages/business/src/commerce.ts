import type { OrderOrigin, OrderStatus, PaymentStatus, PrismaClient } from "@prisma/client";
import { AppError } from "./errors";
import { whatsAppLink } from "./ledger";
import { assertMinRole } from "./permissions";
import { audit, type Tenant } from "./tenant";

export class CommerceService {
  constructor(private db: PrismaClient) {}

  async listOrders(tenant: Tenant, status?: OrderStatus) {
    assertMinRole(tenant.role, "VIEWER");
    return this.db.order.findMany({
      where: { organizationId: tenant.organizationId, ...(status ? { status } : {}) },
      include: { customer: true, items: true },
      orderBy: { createdAt: "desc" },
      take: 80,
    });
  }

  async getOrder(tenant: Tenant, id: string) {
    const order = await this.db.order.findFirst({ where: { id, organizationId: tenant.organizationId }, include: { customer: true, items: true, events: { orderBy: { createdAt: "asc" } } } });
    if (!order) throw new AppError("NOT_FOUND", "Pedido não encontrado.", 404);
    return order;
  }

  async updateOrder(tenant: Tenant, id: string, input: { status: OrderStatus; notes?: string; paymentStatus?: PaymentStatus }) {
    assertMinRole(tenant.role, "EDITOR");
    const order = await this.getOrder(tenant, id);
    await this.db.order.update({ where: { id: order.id }, data: { status: input.status, paymentStatus: input.paymentStatus, notes: input.notes ?? order.notes } });
    await this.db.orderEvent.create({ data: { orderId: order.id, status: input.status, note: input.notes || "" } });
    await audit(this.db, { organizationId: tenant.organizationId, actorUserId: tenant.userId, action: "order.updated", entityType: "Order", entityId: order.id });
    return this.getOrder(tenant, id);
  }

  async manualOrder(tenant: Tenant, input: { name: string; phone?: string; email?: string; notes?: string; origin?: OrderOrigin; items: Array<{ productId?: string | null; name: string; quantity: number; unitPriceCents: number }> }) {
    assertMinRole(tenant.role, "EDITOR");
    const store = await this.db.store.findUnique({ where: { organizationId: tenant.organizationId } });
    if (!store) throw new AppError("NOT_FOUND", "Loja não encontrada.", 404);
    return this.createOrder({ organizationId: tenant.organizationId, storeId: store.id, origin: input.origin ?? "MANUAL", notes: input.notes ?? "", customer: input, items: input.items, actorUserId: tenant.userId });
  }

  async publicOrder(slug: string, input: { productId: string; quantity?: number; name: string; phone: string; email?: string; notes?: string }) {
    const store = await this.db.store.findFirst({ where: { slug, published: true }, include: { settings: true } });
    if (!store?.settings?.allowOrders) throw new AppError("UNAVAILABLE", "Esta loja não está recebendo pedidos.", 404);
    const product = await this.db.product.findFirst({ where: { id: input.productId, storeId: store.id, published: true, status: "ACTIVE" } });
    if (!product) throw new AppError("NOT_FOUND", "Produto indisponível.", 404);
    const quantity = input.quantity ?? 1;
    if (product.trackStock && (product.stockQuantity ?? 0) < quantity) throw new AppError("OUT_OF_STOCK", "Quantidade indisponível.", 409);
    const unit = product.promoPriceCents ?? product.priceCents;
    const order = await this.createOrder({
      organizationId: store.organizationId,
      storeId: store.id,
      origin: "STORE",
      notes: input.notes ?? "",
      customer: input,
      items: [{ productId: product.id, name: product.name, quantity, unitPriceCents: unit }],
    });
    if (product.trackStock) {
      await this.db.product.update({ where: { id: product.id }, data: { stockQuantity: { decrement: quantity } } });
    }
    return { id: order.id };
  }

  async publicContact(slug: string, input: { name: string; phone?: string; email?: string; message: string }) {
    const store = await this.db.store.findFirst({ where: { slug, published: true } });
    if (!store) throw new AppError("NOT_FOUND", "Loja não encontrada.", 404);
    const customer = await this.customer(store.organizationId, input);
    await this.db.contactInquiry.create({ data: { organizationId: store.organizationId, customerId: customer.id, name: input.name, phone: input.phone || null, email: input.email || null, message: input.message } });
    await this.db.notification.create({ data: { organizationId: store.organizationId, title: "Novo contato", body: `${input.name} enviou uma mensagem.`, href: "/contatos" } });
  }

  async contacts(tenant: Tenant) {
    return this.db.contactInquiry.findMany({ where: { organizationId: tenant.organizationId }, orderBy: { createdAt: "desc" }, take: 80 });
  }

  async markContact(tenant: Tenant, id: string, status: "NEW" | "READ" | "ARCHIVED") {
    assertMinRole(tenant.role, "EDITOR");
    const row = await this.db.contactInquiry.findFirst({ where: { id, organizationId: tenant.organizationId } });
    if (!row) throw new AppError("NOT_FOUND", "Contato não encontrado.", 404);
    await this.db.contactInquiry.update({ where: { id }, data: { status } });
  }

  async stats(tenant: Tenant, days: number) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const org = tenant.organizationId;
    const [views, productViews, whatsapp, orders, sales, ads, videos, products] = await Promise.all([
      this.db.storeView.count({ where: { organizationId: org, createdAt: { gte: since } } }),
      this.db.productView.count({ where: { organizationId: org, createdAt: { gte: since } } }),
      this.db.linkClick.count({ where: { organizationId: org, kind: "WHATSAPP", createdAt: { gte: since } } }),
      this.db.order.count({ where: { organizationId: org, createdAt: { gte: since } } }),
      this.db.order.aggregate({ where: { organizationId: org, status: { in: ["CONFIRMED", "PREPARING", "COMPLETED"] }, createdAt: { gte: since } }, _sum: { totalCents: true } }),
      this.db.advertisement.count({ where: { organizationId: org, status: "PUBLISHED" } }),
      this.db.videoRender.count({ where: { organizationId: org, status: "COMPLETED", createdAt: { gte: since } } }),
      this.db.product.count({ where: { organizationId: org, status: { not: "ARCHIVED" } } }),
    ]);
    const series = await this.daily(org, since, days);
    const top = await this.db.productView.groupBy({ by: ["productId"], where: { organizationId: org, createdAt: { gte: since } }, _count: { productId: true }, orderBy: { _count: { productId: "desc" } }, take: 5 });
    const names = await this.db.product.findMany({ where: { id: { in: top.map((item) => item.productId) } }, select: { id: true, name: true, priceCents: true } });
    return {
      rangeDays: days,
      products,
      publishedAds: ads,
      videos,
      views,
      productViews,
      whatsappClicks: whatsapp,
      orders,
      salesCents: sales._sum.totalCents ?? 0,
      series,
      top: top.map((item) => ({ product: names.find((name) => name.id === item.productId) ?? null, views: item._count.productId })),
      note: "Visualizações contam um acesso a cada 30 minutos por navegador. Cliques no WhatsApp não são pedidos. Vendas somam apenas pedidos confirmados na plataforma.",
    };
  }

  async dashboard(tenant: Tenant) {
    const stats = await this.stats(tenant, 7);
    const recent = await this.db.product.findMany({
      where: { organizationId: tenant.organizationId, status: { not: "ARCHIVED" } },
      orderBy: { updatedAt: "desc" },
      take: 4,
      include: { images: { orderBy: { position: "asc" }, take: 1 } },
    });
    const activity = await this.db.auditLog.findMany({ where: { organizationId: tenant.organizationId }, orderBy: { createdAt: "desc" }, take: 8 });
    return { stats, recent, activity, greeting: greeting(tenant.name) };
  }

  async track(input: { slug: string; type: "store_view" | "product_view" | "click"; productSlug?: string; kind?: "WHATSAPP" | "CATALOG" | "PRODUCT" | "SHARE"; visitorHash: string }) {
    const store = await this.db.store.findFirst({ where: { slug: input.slug, published: true } });
    if (!store) return;
    const since = new Date(Date.now() - 30 * 60 * 1000);
    if (input.type === "store_view") {
      const exists = await this.db.storeView.findFirst({ where: { storeId: store.id, visitorHash: input.visitorHash, createdAt: { gte: since } } });
      if (!exists) await this.db.storeView.create({ data: { organizationId: store.organizationId, storeId: store.id, visitorHash: input.visitorHash } });
      return;
    }
    const product = input.productSlug ? await this.db.product.findFirst({ where: { storeId: store.id, slug: input.productSlug, published: true } }) : null;
    if (input.type === "product_view" && product) {
      const exists = await this.db.productView.findFirst({ where: { productId: product.id, visitorHash: input.visitorHash, createdAt: { gte: since } } });
      if (!exists) await this.db.productView.create({ data: { organizationId: store.organizationId, productId: product.id, visitorHash: input.visitorHash } });
      return;
    }
    if (input.type === "click") {
      await this.db.linkClick.create({ data: { organizationId: store.organizationId, storeId: store.id, productId: product?.id, kind: input.kind || "SHARE", visitorHash: input.visitorHash } });
    }
  }

  async publicStore(slug: string) {
    const store = await this.db.store.findFirst({ where: { slug, published: true }, include: { settings: true, organization: true } });
    if (!store) return null;
    const [categories, products] = await Promise.all([
      this.db.category.findMany({ where: { organizationId: store.organizationId }, orderBy: { name: "asc" } }),
      this.db.product.findMany({
        where: { storeId: store.id, published: true, status: "ACTIVE" },
        orderBy: { updatedAt: "desc" },
        include: { category: true, images: { orderBy: { position: "asc" }, take: 1 } },
      }),
    ]);
    return {
      store: {
        name: store.name,
        slug: store.slug,
        description: store.description,
        whatsapp: store.whatsapp,
        color: store.primaryColor,
        logoUrl: store.logoAssetId ? `/api/media/${store.logoAssetId}` : null,
        address: store.settings?.address ?? "",
        showPrices: store.settings?.showPrices ?? true,
        allowOrders: store.settings?.allowOrders ?? true,
        seoTitle: store.settings?.seoTitle || store.name,
        seoDescription: store.settings?.seoDescription || store.description,
        whatsappUrl: store.whatsapp ? whatsAppLink(store.whatsapp, `Olá! Vim da vitrine ${store.name}.`) : null,
      },
      categories,
      products: products.map((product) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        priceCents: product.priceCents,
        promoPriceCents: product.promoPriceCents,
        category: product.category?.name ?? null,
        imageUrl: product.images[0] ? `/api/media/${product.images[0].mediaAssetId}` : null,
        available: !product.trackStock || (product.stockQuantity ?? 0) > 0,
      })),
    };
  }

  async publicProduct(slug: string, productSlug: string) {
    const payload = await this.publicStore(slug);
    if (!payload) return null;
    const product = await this.db.product.findFirst({
      where: { slug: productSlug, store: { slug, published: true }, published: true, status: "ACTIVE" },
      include: { images: { orderBy: { position: "asc" } }, variants: { orderBy: { position: "asc" } }, category: true },
    });
    if (!product) return null;
    return { store: payload.store, product: { ...product, images: product.images.map((image) => ({ url: `/api/media/${image.mediaAssetId}`, alt: image.alt })) } };
  }

  private async createOrder(input: { organizationId: string; storeId: string; origin: OrderOrigin; notes: string; customer: { name: string; phone?: string; email?: string }; items: Array<{ productId?: string | null; name: string; quantity: number; unitPriceCents: number }>; actorUserId?: string }) {
    const customer = await this.customer(input.organizationId, input.customer);
    const totalCents = input.items.reduce((sum, item) => sum + item.quantity * item.unitPriceCents, 0);
    const order = await this.db.order.create({
      data: {
        organizationId: input.organizationId,
        storeId: input.storeId,
        customerId: customer.id,
        origin: input.origin,
        totalCents,
        notes: input.notes,
        items: { create: input.items.map((item) => ({ productId: item.productId ?? null, name: item.name, quantity: item.quantity, unitPriceCents: item.unitPriceCents })) },
        events: { create: { status: "NEW", note: "Pedido registrado." } },
      },
    });
    await this.db.notification.create({ data: { organizationId: input.organizationId, title: "Novo pedido", body: `${input.customer.name} · ${(totalCents / 100).toFixed(2)}`, href: `/pedidos/${order.id}` } });
    await audit(this.db, { organizationId: input.organizationId, actorUserId: input.actorUserId, action: "order.created", entityType: "Order", entityId: order.id, metadata: { origin: input.origin } });
    return order;
  }

  private async customer(organizationId: string, input: { name: string; phone?: string; email?: string }) {
    const phone = input.phone || null;
    const email = input.email || null;
    const existing = phone || email
      ? await this.db.customer.findFirst({
          where: { organizationId, OR: [...(phone ? [{ phone }] : []), ...(email ? [{ email }] : [])] },
        })
      : null;
    if (existing) return this.db.customer.update({ where: { id: existing.id }, data: { name: input.name, phone, email } });
    return this.db.customer.create({ data: { organizationId, name: input.name, phone, email } });
  }

  private async daily(organizationId: string, since: Date, days: number) {
    const rows = await this.db.storeView.findMany({ where: { organizationId, createdAt: { gte: since } }, select: { createdAt: true } });
    const buckets = new Map<string, number>();
    for (let index = days - 1; index >= 0; index -= 1) {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - index);
      buckets.set(day.toISOString().slice(0, 10), 0);
    }
    for (const row of rows) {
      const key = row.createdAt.toISOString().slice(0, 10);
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) || 0) + 1);
    }
    return [...buckets.entries()].map(([day, views]) => ({ day, views }));
  }
}

function greeting(name: string) {
  const hour = new Date().getHours();
  const first = name.split(" ")[0] || name;
  const hello = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  return { hello, name: first, subtitle: "Pronto para vender hoje?" };
}
