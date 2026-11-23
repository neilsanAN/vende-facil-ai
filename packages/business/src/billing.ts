import type { PrismaClient } from "@prisma/client";
import { verifyMercadoPagoSignature } from "@vendefacil/media";
import type { PlanLimits } from "@vendefacil/types";
import { AppError } from "./errors";
import { allowanceFor, applyCredit, parseLimits, INCLUDED_KINDS } from "./ledger";
import { assertMinRole } from "./permissions";
import { PLAN_CATALOG } from "./plans";
import { audit, type Tenant } from "./tenant";

export class BillingService {
  constructor(private db: PrismaClient) {}

  async overview(tenant: Tenant) {
    const [plans, subscription, wallets, transactions, invoices] = await Promise.all([
      this.db.plan.findMany({ where: { active: true }, orderBy: { position: "asc" } }),
      this.db.subscription.findUnique({ where: { organizationId: tenant.organizationId }, include: { plan: true } }),
      this.db.creditWallet.findMany({ where: { organizationId: tenant.organizationId } }),
      this.db.creditTransaction.findMany({ where: { organizationId: tenant.organizationId }, orderBy: { createdAt: "desc" }, take: 30 }),
      this.db.invoice.findMany({ where: { organizationId: tenant.organizationId }, orderBy: { createdAt: "desc" }, take: 20 }),
    ]);
    return {
      plans,
      subscription,
      wallets,
      transactions,
      invoices,
      paymentsConfigured: Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN),
      policy: "Créditos inclusos são renovados no início do período e não acumulam. Créditos de vídeo generativo ficam separados e só mudam por compra ou uso.",
    };
  }

  async checkout(tenant: Tenant, planCode: string, appUrl: string) {
    assertMinRole(tenant.role, "OWNER");
    const plan = await this.db.plan.findUnique({ where: { code: planCode } });
    if (!plan || !plan.active) throw new AppError("NOT_FOUND", "Plano não encontrado.", 404);
    if (plan.priceCents === 0) {
      await this.activate(tenant.organizationId, plan.id, "free", null, 0, "Plano gratuito");
      return { url: null as string | null };
    }
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) throw new AppError("PROVIDER_NOT_CONFIGURED", "A cobrança online ainda não está configurada. O plano gratuito continua ativo.", 503);
    const session = await this.db.checkoutSession.create({ data: { organizationId: tenant.organizationId, planId: plan.id, amountCents: plan.priceCents } });
    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        items: [{ title: `VendeFacil AI ${plan.name}`, quantity: 1, currency_id: "BRL", unit_price: plan.priceCents / 100 }],
        external_reference: session.id,
        notification_url: `${appUrl}/api/webhooks/mercadopago`,
        back_urls: { success: `${appUrl}/assinatura?pagamento=ok`, failure: `${appUrl}/assinatura?pagamento=falha`, pending: `${appUrl}/assinatura?pagamento=pendente` },
        auto_return: "approved",
      }),
    });
    const payload = (await response.json()) as { id?: string; init_point?: string; message?: string };
    if (!response.ok || !payload.init_point || !payload.id) {
      throw new AppError("BILLING_FAILED", payload.message || "O Mercado Pago não abriu o checkout.", 502);
    }
    await this.db.checkoutSession.update({ where: { id: session.id }, data: { externalId: payload.id } });
    return { url: payload.init_point };
  }

  async webhook(input: { body: unknown; signature: string | null; requestId: string | null; dataId: string | null }) {
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET || "";
    if (!verifyMercadoPagoSignature({ secret, signatureHeader: input.signature, requestId: input.requestId, dataId: input.dataId })) {
      throw new AppError("SIGNATURE_INVALID", "Assinatura do webhook inválida.", 401);
    }
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token || !input.dataId) throw new AppError("PROVIDER_NOT_CONFIGURED", "Cobrança não configurada.", 503);
    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${input.dataId}`, { headers: { authorization: `Bearer ${token}` } });
    const payment = (await paymentResponse.json()) as { status?: string; transaction_amount?: number; external_reference?: string; id?: number; currency_id?: string };
    if (!paymentResponse.ok) throw new AppError("BILLING_FAILED", "Não foi possível confirmar o pagamento.", 502);
    if (payment.status !== "approved" || !payment.external_reference) return { ignored: true };
    const session = await this.db.checkoutSession.findUnique({ where: { id: payment.external_reference }, include: { plan: true } });
    if (!session) return { ignored: true };
    const paidCents = Math.round((payment.transaction_amount || 0) * 100);
    if (payment.currency_id !== "BRL" || Math.abs(paidCents - session.amountCents) > 1) {
      throw new AppError("AMOUNT_MISMATCH", "O valor pago não confere com o plano.", 409);
    }
    const externalId = String(payment.id);
    const existing = await this.db.invoice.findFirst({ where: { externalId, status: "PAID" } });
    if (existing) return { replay: true };
    await this.activate(session.organizationId, session.planId, "mercadopago", externalId, session.amountCents, session.plan.name);
    await this.db.checkoutSession.update({ where: { id: session.id }, data: { status: "APPROVED" } });
    return { ok: true };
  }

  async cancel(tenant: Tenant) {
    assertMinRole(tenant.role, "OWNER");
    await this.db.subscription.update({ where: { organizationId: tenant.organizationId }, data: { cancelAtPeriodEnd: true } });
    await audit(this.db, { organizationId: tenant.organizationId, actorUserId: tenant.userId, action: "subscription.cancel_requested", entityType: "Subscription" });
  }

  async renewDue() {
    const due = await this.db.subscription.findMany({ where: { currentPeriodEnd: { lt: new Date() } }, include: { plan: true } });
    for (const subscription of due) {
      if (subscription.cancelAtPeriodEnd || subscription.plan.priceCents > 0) {
        const free = await this.db.plan.findUnique({ where: { code: "free" } });
        if (!free) continue;
        const status = subscription.plan.priceCents > 0 && !subscription.cancelAtPeriodEnd ? "PAST_DUE" : "ACTIVE";
        await this.activate(subscription.organizationId, status === "PAST_DUE" ? free.id : free.id, subscription.provider, null, 0, status === "PAST_DUE" ? "Período encerrado sem pagamento" : "Retorno ao plano gratuito");
        if (status === "PAST_DUE") {
          await this.db.subscription.update({ where: { id: subscription.id }, data: { status: "PAST_DUE" } });
          await this.db.invoice.create({ data: { organizationId: subscription.organizationId, subscriptionId: subscription.id, amountCents: subscription.plan.priceCents, status: "PAST_DUE", description: subscription.plan.name, dueAt: subscription.currentPeriodEnd } });
        }
      } else {
        await this.activate(subscription.organizationId, subscription.planId, subscription.provider, null, 0, "Renovação do plano gratuito");
      }
    }
  }

  private async activate(organizationId: string, planId: string, provider: string | null, externalId: string | null, amountCents: number, description: string) {
    const plan = await this.db.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new AppError("NOT_FOUND", "Plano não encontrado.", 404);
    const start = new Date();
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    await this.db.subscription.upsert({
      where: { organizationId },
      create: { organizationId, planId, status: "ACTIVE", currentPeriodStart: start, currentPeriodEnd: end, provider, externalId },
      update: { planId, status: "ACTIVE", currentPeriodStart: start, currentPeriodEnd: end, cancelAtPeriodEnd: false, provider, externalId },
    });
    if (amountCents > 0 && externalId) {
      await this.db.invoice.create({ data: { organizationId, amountCents, status: "PAID", description, paidAt: new Date(), externalId } });
    }
    await this.resetIncluded(organizationId, parseLimits(plan.limits), start.toISOString());
  }

  private async resetIncluded(organizationId: string, limits: PlanLimits, period: string) {
    await this.db.$transaction(async (tx) => {
      for (const kind of INCLUDED_KINDS) {
        const wallet = await tx.creditWallet.findUnique({ where: { organizationId_kind: { organizationId, kind } } });
        if (!wallet) continue;
        const target = allowanceFor(limits, kind);
        const delta = target - wallet.balance;
        if (delta === 0) continue;
        await applyCredit(tx, { organizationId, walletId: wallet.id, amount: delta, reason: "period_allowance", idempotencyKey: `period:${organizationId}:${kind}:${period}` });
      }
    });
  }
}

export { PLAN_CATALOG };
