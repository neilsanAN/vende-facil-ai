export const colors = {
  primary: "#7C5CFF",
  primaryHover: "#6846F0",
  primarySoft: "#241B4A",
  background: "#070B18",
  surface: "#12182B",
  text: "#F5F7FB",
  textSecondary: "#9AA3B8",
  border: "#2A3148",
  success: "#3DDC97",
  warning: "#F5B942",
  error: "#FF6B7A",
  ink: "#070B18",
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
  { href: "/pedidos", label: "Pedidos", icon: "receipt" },
  { href: "/estatisticas", label: "Estatísticas", icon: "chart" },
  { href: "/mais", label: "Mais", icon: "menu" },
] as const;
