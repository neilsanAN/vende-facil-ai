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
    features: ["Tudo do Profissional", "Vídeos com fair-use* (até 40/mês)", "Equipe (até 5 usuários)", "Suporte prioritário"],
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
  const mapped = raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const code = String(row.code || "");
      if (!code || code === "free") return null;
      const pricesRaw = Array.isArray(row.prices) ? row.prices : [];
      const prices = pricesRaw
        .map((price) => {
          if (!price || typeof price !== "object") return null;
          const p = price as Record<string, unknown>;
          const interval = p.interval === "YEAR" ? "YEAR" : "MONTH";
          return { interval: interval as "MONTH" | "YEAR", priceCents: Number(p.priceCents || 0) };
        })
        .filter(Boolean) as PlanCard["prices"];
      return {
        id: String(row.id || code),
        code,
        name: String(row.name || code),
        description: String(row.description || ""),
        priceCents: Number(row.priceCents || 0),
        features: asFeatures(row.features),
        badge: (row.badge as string | null | undefined) ?? null,
        highlighted: Boolean(row.highlighted),
        icon: String(row.icon || "sparkles"),
        prices: prices.length
          ? prices
          : [
              { interval: "MONTH" as const, priceCents: Number(row.priceCents || 0) },
              { interval: "YEAR" as const, priceCents: Number(row.priceCents || 0) },
            ],
      } satisfies PlanCard;
    })
    .filter(Boolean) as PlanCard[];
  return mapped.length ? mapped : FALLBACK_PLANS;
}

export function priceFor(plan: PlanCard, interval: "MONTH" | "YEAR") {
  return plan.prices.find((item) => item.interval === interval)?.priceCents ?? plan.priceCents;
}
