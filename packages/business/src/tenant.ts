import type { Prisma, PrismaClient } from "@prisma/client";
import type { PlanLimits } from "@vendefacil/types";
import { AppError } from "./errors";
import { allowanceFor, parseLimits, slugify, uniqueSlug, assertPublicSlug } from "./ledger";
import { assertMinRole } from "./permissions";
import { PLAN_CATALOG, DEFAULT_CATEGORIES } from "./plans";
import type { SessionContext } from "./auth";

export type Tenant = SessionContext & { organizationId: string; role: NonNullable<SessionContext["role"]> };

export function requireTenant(session: SessionContext | null): Tenant {
  if (!session) throw new AppError("UNAUTHENTICATED", "Entre para continuar.", 401);
  if (!session.emailVerified) throw new AppError("EMAIL_UNVERIFIED", "Confirme seu e-mail para continuar.", 403);
  if (!session.organizationId || !session.role) throw new AppError("ONBOARDING_REQUIRED", "Configure seu canal de divulgação para continuar.", 409);
  return { ...session, organizationId: session.organizationId, role: session.role };
}

async function audit(
  db: PrismaClient | Prisma.TransactionClient,
  input: { organizationId?: string | null; actorUserId?: string | null; action: string; entityType: string; entityId?: string | null; metadata?: Prisma.InputJsonValue; ip?: string | null },
) {
  await db.auditLog.create({
    data: {
      organizationId: input.organizationId ?? null,
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: input.metadata,
      ip: input.ip ?? null,
    },
  });
}

export class TenantService {
  constructor(private db: PrismaClient) {}

  async limits(organizationId: string): Promise<PlanLimits> {
    const subscription = await this.db.subscription.findUnique({ where: { organizationId }, include: { plan: true } });
    if (!subscription || subscription.status === "PAST_DUE" || subscription.status === "CANCELED") {
      const free = await this.db.plan.findUnique({ where: { code: "free" } });
      return parseLimits(free?.limits ?? PLAN_CATALOG[0]?.limits);
    }
    return parseLimits(subscription.plan.limits);
  }

  async ensurePlans() {
    for (const plan of PLAN_CATALOG) {
      await this.db.plan.upsert({
        where: { code: plan.code },
        create: plan,
        update: {
          name: plan.name,
          description: plan.description,
          priceCents: plan.priceCents,
          limits: plan.limits,
          position: plan.position,
        },
      });
    }
  }

  async onboard(session: SessionContext, input: { storeName: string; description?: string; whatsapp?: string }, ip?: string) {
    if (!session.emailVerified) throw new AppError("EMAIL_UNVERIFIED", "Confirme seu e-mail antes de criar o perfil.", 403);
    if (session.organizationId) throw new AppError("CONFLICT", "Seu perfil de divulgação já está configurado.", 409);
    await this.ensurePlans();
    const free = await this.db.plan.findUnique({ where: { code: "free" } });
    if (!free) throw new AppError("PLAN_INVALID", "Não foi possível preparar o plano gratuito. Tente de novo em instantes.", 500);
    const limits = parseLimits(free.limits);
    const orgSlug = await uniqueSlug(input.storeName, async (slug) => Boolean(await this.db.organization.findUnique({ where: { slug } })));
    const storeSlug = await uniqueSlug(input.storeName, async (slug) => Boolean(await this.db.store.findUnique({ where: { slug } })));
    assertPublicSlug(storeSlug);
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    const organization = await this.db.$transaction(async (tx) => {
      const org = await tx.organization.create({ data: { name: input.storeName, slug: orgSlug } });
      await tx.organizationMember.create({ data: { organizationId: org.id, userId: session.userId, role: "OWNER" } });
      const store = await tx.store.create({
        data: {
          organizationId: org.id,
          name: input.storeName,
          slug: storeSlug,
          description: input.description ?? "",
          whatsapp: input.whatsapp || null,
        },
      });
      await tx.storeSettings.create({ data: { storeId: store.id, seoTitle: input.storeName, seoDescription: (input.description ?? "").slice(0, 180) } });
      for (const name of DEFAULT_CATEGORIES) {
        await tx.category.create({ data: { organizationId: org.id, name, slug: slugify(name) } });
      }
      await tx.subscription.create({
        data: { organizationId: org.id, planId: free.id, status: "ACTIVE", currentPeriodStart: now, currentPeriodEnd: periodEnd, provider: "free" },
      });
      for (const kind of ["ANNOUNCEMENT", "NARRATION", "RENDER", "GENERATIVE_VIDEO"] as const) {
        const balance = allowanceFor(limits, kind);
        const wallet = await tx.creditWallet.create({ data: { organizationId: org.id, kind, balance } });
        if (balance > 0) {
          await tx.creditTransaction.create({
            data: {
              organizationId: org.id,
              walletId: wallet.id,
              amount: balance,
              balanceAfter: balance,
              reason: "included_grant",
              idempotencyKey: `grant:${org.id}:${kind}:${now.toISOString()}`,
            },
          });
        }
      }
      await tx.user.update({ where: { id: session.userId }, data: { activeOrganizationId: org.id } });
      await audit(tx, { organizationId: org.id, actorUserId: session.userId, action: "store.created", entityType: "Store", entityId: store.id, ip });
      return org;
    });
    return { organizationId: organization.id, storeName: input.storeName };
  }

  async shell(tenant: Tenant) {
    const [store, unread, subscription] = await Promise.all([
      this.db.store.findUnique({ where: { organizationId: tenant.organizationId } }),
      this.db.notification.count({ where: { organizationId: tenant.organizationId, readAt: null } }),
      this.db.subscription.findUnique({ where: { organizationId: tenant.organizationId }, include: { plan: true } }),
    ]);
    return {
      user: { name: tenant.name, email: tenant.email, role: tenant.role },
      store: store ? { name: store.name, slug: store.slug, published: store.published } : null,
      unread,
      plan: subscription?.plan.code ?? "free",
    };
  }

