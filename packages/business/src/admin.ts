import type { Prisma, PrismaClient } from "@prisma/client";
import { AppError } from "./errors";
import { parseLimits } from "./ledger";
import type { SessionContext } from "./auth";

function assertAdmin(session: SessionContext) {
  if (session.platformRole !== "PLATFORM_ADMIN") throw new AppError("FORBIDDEN", "Acesso restrito à administração da plataforma.", 403);
}

export class AdminService {
  constructor(private db: PrismaClient) {}

  async overview(session: SessionContext) {
    assertAdmin(session);
    const [users, stores, jobsFailed, renders, generations] = await Promise.all([
      this.db.user.count({ where: { deletedAt: null } }),
      this.db.store.count(),
      this.db.backgroundJob.count({ where: { status: "DEAD", createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
      this.db.videoRender.groupBy({ by: ["status"], _count: { status: true } }),
      this.db.aiGeneration.aggregate({ where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }, _sum: { estimatedCostCents: true }, _count: true }),
    ]);
    return {
      users,
      stores,
      jobsFailed24h: jobsFailed,
      renders,
      ai: { count: generations._count, estimatedCostCents: generations._sum.estimatedCostCents ?? 0 },
      providers: {
        gemini: Boolean(process.env.GEMINI_API_KEY),
        openai: Boolean(process.env.OPENAI_API_KEY),
        elevenlabs: Boolean(process.env.ELEVENLABS_API_KEY),
        r2: process.env.STORAGE_DRIVER === "r2",
        smtp: Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST || process.env.SMTP_URL),
        mercadopago: Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN),
        generativeVideo: Boolean(process.env.VIDEO_GEN_API_URL && process.env.VIDEO_GEN_API_KEY),
      },
    };
  }

  async users(session: SessionContext) {
    assertAdmin(session);
    return this.db.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, name: true, email: true, platformRole: true, emailVerifiedAt: true, createdAt: true, memberships: { include: { organization: { select: { name: true } } } } },
    });
  }

  async stores(session: SessionContext) {
    assertAdmin(session);
    return this.db.store.findMany({ include: { organization: { include: { subscription: { include: { plan: true } } } } }, orderBy: { createdAt: "desc" }, take: 100 });
  }

  async jobs(session: SessionContext) {
    assertAdmin(session);
    return this.db.backgroundJob.findMany({ orderBy: { createdAt: "desc" }, take: 80 });
  }

  async retryJob(session: SessionContext, id: string) {
    assertAdmin(session);
    const job = await this.db.backgroundJob.findUnique({ where: { id } });
    if (!job?.videoRenderId) throw new AppError("NOT_FOUND", "Job não encontrado.", 404);
    await this.db.backgroundJob.update({ where: { id }, data: { status: "PENDING", runAt: new Date(), lockedAt: null } });
    await this.db.videoRender.update({ where: { id: job.videoRenderId }, data: { status: "RETRYING", resumeStage: "VALIDATING", errorMessage: null } });
  }

  async audit(session: SessionContext) {
    assertAdmin(session);
    return this.db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { actor: { select: { email: true } } } });
  }

  async tickets(session: SessionContext) {
    assertAdmin(session);
    return this.db.supportTicket.findMany({ orderBy: { updatedAt: "desc" }, include: { user: { select: { email: true, name: true } }, messages: { orderBy: { createdAt: "asc" } } }, take: 50 });
  }

  async reply(session: SessionContext, ticketId: string, message: string) {
    assertAdmin(session);
    const ticket = await this.db.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new AppError("NOT_FOUND", "Chamado não encontrado.", 404);
    await this.db.supportMessage.create({ data: { ticketId, authorId: session.userId, body: message, staff: true } });
    await this.db.supportTicket.update({ where: { id: ticketId }, data: { status: "PENDING" } });
  }

  async settings(session: SessionContext) {
    assertAdmin(session);
    const rows = await this.db.platformSetting.findMany();
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  }

  async updateSetting(session: SessionContext, key: string, value: Prisma.InputJsonValue) {
    assertAdmin(session);
    await this.db.platformSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
  }

  async listPlans(session: SessionContext) {
    assertAdmin(session);
    return this.db.plan.findMany({
      orderBy: { position: "asc" },
      include: { prices: { orderBy: { interval: "asc" } } },
    });
  }

  async updatePlan(
    session: SessionContext,
    code: string,
    input: {
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
    },
  ) {
    assertAdmin(session);
    if (input.limits) parseLimits(input.limits);
    const plan = await this.db.plan.update({
      where: { code },
      data: {
        name: input.name,
        description: input.description,
        priceCents: input.priceCents,
        active: input.active,
        limits: input.limits as Prisma.InputJsonValue | undefined,
        features: input.features as Prisma.InputJsonValue | undefined,
        badge: input.badge === undefined ? undefined : input.badge,
        highlighted: input.highlighted,
        icon: input.icon,
        position: input.position,
      },
    });
    if (input.prices) {
      for (const price of input.prices) {
        await this.db.planPrice.upsert({
          where: { planId_interval_currency: { planId: plan.id, interval: price.interval, currency: "BRL" } },
          create: { planId: plan.id, interval: price.interval, priceCents: price.priceCents, currency: "BRL", active: price.active ?? true },
          update: { priceCents: price.priceCents, active: price.active ?? true },
        });
      }
      const monthly = input.prices.find((item) => item.interval === "MONTH");
      if (monthly && input.priceCents == null) {
        await this.db.plan.update({ where: { id: plan.id }, data: { priceCents: monthly.priceCents } });
      }
    }
    return this.db.plan.findUnique({ where: { id: plan.id }, include: { prices: true } });
  }

  async metrics(session: SessionContext) {
    const overview = await this.overview(session);
    const lines = [
      `vf_users ${overview.users}`,
      `vf_stores ${overview.stores}`,
      `vf_jobs_dead_24h ${overview.jobsFailed24h}`,
      `vf_ai_estimated_cost_cents_30d ${overview.ai.estimatedCostCents}`,
    ];
    return lines.join("\n") + "\n";
  }
}
