import { randomBytes } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import type { StorageService } from "@vendefacil/media";
import { AppError } from "./errors";
import { hashPassword, verifyPassword } from "./ledger";
import type { SessionContext } from "./auth";
import { audit } from "./tenant";

export class AccountService {
  constructor(private db: PrismaClient, private storage: StorageService) {}

  async updateProfile(session: SessionContext, input: { name: string; phone?: string }) {
    await this.db.user.update({ where: { id: session.userId }, data: { name: input.name, phone: input.phone || null } });
  }

  async notifications(session: SessionContext) {
    if (!session.organizationId) return [];
    return this.db.notification.findMany({ where: { organizationId: session.organizationId }, orderBy: { createdAt: "desc" }, take: 30 });
  }

  async readNotifications(session: SessionContext) {
    if (!session.organizationId) return;
    await this.db.notification.updateMany({ where: { organizationId: session.organizationId, readAt: null }, data: { readAt: new Date() } });
  }

  async createTicket(session: SessionContext, input: { subject: string; message: string }) {
    return this.db.supportTicket.create({
      data: { organizationId: session.organizationId, userId: session.userId, subject: input.subject, messages: { create: { authorId: session.userId, body: input.message } } },
    });
  }

  async tickets(session: SessionContext) {
    return this.db.supportTicket.findMany({ where: { userId: session.userId }, include: { messages: { orderBy: { createdAt: "asc" } } }, orderBy: { updatedAt: "desc" } });
  }

  async exportData(session: SessionContext) {
    const user = await this.db.user.findUnique({ where: { id: session.userId }, select: { id: true, name: true, email: true, phone: true, createdAt: true, termsAcceptedAt: true } });
    if (!session.organizationId) return { user, organization: null };
    const organizationId = session.organizationId;
    const [organization, products, orders, ads, generations] = await Promise.all([
      this.db.organization.findUnique({ where: { id: organizationId }, include: { store: { include: { settings: true } }, subscription: { include: { plan: true } } } }),
      this.db.product.findMany({ where: { organizationId } }),
      this.db.order.findMany({ where: { organizationId }, include: { items: true, customer: true } }),
      this.db.advertisement.findMany({ where: { organizationId } }),
      this.db.aiGeneration.findMany({ where: { organizationId }, select: { id: true, kind: true, provider: true, model: true, status: true, createdAt: true, estimatedCostCents: true } }),
    ]);
    return { user, organization, products, orders, ads, generations, note: "Os arquivos de mídia não são embutidos. Eles podem ser baixados enquanto a conta existir." };
  }

  async deleteAccount(session: SessionContext, input: { email: string; password: string }) {
    const user = await this.db.user.findUnique({ where: { id: session.userId } });
    if (!user || user.email !== input.email || !(await verifyPassword(input.password, user.passwordHash))) {
      throw new AppError("INVALID_CREDENTIALS", "Confirme o e-mail e a senha da conta.", 401);
    }
    const memberships = await this.db.organizationMember.findMany({ where: { userId: user.id } });
    for (const membership of memberships) {
      if (membership.role === "OWNER") {
        const others = await this.db.organizationMember.count({ where: { organizationId: membership.organizationId, userId: { not: user.id } } });
        if (others > 0) throw new AppError("OWNER_REQUIRED", "Transfira a propriedade da loja antes de excluir a conta.", 409);
        await this.db.organization.update({ where: { id: membership.organizationId }, data: { deletedAt: new Date() } });
        await this.db.store.updateMany({ where: { organizationId: membership.organizationId }, data: { published: false } });
        const assets = await this.db.mediaAsset.findMany({ where: { organizationId: membership.organizationId, status: { not: "DELETED" } } });
        for (const asset of assets) {
          await this.storage.deleteObject("private", asset.objectKey).catch(() => undefined);
          if (asset.publicObjectKey) await this.storage.deleteObject("public", asset.publicObjectKey).catch(() => undefined);
        }
        await this.db.mediaAsset.updateMany({ where: { organizationId: membership.organizationId }, data: { status: "DELETED", publicObjectKey: null } });
      } else {
        await this.db.organizationMember.delete({ where: { id: membership.id } });
      }
    }
    await this.db.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
    await this.db.user.update({
      where: { id: user.id },
      data: {
        deletedAt: new Date(),
        email: `excluido+${user.id}@invalid.local`,
        name: "Conta excluída",
        phone: null,
        passwordHash: await hashPassword(randomBytes(24).toString("hex")),
        activeOrganizationId: null,
      },
    });
    await audit(this.db, { actorUserId: user.id, action: "account.deleted", entityType: "User", entityId: user.id });
  }
}
