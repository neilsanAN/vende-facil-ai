export type SharePost = {
  storeName?: string | null;
  title: string;
  description?: string | null;
  priceLabel?: string | null;
  compareAtLabel?: string | null;
  hashtags?: string[] | string | null;
};

const GENERIC_TAGS = new Set(["produto", "atendimento", "oferta", "loja", "promo", "promocao", "promoção"]);

function waPlain(value: string) {
  return value.replace(/[*_~]/g, "").replace(/\s+/g, " ").trim();
}

function waBold(value: string) {
  const clean = waPlain(value);
  return clean ? `*${clean}*` : "";
}

function waStrike(value: string) {
  const clean = waPlain(value);
  return clean ? `~${clean}~` : "";
}

/** Tira link, frase genérica e título repetido. Mantém só o que o anúncio realmente diz. */
export function cleanShareDescription(title: string, description: string) {
  const titleNorm = waPlain(title).toLowerCase();
  return description
    .replace(/🔗\s*/g, "")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\bwa\.me\/\S+/gi, "")
    .replace(/^Produto\s*[-–—]\s*Saiba Mais.*$/gim, "")
    .replace(/\bSaiba Mais(?:\s+Detalhes)?\b/gi, "")
    .replace(/\bEntre em contato com a nossa equipe[^.]*\./gi, "")
    .replace(/\bpara obter mais informações[^.]*\./gi, "")
    .replace(/\besclarecer suas dúvidas[^.]*\./gi, "")
    .replace(/^Chame no WhatsApp e garanta o seu!?\s*$/gim, "")
    .replace(/^Por\s+R\$\s?.+$/gim, "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && waPlain(line).toLowerCase() !== titleNorm)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function shareHashtags(raw: SharePost["hashtags"]) {
  const list = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(/[\s,]+/) : [];
  return list
    .map((tag) => tag.replace(/^#/, "").trim())
    .filter((tag) => tag.length >= 2 && tag.length <= 30 && !GENERIC_TAGS.has(tag.toLowerCase()))
    .slice(0, 6)
    .map((tag) => `#${tag.replace(/\s+/g, "")}`);
}

/**
 * Mensagem de WhatsApp no formato de vitrine:
 * loja, título e preço em destaque, texto e hashtags.
 */
export function formatWhatsAppPost(post: SharePost, options?: { includeStore?: boolean }) {
  const title = waPlain(post.title);
  const description = cleanShareDescription(title, post.description || "").slice(0, 700);
  const tags = shareHashtags(post.hashtags);
  const lines: string[] = [];
  const store = waPlain(post.storeName || "");
  if (options?.includeStore !== false && store) {
    lines.push(waBold(store.toLocaleUpperCase("pt-BR")), "");
  }
  if (title) lines.push(waBold(title));
  const price = waPlain(post.priceLabel || "");
  const compare = waPlain(post.compareAtLabel || "");
  if (compare && price && compare !== price) {
    lines.push("", waStrike(compare), waBold(price));
  } else if (price) {
    lines.push("", waBold(price));
  }
  if (description) lines.push("", description);
  if (tags.length) lines.push("", tags.join(" "));
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, 1200);
}

export function formatWhatsAppBundle(posts: SharePost[]) {
  return posts
    .map((post, index) => formatWhatsAppPost(post, { includeStore: index === 0 }))
    .filter(Boolean)
    .join("\n\n────────────\n\n");
}

/** Tira o negrito/riscado do WhatsApp para Instagram e Facebook. */
export function plainShareText(text: string) {
  return text
    .replace(/^\*([^*\n]+)\*$/gm, "$1")
    .replace(/^~([^~\n]+)~$/gm, "$1")
    .replace(/^────────────$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
