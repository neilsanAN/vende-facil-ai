/** Destino do botão Voltar nas telas internas do painel. Abas principais não voltam. */
export function panelBackHref(pathname: string): string | null {
  const path = pathname.split("?")[0] || pathname;
  const roots = new Set(["/inicio", "/produtos", "/estudio", "/mais"]);
  if (roots.has(path)) return null;
  if (path.startsWith("/produtos/")) return "/produtos";
  if (path.startsWith("/estudio/")) return "/estudio";
  if (path.startsWith("/anuncios/")) return "/inicio";
  if (path.startsWith("/pedidos/")) return "/pedidos";
  if (
    path === "/publicar" ||
    path === "/loja" ||
    path === "/estatisticas" ||
    path === "/pedidos" ||
    path === "/contatos" ||
    path === "/assinatura" ||
    path === "/equipe" ||
    path === "/configuracoes" ||
    path === "/criar"
  ) {
    return "/mais";
  }
  return "/inicio";
}
