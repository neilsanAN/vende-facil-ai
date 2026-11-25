import type { PlanLimits } from "@vendefacil/types";

export type PlanCatalogItem = {
  code: string;
  name: string;
  description: string;
  priceCents: number;
  position: number;
  badge?: string | null;
  highlighted?: boolean;
  icon?: string;
  features: string[];
  limits: PlanLimits;
  prices: Array<{ interval: "MONTH" | "YEAR"; priceCents: number }>;
};

/** Catálogo alinhado ao mock premium MeuVende+. free permanece para trial/onboarding. */
export const PLAN_CATALOG: PlanCatalogItem[] = [
  {
    code: "free",
    name: "Gratuito",
    description: "Para começar a cadastrar produtos e testar a IA com limite mensal.",
    priceCents: 0,
    position: 0,
    icon: "gift",
    features: ["Até 10 produtos", "Anúncios com IA (limitado)", "Link da loja"],
    limits: {
      products: 10,
      members: 1,
      announcementCredits: 20,
      narrationCredits: 3,
      renderCredits: 2,
      generativeVideoCredits: 0,
      aiPerHour: 10,
      scheduledPosts: false,
      storageGb: 1,
      videoSoftCap: 2,
    },
    prices: [
      { interval: "MONTH", priceCents: 0 },
      { interval: "YEAR", priceCents: 0 },
    ],
  },
  {
    code: "basico",
    name: "Básico",
    description: "Para quem está começando a divulgar e vender nas redes.",
    priceCents: 1990,
    position: 1,
    icon: "rocket",
    features: ["Até 20 produtos", "Anúncios com IA", "Compartilhar nas redes"],
    limits: {
      products: 20,
      members: 1,
      announcementCredits: 80,
      narrationCredits: 10,
      renderCredits: 5,
      generativeVideoCredits: 0,
      aiPerHour: 30,
      scheduledPosts: false,
      storageGb: 5,
      videoSoftCap: 5,
    },
    prices: [
      { interval: "MONTH", priceCents: 1990 },
      { interval: "YEAR", priceCents: 19100 },
    ],
  },
  {
    code: "pro",
    name: "Profissional",
    description: "O mais escolhido para quem publica toda semana com vídeo e artes.",
    priceCents: 4990,
    position: 2,
    badge: "Mais escolhido",
    highlighted: true,
    icon: "crown",
    features: ["Produtos ilimitados", "Vídeos com voz (até 10/mês)", "Artes e modelos profissionais", "Loja online personalizada"],
    limits: {
      products: -1,
      members: 3,
      announcementCredits: 400,
      narrationCredits: 40,
      renderCredits: 10,
      generativeVideoCredits: 0,
      aiPerHour: 120,
      scheduledPosts: true,
      storageGb: 50,
      videoSoftCap: 10,
    },
    prices: [
      { interval: "MONTH", priceCents: 4990 },
      { interval: "YEAR", priceCents: 47900 },
    ],
  },
  {
    code: "business",
    name: "Business",
    description: "Para equipes com mais volume, usuários e suporte prioritário.",
    priceCents: 9990,
    position: 3,
    icon: "building",
    features: ["Tudo do Profissional", "Vídeos ilimitados*", "Equipe (até 5 usuários)", "Suporte prioritário"],
    limits: {
      products: -1,
      members: 5,
      announcementCredits: 1200,
      narrationCredits: 120,
      renderCredits: 40,
      generativeVideoCredits: 0,
      aiPerHour: 300,
      scheduledPosts: true,
      storageGb: 200,
      videoSoftCap: 40,
    },
    prices: [
      { interval: "MONTH", priceCents: 9990 },
      { interval: "YEAR", priceCents: 95900 },
    ],
  },
];

export const DEFAULT_CATEGORIES = ["Eletrônicos", "Moda", "Casa", "Beleza", "Alimentos", "Serviços", "Outros"];

export const VOICE_CATALOG = [
  { provider: "openai", providerVoiceId: "nova", name: "Ana — suave", gender: "FEMALE", style: "SOFT" },
  { provider: "openai", providerVoiceId: "shimmer", name: "Bia — promocional", gender: "FEMALE", style: "PROMOTIONAL" },
  { provider: "openai", providerVoiceId: "alloy", name: "Clara — institucional", gender: "FEMALE", style: "INSTITUTIONAL" },
  { provider: "openai", providerVoiceId: "echo", name: "Heitor — suave", gender: "MALE", style: "SOFT" },
  { provider: "openai", providerVoiceId: "onyx", name: "Diego — institucional", gender: "MALE", style: "INSTITUTIONAL" },
  { provider: "openai", providerVoiceId: "fable", name: "Miguel — promocional", gender: "MALE", style: "PROMOTIONAL" },
] as const;
