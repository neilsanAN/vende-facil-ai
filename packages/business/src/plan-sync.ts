import type { PrismaClient } from "@prisma/client";
import { PLAN_CATALOG } from "./plans";

/** Upsert do catálogo de planos + preços (mensal/anual). */
export async function syncPlanCatalog(db: PrismaClient) {
  for (const plan of PLAN_CATALOG) {
    const row = await db.plan.upsert({
      where: { code: plan.code },
      create: {
        code: plan.code,
        name: plan.name,
        description: plan.description,
        priceCents: plan.priceCents,
        limits: plan.limits,
        features: plan.features,
        badge: plan.badge ?? null,
        highlighted: Boolean(plan.highlighted),
        icon: plan.icon || "sparkles",
        position: plan.position,
        active: true,
      },
      update: {
        name: plan.name,
        description: plan.description,
        priceCents: plan.priceCents,
        limits: plan.limits,
        features: plan.features,
        badge: plan.badge ?? null,
        highlighted: Boolean(plan.highlighted),
        icon: plan.icon || "sparkles",
        position: plan.position,
      },
    });
    for (const price of plan.prices) {
      await db.planPrice.upsert({
        where: { planId_interval_currency: { planId: row.id, interval: price.interval, currency: "BRL" } },
        create: { planId: row.id, interval: price.interval, priceCents: price.priceCents, currency: "BRL" },
        update: { priceCents: price.priceCents, active: true },
      });
    }
  }
}
