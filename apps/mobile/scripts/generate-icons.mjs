// Gera os ícones do app a partir do símbolo da marca (sacola + brilho de IA).
// Uso: node apps/mobile/scripts/generate-icons.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "assets");
mkdirSync(out, { recursive: true });

const SIZE = 1024;
const CENTER = { x: 543, y: 516 };

const defs = `
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#9D7DFF"/>
    <stop offset="0.55" stop-color="#7C5CFF"/>
    <stop offset="1" stop-color="#4F22D9"/>
  </linearGradient>
  <radialGradient id="glow" cx="0.22" cy="0.12" r="0.75">
    <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.28"/>
    <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="spark" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#8E6BFF"/>
    <stop offset="1" stop-color="#5326E0"/>
  </linearGradient>
  <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#2A0E8F" flood-opacity="0.35"/>
  </filter>`;

const star = (cx, cy, r) =>
  `M${cx} ${cy - r} Q${cx} ${cy} ${cx + r} ${cy} Q${cx} ${cy} ${cx} ${cy + r} Q${cx} ${cy} ${cx - r} ${cy} Q${cx} ${cy} ${cx} ${cy - r} Z`;

const bagBody =
  "M334 412 H690 Q722 412 726 444 L758 750 Q763 800 712 800 H312 Q261 800 266 750 L298 444 Q302 412 334 412 Z";
const bagHandle = "M404 424 V364 A108 108 0 0 1 620 364 V424";

/** Símbolo colorido: sacola branca, brilho roxo no centro e brilhos brancos. */
function glyph(scale) {
  return `
  <g transform="translate(${SIZE / 2} ${SIZE / 2}) scale(${scale}) translate(${-CENTER.x} ${-CENTER.y})">
    <g filter="url(#shadow)">
      <path d="${bagHandle}" fill="none" stroke="#FFFFFF" stroke-width="46" stroke-linecap="round"/>
      <path d="${bagBody}" fill="#FFFFFF"/>
    </g>
    <path d="${star(512, 612, 118)}" fill="url(#spark)"/>
    <path d="${star(770, 292, 64)}" fill="#FFFFFF"/>
    <path d="${star(838, 398, 30)}" fill="#FFFFFF" fill-opacity="0.85"/>
  </g>`;
}

/** Símbolo de uma cor só (ícone temático do Android 13+): brilho central vazado. */
function monoGlyph(scale) {
  return `
  <mask id="cut">
    <rect width="${SIZE}" height="${SIZE}" fill="white"/>
    <path d="${star(512, 612, 118)}" fill="black"/>
  </mask>
  <g transform="translate(${SIZE / 2} ${SIZE / 2}) scale(${scale}) translate(${-CENTER.x} ${-CENTER.y})">
    <g mask="url(#cut)">
      <path d="${bagHandle}" fill="none" stroke="#FFFFFF" stroke-width="46" stroke-linecap="round"/>
      <path d="${bagBody}" fill="#FFFFFF"/>
    </g>
    <path d="${star(770, 292, 64)}" fill="#FFFFFF"/>
    <path d="${star(838, 398, 30)}" fill="#FFFFFF"/>
  </g>`;
}

const svg = (body, extraDefs = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}"><defs>${defs}${extraDefs}</defs>${body}</svg>`;

const background = `<rect width="${SIZE}" height="${SIZE}" fill="url(#bg)"/><rect width="${SIZE}" height="${SIZE}" fill="url(#glow)"/>`;

const files = {
  // iOS / ícone geral: quadrado cheio (o sistema arredonda).
  "icon.png": svg(`${background}${glyph(0.95)}`),
  // Android adaptativo: símbolo dentro da área segura (66% central).
  "adaptive-icon.png": svg(glyph(0.66)),
  "adaptive-icon-background.png": svg(background),
  "adaptive-icon-monochrome.png": svg(monoGlyph(0.66)),
  // Splash: ícone arredondado sobre fundo escuro da marca.
  "splash-icon.png": svg(
    `<clipPath id="r"><rect width="${SIZE}" height="${SIZE}" rx="230"/></clipPath><g clip-path="url(#r)">${background}${glyph(0.95)}</g>`,
  ),
};

for (const [name, content] of Object.entries(files)) {
  await sharp(Buffer.from(content)).png().toFile(join(out, name));
  console.log("ok", name);
}

await sharp(Buffer.from(files["icon.png"])).resize(196, 196).png().toFile(join(out, "favicon.png"));
writeFileSync(join(out, "icon.svg"), files["icon.png"]);
console.log("ok favicon.png, icon.svg");
