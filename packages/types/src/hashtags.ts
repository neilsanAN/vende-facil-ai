/** Normaliza hashtags vindas da IA, formulário ou texto livre. */
export function normalizeHashtags(raw: unknown, fallbackName = ""): string[] {
  let tags: string[] = [];
  if (Array.isArray(raw)) {
    tags = raw.map((tag) => String(tag));
  } else if (typeof raw === "string") {
    tags = raw.split(/[,;#\n]+|\s+/);
  }

  const cleaned = [
    ...new Set(
      tags
        .map((tag) => tag.replace(/^#+/, "").replace(/\s+/g, "").trim())
        .filter((tag) => tag.length >= 2 && tag.length <= 30),
    ),
  ].slice(0, 12);

  if (cleaned.length) return cleaned;

  const fromName = fallbackName
    .split(/\s+/)
    .map((part) => part.replace(/[^0-9A-Za-zÀ-ÿ]/gi, ""))
    .filter((part) => part.length >= 3)
    .slice(0, 4)
    .map((part) => part.toLowerCase());

  return [...new Set([...fromName, "loja", "oferta"])].slice(0, 8);
}

export function formatHashtag(tag: string) {
  const clean = tag.replace(/^#+/, "").trim();
  return clean ? `#${clean}` : "";
}
