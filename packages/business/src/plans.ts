import type { PlanLimits } from "@vendefacil/types";

export const PLAN_CATALOG: Array<{
  code: string;
  name: string;
  description: string;
  priceCents: number;
  position: number;
  limits: PlanLimits;
}> = [
  {
    code: "free",
    name: "Gratuito",
    description: "Para começar a cadastrar produtos, publicar a vitrine e testar a IA com limite mensal.",
    priceCents: 0,
    position: 0,
    limits: { products: 30, members: 1, announcementCredits: 40, narrationCredits: 10, renderCredits: 5, generativeVideoCredits: 0, aiPerHour: 20, scheduledPosts: false },
  },
  {
    code: "pro",
    name: "Profissional",
    description: "Para quem publica toda semana e precisa de mais créditos de anúncio, narração e vídeo.",
    priceCents: 9900,
    position: 1,
    limits: { products: -1, members: 5, announcementCredits: 400, narrationCredits: 80, renderCredits: 40, generativeVideoCredits: 0, aiPerHour: 120, scheduledPosts: true },
  },
  {
    code: "business",
    name: "Empresarial",
    description: "Para equipes e operações com mais volume, usuários e histórico de consumo.",
    priceCents: 29900,
    position: 2,
    limits: { products: -1, members: 25, announcementCredits: 2000, narrationCredits: 300, renderCredits: 150, generativeVideoCredits: 0, aiPerHour: 400, scheduledPosts: true },
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
