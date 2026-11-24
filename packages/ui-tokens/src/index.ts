export const colors = {
  primary: "#7C5CFF",
  primaryHover: "#6846F0",
  primarySoft: "#EFEAFF",
  background: "#F5F6FA",
  surface: "#FFFFFF",
  text: "#171827",
  textSecondary: "#6B7288",
  border: "#E6E8F0",
  success: "#22C55E",
  warning: "#F5B942",
  error: "#FF6B7A",
  ink: "#171827",
  welcome: "#070B18",
} as const;

export const radius = {
  sm: 8,
  md: 10,
  lg: 16,
  pill: 999,
} as const;

export const shadow = {
  sm: "0 1px 2px rgba(23, 24, 39, 0.05)",
  md: "0 8px 24px rgba(23, 24, 39, 0.06)",
} as const;

export const font = {
  sans: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif",
} as const;

/** Escala compacta do Invento AI. Cores ficam no app que consome. */
export const fonts = {
  tiny: 9,
  caption: 10,
  body2: 11,
  body: 12,
  subtitle: 13,
  title: 14,
  display: 16,
  hero: 18,
  heading: 20,
  brand: 22,
} as const;

export const control = {
  height: 40,
  fontSize: 12,
  icon: 16,
  tabIcon: 20,
  radiusInput: 8,
  radiusCard: 10,
  radiusSheet: 16,
} as const;

export const brand = {
  name: "VendeFácil AI",
  tagline: "Crie, divulgue e venda seus produtos nas redes sociais em minutos.",
} as const;

export const mobileNav = [
  { href: "/inicio", label: "Início", icon: "home" },
  { href: "/produtos", label: "Produtos", icon: "package" },
  { href: "/anuncios/novo", label: "Criar", icon: "plus" },
  { href: "/estudio", label: "Estúdio", icon: "sparkles" },
  { href: "/mais", label: "Mais", icon: "menu" },
] as const;

/** Onboarding da tela inicial — web e mobile. */
export const welcomeSlides = [
  {
    key: "create",
    eyebrow: "Criação com IA",
    title: "Da foto ao anúncio pronto",
    description: "Fotografe o produto e receba título, descrição e hashtags alinhados ao que você vende.",
    bullets: ["Upload rápido no celular ou web", "Revise cada detalhe antes de publicar", "Salve rascunhos no estúdio"],
    ionIcon: "sparkles-outline",
  },
  {
    key: "studio",
    eyebrow: "Estúdio criativo",
    title: "Vídeo, voz e arte para redes",
    description: "Monte vídeos com narração, artes para feed e stories sem ferramentas extras.",
    bullets: ["Narração em português", "Formatos pensados para Instagram e WhatsApp", "Exportação quando o render concluir"],
    ionIcon: "play-circle-outline",
  },
  {
    key: "sell",
    eyebrow: "Venda inteligente",
    title: "Vitrine, pedidos e métricas",
    description: "Compartilhe o link da loja, receba pedidos e acompanhe visualizações e vendas em tempo real.",
    bullets: ["Link profissional da sua loja", "Botão WhatsApp na vitrine", "Painel dos últimos 7 dias"],
    ionIcon: "trending-up-outline",
  },
] as const;
