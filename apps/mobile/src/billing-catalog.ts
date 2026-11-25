/** Catálogo local — a tela de planos não depende só da API (cold start / deploy). */
export type PlanCard = {
  id: string;
  code: string;
  name: string;
  description: string;
  priceCents: number;
  features: string[];
  badge?: string | null;
  highlighted?: boolean;
  icon?: string;
  prices: Array<{ interval: "MONTH" | "YEAR"; priceCents: number }>;
};

export const FALLBACK_PLANS: PlanCard[] = [
  {
    id: "basico",
    code: "basico",
    name: "Básico",
    description: "Para quem está começando a divulgar e vender nas redes.",
    priceCents: 1990,
    icon: "rocket",
    features: ["Até 20 produtos", "Anúncios com IA", "Compartilhar nas redes"],
    prices: [
      { interval: "MONTH", priceCents: 1990 },
      { interval: "YEAR", priceCents: 19100 },
    ],
  },
  {
    id: "pro",
    code: "pro",
    name: "Profissional",
    description: "O mais escolhido para quem publica toda semana com vídeo e artes.",
    priceCents: 4990,
    badge: "Mais escolhido",
    highlighted: true,
    icon: "crown",
    features: ["Produtos ilimitados", "Vídeos com voz (até 10/mês)", "Artes e modelos profissionais", "Loja online personalizada"],
    prices: [
      { interval: "MONTH", priceCents: 4990 },
      { interval: "YEAR", priceCents: 47900 },
    ],
  },
  {
    id: "business",
    code: "business",
    name: "Business",
    description: "Para equipes com mais volume, usuários e suporte prioritário.",
    priceCents: 9990,
    icon: "building",
    features: ["Tudo do Profissional", "Vídeos ilimitados*", "Equipe (até 5 usuários)", "Suporte prioritário"],
    prices: [
      { interval: "MONTH", priceCents: 9990 },
      { interval: "YEAR", priceCents: 95900 },
    ],
  },
];

export function asFeatures(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(String).filter(Boolean);
}

export function normalizePlans(raw: unknown): PlanCard[] {
  if (!Array.isArray(raw) || raw.length === 0) return FALLBACK_PLANS;
  const byCode = new Map(FALLBACK_PLANS.map((plan) => [plan.code, plan]));
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const code = String(row.code || "");
    if (!code || code === "free") continue;
    const fallback = byCode.get(code);
    const pricesRaw = Array.isArray(row.prices) ? row.prices : [];
    const prices = pricesRaw
      .map((price) => {
        if (!price || typeof price !== "object") return null;
        const p = price as Record<string, unknown>;
        const interval = p.interval === "YEAR" ? "YEAR" : "MONTH";
        return { interval: interval as "MONTH" | "YEAR", priceCents: Number(p.priceCents || 0) };
      })
      .filter(Boolean) as PlanCard["prices"];
    byCode.set(code, {
      id: String(row.id || fallback?.id || code),
      code,
      name: String(row.name || fallback?.name || code),
      description: String(row.description || fallback?.description || ""),
      priceCents: Number(row.priceCents || fallback?.priceCents || 0),
      features: asFeatures(row.features).length ? asFeatures(row.features) : fallback?.features || [],
      badge: (row.badge as string | null | undefined) ?? fallback?.badge ?? null,
      highlighted: row.highlighted != null ? Boolean(row.highlighted) : Boolean(fallback?.highlighted),
      icon: String(row.icon || fallback?.icon || "sparkles"),
      prices: prices.length ? prices : fallback?.prices || [{ interval: "MONTH", priceCents: Number(row.priceCents || 0) }],
    });
  }
  const order = ["basico", "pro", "business"];
  const ordered = order.map((code) => byCode.get(code)).filter(Boolean) as PlanCard[];
  return ordered.length === 3 ? ordered : FALLBACK_PLANS;
}

export function priceFor(plan: PlanCard, interval: "MONTH" | "YEAR") {
  const found = plan.prices.find((item) => item.interval === interval)?.priceCents;
  if (found != null && found > 0) return found;
  if (interval === "YEAR") {
    const month = plan.prices.find((item) => item.interval === "MONTH")?.priceCents ?? plan.priceCents;
    return Math.round(month * 12 * 0.8);
  }
  return plan.priceCents;
}

/** Preço exibido nos cards: mensal, ou equivalente mensal com ~20% OFF no anual. */
export function displayMonthlyCents(plan: PlanCard, interval: "MONTH" | "YEAR") {
  if (interval === "MONTH") return priceFor(plan, "MONTH");
  return Math.round(priceFor(plan, "YEAR") / 12);
}
