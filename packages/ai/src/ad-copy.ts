import type { ConfirmedFacts } from "./types";

export const AD_COPY_PROMPT = `Você escreve anúncios profissionais para WhatsApp e Instagram, em português do Brasil.
Use somente os fatos confirmados e as observações visuais. Não invente marca, preço, composição, garantia ou especificação ausente.
Regras do texto:
- title: curto, específico e vendável (nome/tipo do produto + gancho). Proibido: "Saiba Mais", "Detalhes", "Produto -", títulos genéricos.
- description: 2 a 4 frases naturais, com benefício e CTA claro (ex.: "Chame no WhatsApp e garanta o seu"). Proibido: "Entre em contato com a nossa equipe para obter mais informações", "esclarecer suas dúvidas", textos corporativos vazios.
- hashtags: 3 a 6, sem #, relacionadas ao produto (não use só "produto" e "atendimento").
Não inclua links, emojis de link (🔗) nem URL.
Responda só JSON: {"title":"","description":"","hashtags":[]}`;

export function factsBlock(facts: ConfirmedFacts) {
  return [
    `Nome confirmado: ${facts.name}`,
    `Preço confirmado: ${facts.priceLabel || "não informado"}`,
    `Marca confirmada: ${facts.brand || "não informada"}`,
    `Características confirmadas pelo vendedor: ${facts.facts || "nenhuma"}`,
    `Público informado: ${facts.audience || "não informado"}`,
    `Observações visuais: ${facts.visible ? JSON.stringify(facts.visible) : "não disponíveis"}`,
  ].join("\n");
}

export function polishTitle(title: string) {
  return title
    .replace(/\s*[-–—]\s*Saiba Mais.*$/i, "")
    .replace(/\bSaiba Mais\b/gi, "")
    .replace(/\bDetalhes\b/gi, "")
    .replace(/^Produto\s*[-–—]\s*/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function polishDescription(description: string, productName: string) {
  const cleaned = description
    .replace(/🔗.*/g, "")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/Entre em contato com a nossa equipe[^.]*\./gi, "")
    .replace(/para obter mais informações[^.]*\./gi, "")
    .replace(/esclarecer suas dúvidas[^.]*\./gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (cleaned.length >= 40) return cleaned;
  const name = productName.trim() || "este produto";
  return `Apresentamos ${name} com ótimo acabamento e pronto para entrega.\n\nChame no WhatsApp e garanta o seu!`;
}