  async updateStore(tenant: Tenant, input: {
    name: string;
    description?: string;
    whatsapp?: string;
    primaryColor?: string;
    published?: boolean;
    seoTitle?: string;
    seoDescription?: string;
    contactEmail?: string;
    address?: string;
    showPrices?: boolean;
    allowOrders?: boolean;
  }) {
    assertMinRole(tenant.role, "ADMIN");
    const store = await this.db.store.findUnique({ where: { organizationId: tenant.organizationId } });
    if (!store) throw new AppError("NOT_FOUND", "Loja não encontrada.", 404);
    await this.db.store.update({
      where: { id: store.id },
      data: {
        name: input.name,
        description: input.description ?? "",
        whatsapp: input.whatsapp || null,
        primaryColor: input.primaryColor,
        published: input.published,
      },
    });
    await this.db.storeSettings.update({
      where: { storeId: store.id },
      data: {
        seoTitle: input.seoTitle ?? "",
        seoDescription: input.seoDescription ?? "",
        contactEmail: input.contactEmail || null,
        address: input.address ?? "",
        showPrices: input.showPrices,
        allowOrders: input.allowOrders,
      },
    });
    await audit(this.db, { organizationId: tenant.organizationId, actorUserId: tenant.userId, action: "store.updated", entityType: "Store", entityId: store.id });
    return { id: store.id, slug: store.slug };
  }

  async setLogo(tenant: Tenant, assetId: string) {
    assertMinRole(tenant.role, "ADMIN");
    const asset = await this.db.mediaAsset.findFirst({ where: { id: assetId, organizationId: tenant.organizationId, status: "READY", kind: "IMAGE" } });
    if (!asset) throw new AppError("NOT_FOUND", "Imagem não encontrada.", 404);
    await this.db.store.update({ where: { organizationId: tenant.organizationId }, data: { logoAssetId: asset.id } });
  }

  async team(tenant: Tenant) {
    const members = await this.db.organizationMember.findMany({
      where: { organizationId: tenant.organizationId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    });
    const invites = await this.db.organizationInvite.findMany({
      where: { organizationId: tenant.organizationId, acceptedAt: null, expiresAt: { gt: new Date() } },
    });
    return {
      members: members.map((member) => ({ id: member.id, role: member.role, name: member.user.name, email: member.user.email, userId: member.user.id })),
      invites: invites.map((invite) => ({ id: invite.id, email: invite.email, role: invite.role, expiresAt: invite.expiresAt })),
    };
  }

  async invite(tenant: Tenant, input: { email: string; role: "ADMIN" | "EDITOR" | "VIEWER" }) {
    assertMinRole(tenant.role, "ADMIN");
    const limits = await this.limits(tenant.organizationId);
    const count = await this.db.organizationMember.count({ where: { organizationId: tenant.organizationId } });
    if (count >= limits.members) throw new AppError("PLAN_LIMIT", "Seu plano atingiu o limite de usuários.", 402);
    const raw = (await import("./ledger")).newToken();
    const { hashToken } = await import("./ledger");
    await this.db.organizationInvite.create({
      data: {
        organizationId: tenant.organizationId,
        email: input.email,
        role: input.role,
        tokenHash: hashToken(raw),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    await audit(this.db, { organizationId: tenant.organizationId, actorUserId: tenant.userId, action: "team.invited", entityType: "OrganizationInvite", metadata: { email: input.email, role: input.role } });
    return { token: raw };
  }

  async acceptInvite(session: SessionContext, token: string) {
    const { hashToken } = await import("./ledger");
    const invite = await this.db.organizationInvite.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) throw new AppError("TOKEN_INVALID", "Convite inválido ou expirado.", 400);
    if (invite.email !== session.email) throw new AppError("FORBIDDEN", "Este convite foi enviado para outro e-mail.", 403);
    await this.db.$transaction([
      this.db.organizationMember.upsert({
        where: { organizationId_userId: { organizationId: invite.organizationId, userId: session.userId } },
        create: { organizationId: invite.organizationId, userId: session.userId, role: invite.role },
        update: { role: invite.role },
      }),
      this.db.organizationInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } }),
      this.db.user.update({ where: { id: session.userId }, data: { activeOrganizationId: invite.organizationId } }),
    ]);
  }

  async updateMember(tenant: Tenant, memberId: string, role: "ADMIN" | "EDITOR" | "VIEWER") {
    assertMinRole(tenant.role, "OWNER");
    const member = await this.db.organizationMember.findFirst({ where: { id: memberId, organizationId: tenant.organizationId } });
    if (!member) throw new AppError("NOT_FOUND", "Membro não encontrado.", 404);
    if (member.role === "OWNER") throw new AppError("FORBIDDEN", "O proprietário não muda de papel por aqui.", 403);
    await this.db.organizationMember.update({ where: { id: member.id }, data: { role } });
  }

  async removeMember(tenant: Tenant, memberId: string) {
    assertMinRole(tenant.role, "ADMIN");
    const member = await this.db.organizationMember.findFirst({ where: { id: memberId, organizationId: tenant.organizationId } });
    if (!member) throw new AppError("NOT_FOUND", "Membro não encontrado.", 404);
    if (member.role === "OWNER") throw new AppError("FORBIDDEN", "O proprietário não pode ser removido.", 403);
    if (member.userId === tenant.userId) throw new AppError("FORBIDDEN", "Você não pode remover a si mesmo.", 403);
    await this.db.organizationMember.delete({ where: { id: member.id } });
  }
}

export { audit };
