import type { BillingInterval, PrismaClient } from "@prisma/client";
import { verifyMercadoPagoSignature } from "@vendefacil/media";
import type { PlanLimits } from "@vendefacil/types";
import { AppError } from "./errors";
import { allowanceFor, applyCredit, parseLimits, INCLUDED_KINDS } from "./ledger";
import { assertMinRole } from "./permissions";
import { PLAN_CATALOG } from "./plans";
import { syncPlanCatalog } from "./plan-sync";
import { getPaymentProvider } from "./payments/mercadopago";
import { audit, type Tenant } from "./tenant";

function periodEnd(start: Date, interval: BillingInterval) {
  const end = new Date(start);
  if (interval === "YEAR") end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  return end;
}

function asFeatures(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function intervalFromRaw(raw: unknown): BillingInterval {
  const value = raw && typeof raw === "object" && "interval" in raw ? (raw as { interval?: string }).interval : null;
  return value === "YEAR" ? "YEAR" : "MONTH";
}

export class BillingService {
  constructor(private db: PrismaClient) {}

  async ensureCatalog() {
    await syncPlanCatalog(this.db);
  }

  async overview(tenant: Tenant) {
    await this.ensureCatalog();
    const [plans, subscription, wallets, transactions, invoices, payments, usage] = await Promise.all([
      this.db.plan.findMany({ where: { active: true }, orderBy: { position: "asc" }, include: { prices: { where: { active: true } } } }),
      this.db.subscription.findUnique({ where: { organizationId: tenant.organizationId }, include: { plan: { include: { prices: true } } } }),
      this.db.creditWallet.findMany({ where: { organizationId: tenant.organizationId } }),
      this.db.creditTransaction.findMany({ where: { organizationId: tenant.organizationId }, orderBy: { createdAt: "desc" }, take: 30 }),
      this.db.invoice.findMany({ where: { organizationId: tenant.organizationId }, orderBy: { createdAt: "desc" }, take: 20 }),
      this.db.payment.findMany({ where: { organizationId: tenant.organizationId }, orderBy: { createdAt: "desc" }, take: 20 }),
      this.usageSummary(tenant.organizationId),
    ]);
    const provider = getPaymentProvider();
    const limits = subscription ? parseLimits(subscription.plan.limits) : parseLimits(PLAN_CATALOG[0]!.limits);
    return {
      plans: plans.map((plan) => ({
        ...plan,
        features: asFeatures(plan.features),
      })),
      subscription,
      wallets,
      transactions,
      invoices,
      payments,
      usage,
      limits,
      paymentsConfigured: provider.isConfigured(),
      policy:
        "Créditos inclusos renovam no início do período e não acumulam. Vídeos seguem fair-use do plano (teto mensal). Pagamentos só são confirmados via webhook do provedor — nunca só pelo retorno do app.",
      states: this.deriveStates(subscription?.status, subscription?.cancelAtPeriodEnd, provider.isConfigured()),
    };
  }

  private deriveStates(status?: string | null, cancelAtPeriodEnd?: boolean, paymentsConfigured?: boolean) {
    return {
      expired: status === "PAST_DUE" || status === "CANCELED",
      pendingPayment: status === "INCOMPLETE" || status === "PAST_DUE",
      cancelScheduled: Boolean(cancelAtPeriodEnd),
      upgradeAvailable: true,
      paymentsOffline: !paymentsConfigured,
    };
  }

  async usageSummary(organizationId: string) {
    const subscription = await this.db.subscription.findUnique({ where: { organizationId }, include: { plan: true } });
    const limits = parseLimits(subscription?.plan.limits ?? PLAN_CATALOG[0]!.limits);
    const since = subscription?.currentPeriodStart || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [renders, announcements, products, mediaBytes] = await Promise.all([
      this.db.usageEvent.aggregate({
        where: { organizationId, type: "video.render", createdAt: { gte: since } },
        _sum: { quantity: true },
      }),
      this.db.usageEvent.aggregate({
        where: { organizationId, type: "ai.announcement", createdAt: { gte: since } },
        _sum: { quantity: true },
      }),
      this.db.product.count({ where: { organizationId, status: { not: "ARCHIVED" } } }),
      this.db.mediaAsset.aggregate({ where: { organizationId, status: "READY" }, _sum: { sizeBytes: true } }),
    ]);
    const usedGb = Number(((mediaBytes._sum.sizeBytes || 0) / (1024 * 1024 * 1024)).toFixed(2));
    return {
      videos: { used: renders._sum.quantity || 0, cap: limits.videoSoftCap },
      announcements: { used: announcements._sum.quantity || 0, cap: limits.announcementCredits },
      products: { used: products, cap: limits.products },
      storage: { usedGb, capGb: limits.storageGb },
      periodStart: since,
      periodEnd: subscription?.currentPeriodEnd || null,
    };
  }

  async recordUsage(organizationId: string, type: string, quantity = 1, metadata?: Record<string, string | number | boolean | null>) {
    await this.db.usageEvent.create({
      data: { organizationId, type, quantity, metadata: metadata ?? undefined },
    });
  }

  async assertVideoCap(organizationId: string) {
    const usage = await this.usageSummary(organizationId);
    if (usage.videos.cap >= 0 && usage.videos.used >= usage.videos.cap) {
      throw new AppError(
        "PLAN_LIMIT",
        `Limite de vídeos do plano atingido (${usage.videos.used}/${usage.videos.cap}). Faça upgrade ou aguarde a renovação.`,
        402,
      );
    }
  }

  async assertStorage(organizationId: string, extraBytes = 0) {
    const usage = await this.usageSummary(organizationId);
    const nextGb = usage.storage.usedGb + extraBytes / (1024 * 1024 * 1024);
    if (usage.storage.capGb >= 0 && nextGb > usage.storage.capGb) {
      throw new AppError("PLAN_LIMIT", `Armazenamento do plano esgotado (${usage.storage.usedGb}/${usage.storage.capGb} GB). Faça upgrade para continuar.`, 402);
    }
  }

  async checkout(tenant: Tenant, planCode: string, appUrl: string, interval: BillingInterval = "MONTH") {
    assertMinRole(tenant.role, "OWNER");
    await this.ensureCatalog();
    const plan = await this.db.plan.findUnique({ where: { code: planCode }, include: { prices: true } });
    if (!plan || !plan.active) throw new AppError("NOT_FOUND", "Plano não encontrado.", 404);
    const priceRow = plan.prices.find((item) => item.interval === interval && item.active);
    const priceCents = priceRow?.priceCents ?? plan.priceCents;
    if (priceCents === 0) {
      await this.activate({
        organizationId: tenant.organizationId,
        planId: plan.id,
        provider: "free",
        externalId: null,
        amountCents: 0,
        description: "Plano gratuito",
        interval,
        actorUserId: tenant.userId,
        eventType: "activated_free",
      });
      return { url: null as string | null, methods: [] as string[], status: "activated" as const };
    }
    const provider = getPaymentProvider();
    if (!provider.isConfigured()) {
      throw new AppError("PROVIDER_NOT_CONFIGURED", "A cobrança online ainda não está configurada. O plano gratuito continua ativo.", 503);
    }
    const session = await this.db.checkoutSession.create({
      data: { organizationId: tenant.organizationId, planId: plan.id, amountCents: priceCents },
    });
    const checkout = await provider.createCheckout({
      planCode: plan.code,
      planName: `${plan.name} (${interval === "YEAR" ? "anual" : "mensal"})`,
      amountCents: priceCents,
      sessionId: session.id,
      appUrl,
      payerEmail: tenant.email,
    });
    await this.db.checkoutSession.update({ where: { id: session.id }, data: { externalId: checkout.externalId } });
    await this.db.payment.create({
      data: {
        organizationId: tenant.organizationId,
        provider: checkout.provider,
        externalId: `pref:${checkout.externalId}`,
        amountCents: priceCents,
        status: "PENDING",
        method: null,
        raw: { preferenceId: checkout.externalId, sessionId: session.id, interval },
      },
    });
    return { url: checkout.url, methods: checkout.methods, status: "checkout" as const };
  }

  async webhook(input: { body: unknown; signature: string | null; requestId: string | null; dataId: string | null }) {
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET || "";
    if (secret) {
      if (!verifyMercadoPagoSignature({ secret, signatureHeader: input.signature, requestId: input.requestId, dataId: input.dataId })) {
        throw new AppError("SIGNATURE_INVALID", "Assinatura do webhook inválida.", 401);
      }
    } else if (process.env.NODE_ENV === "production") {
      throw new AppError("PROVIDER_NOT_CONFIGURED", "Segredo do webhook não configurado.", 503);
    }
    if (!input.dataId) throw new AppError("VALIDATION", "Webhook sem identificador de pagamento.", 422);
    const provider = getPaymentProvider();
    const payment = await provider.fetchPayment(input.dataId);
    if (payment.status !== "approved" || !payment.externalReference) return { ignored: true };

    const session = await this.db.checkoutSession.findUnique({ where: { id: payment.externalReference }, include: { plan: true } });
    if (!session) return { ignored: true };
    if (payment.currency !== "BRL" || Math.abs(payment.amountCents - session.amountCents) > 1) {
      throw new AppError("AMOUNT_MISMATCH", "O valor pago não confere com o plano.", 409);
    }

    const existingPayment = await this.db.payment.findFirst({
      where: { provider: payment.provider, externalId: payment.externalId, status: "APPROVED" },
    });
    if (existingPayment) return { replay: true };

    const pendingPref = session.externalId
      ? await this.db.payment.findFirst({ where: { externalId: `pref:${session.externalId}` } })
      : null;
    const interval = intervalFromRaw(pendingPref?.raw);

    await this.activate({
      organizationId: session.organizationId,
      planId: session.planId,
      provider: payment.provider,
      externalId: payment.externalId,
      amountCents: session.amountCents,
      description: session.plan.name,
      interval,
      eventType: "payment_approved",
      paymentMethod: payment.method,
      paymentRaw: payment.raw,
    });
    await this.db.checkoutSession.update({ where: { id: session.id }, data: { status: "APPROVED" } });
    if (pendingPref) {
      await this.db.payment.update({ where: { id: pendingPref.id }, data: { status: "APPROVED", method: payment.method || null } });
    }
    return { ok: true };
  }

  async changePlan(tenant: Tenant, planCode: string, interval: BillingInterval = "MONTH", appUrl: string) {
    assertMinRole(tenant.role, "OWNER");
    const current = await this.db.subscription.findUnique({ where: { organizationId: tenant.organizationId }, include: { plan: true } });
    const next = await this.db.plan.findUnique({ where: { code: planCode }, include: { prices: true } });
    if (!next?.active) throw new AppError("NOT_FOUND", "Plano não encontrado.", 404);
    if (current?.plan.code === planCode && current.billingInterval === interval) {
      throw new AppError("CONFLICT", "Você já está neste plano e período.", 409);
    }
    const nextPrice = next.prices.find((item) => item.interval === interval)?.priceCents ?? next.priceCents;
    if (nextPrice === 0) {
      await this.activate({
        organizationId: tenant.organizationId,
        planId: next.id,
        provider: current?.provider || "free",
        externalId: null,
        amountCents: 0,
        description: `Downgrade para ${next.name}`,
        interval,
        actorUserId: tenant.userId,
        eventType: "downgrade",
        fromPlanId: current?.planId,
      });
      return {
        url: null as string | null,
        methods: [] as string[],
        status: "activated" as const,
        prorationNote: "A mudança vale a partir de agora. Créditos são recalculados para o novo plano.",
      };
    }
    const result = await this.checkout(tenant, planCode, appUrl, interval);
    return {
      ...result,
      prorationNote:
        "A cobrança é do valor cheio do novo ciclo. O saldo do período atual não gera reembolso automático; o novo plano começa após confirmação do pagamento.",
    };
  }

  async cancel(tenant: Tenant) {
    assertMinRole(tenant.role, "OWNER");
    const subscription = await this.db.subscription.findUnique({ where: { organizationId: tenant.organizationId } });
    if (!subscription) throw new AppError("NOT_FOUND", "Assinatura não encontrada.", 404);
    await this.db.subscription.update({
      where: { id: subscription.id },
      data: { cancelAtPeriodEnd: true, canceledAt: new Date() },
    });
    await this.db.subscriptionEvent.create({
      data: {
        subscriptionId: subscription.id,
        organizationId: tenant.organizationId,
        type: "cancel_requested",
        fromPlanId: subscription.planId,
        metadata: { endsAt: subscription.currentPeriodEnd },
      },
    });
    await audit(this.db, {
      organizationId: tenant.organizationId,
      actorUserId: tenant.userId,
      action: "subscription.cancel_requested",
      entityType: "Subscription",
      entityId: subscription.id,
    });
    return {
      endsAt: subscription.currentPeriodEnd,
      retention:
        "Seus produtos, anúncios e mídias permanecem disponíveis até o fim do período pago. Depois você pode continuar no gratuito ou reativar um plano pago.",
    };
  }

  async reactivate(tenant: Tenant) {
    assertMinRole(tenant.role, "OWNER");
    const subscription = await this.db.subscription.findUnique({ where: { organizationId: tenant.organizationId } });
    if (!subscription) throw new AppError("NOT_FOUND", "Assinatura não encontrada.", 404);
    await this.db.subscription.update({
      where: { id: subscription.id },
      data: { cancelAtPeriodEnd: false, canceledAt: null, status: "ACTIVE" },
    });
    await this.db.subscriptionEvent.create({
      data: {
        subscriptionId: subscription.id,
        organizationId: tenant.organizationId,
        type: "reactivated",
        toPlanId: subscription.planId,
      },
    });
    return { ok: true };
  }

  async renewDue() {
    const due = await this.db.subscription.findMany({ where: { currentPeriodEnd: { lt: new Date() } }, include: { plan: true } });
    for (const subscription of due) {
      if (subscription.cancelAtPeriodEnd || subscription.plan.priceCents > 0) {
        const free = await this.db.plan.findUnique({ where: { code: "free" } });
        if (!free) continue;
        const pastDue = subscription.plan.priceCents > 0 && !subscription.cancelAtPeriodEnd;
        await this.activate({
          organizationId: subscription.organizationId,
          planId: free.id,
          provider: subscription.provider,
          externalId: null,
          amountCents: 0,
          description: pastDue ? "Período encerrado sem pagamento" : "Retorno ao plano gratuito",
          interval: "MONTH",
          eventType: pastDue ? "past_due" : "canceled_to_free",
          fromPlanId: subscription.planId,
        });
        if (pastDue) {
          await this.db.subscription.update({ where: { id: subscription.id }, data: { status: "PAST_DUE" } });
          await this.db.invoice.create({
            data: {
              organizationId: subscription.organizationId,
              subscriptionId: subscription.id,
              amountCents: subscription.plan.priceCents,
              status: "PAST_DUE",
              description: subscription.plan.name,
              dueAt: subscription.currentPeriodEnd,
            },
          });
        }
      } else {
        await this.activate({
          organizationId: subscription.organizationId,
          planId: subscription.planId,
          provider: subscription.provider,
          externalId: null,
          amountCents: 0,
          description: "Renovação do plano gratuito",
          interval: subscription.billingInterval,
          eventType: "renewed_free",
        });
      }
    }
  }

  private async activate(input: {
    organizationId: string;
    planId: string;
    provider: string | null;
    externalId: string | null;
    amountCents: number;
    description: string;
    interval: BillingInterval;
    actorUserId?: string;
    eventType: string;
    fromPlanId?: string | null;
    paymentMethod?: string | null;
    paymentRaw?: unknown;
  }) {
    const plan = await this.db.plan.findUnique({ where: { id: input.planId } });
    if (!plan) throw new AppError("NOT_FOUND", "Plano não encontrado.", 404);
    const start = new Date();
    const end = periodEnd(start, input.interval);
    const previous = await this.db.subscription.findUnique({ where: { organizationId: input.organizationId } });
    const subscription = await this.db.subscription.upsert({
      where: { organizationId: input.organizationId },
      create: {
        organizationId: input.organizationId,
        planId: input.planId,
        status: "ACTIVE",
        billingInterval: input.interval,
        currentPeriodStart: start,
        currentPeriodEnd: end,
        provider: input.provider,
        externalId: input.externalId,
      },
      update: {
        planId: input.planId,
        status: "ACTIVE",
        billingInterval: input.interval,
        currentPeriodStart: start,
        currentPeriodEnd: end,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        provider: input.provider,
        externalId: input.externalId,
      },
    });

    await this.db.subscriptionEvent.create({
      data: {
        subscriptionId: subscription.id,
        organizationId: input.organizationId,
        type: input.eventType,
        fromPlanId: input.fromPlanId || previous?.planId || null,
        toPlanId: input.planId,
        metadata: { interval: input.interval, amountCents: input.amountCents },
      },
    });

    if (input.amountCents > 0 && input.externalId) {
      const invoice = await this.db.invoice.create({
        data: {
          organizationId: input.organizationId,
          subscriptionId: subscription.id,
          amountCents: input.amountCents,
          status: "PAID",
          description: input.description,
          paidAt: new Date(),
          externalId: input.externalId,
        },
      });
      await this.db.payment.upsert({
        where: { provider_externalId: { provider: input.provider || "unknown", externalId: input.externalId } },
        create: {
          organizationId: input.organizationId,
          invoiceId: invoice.id,
          provider: input.provider || "unknown",
          externalId: input.externalId,
          amountCents: input.amountCents,
          status: "APPROVED",
          method: input.paymentMethod || null,
          raw: input.paymentRaw as object | undefined,
        },
        update: {
          invoiceId: invoice.id,
          status: "APPROVED",
          method: input.paymentMethod || null,
          raw: input.paymentRaw as object | undefined,
        },
      });
    }

    await this.resetIncluded(input.organizationId, parseLimits(plan.limits), start.toISOString());
    if (input.actorUserId) {
      await audit(this.db, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: `subscription.${input.eventType}`,
        entityType: "Subscription",
        entityId: subscription.id,
      });
    }
  }

  private async resetIncluded(organizationId: string, limits: PlanLimits, period: string) {
    await this.db.$transaction(async (tx) => {
      for (const kind of INCLUDED_KINDS) {
        const wallet = await tx.creditWallet.findUnique({ where: { organizationId_kind: { organizationId, kind } } });
        if (!wallet) continue;
        const target = allowanceFor(limits, kind);
        const delta = target - wallet.balance;
        if (delta === 0) continue;
        await applyCredit(tx, {
          organizationId,
          walletId: wallet.id,
          amount: delta,
          reason: "period_allowance",
          idempotencyKey: `period:${organizationId}:${kind}:${period}`,
        });
      }
    });
  }
}

export { PLAN_CATALOG };
