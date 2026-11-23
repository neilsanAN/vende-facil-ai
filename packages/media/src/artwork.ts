import sharp from "sharp";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const SIZES = {
  story: { width: 1080, height: 1920 },
  feed: { width: 1080, height: 1080 },
  portrait: { width: 1080, height: 1350 },
} as const;

export async function composeArtwork(input: {
  image: Buffer;
  template: keyof typeof SIZES;
  title: string;
  priceLabel: string;
  storeName: string;
  color: string;
}) {
  const size = SIZES[input.template];
  const photo = await sharp(input.image)
    .rotate()
    .resize(size.width, Math.round(size.height * 0.72), { fit: "cover", position: "centre" })
    .toBuffer();
  const title = escapeXml(input.title.slice(0, 72));
  const price = escapeXml(input.priceLabel.slice(0, 24));
  const store = escapeXml(input.storeName.slice(0, 40));
  const panelHeight = Math.round(size.height * 0.3);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${input.color}"/>
  <rect y="${size.height - panelHeight}" width="100%" height="${panelHeight}" fill="#ffffff"/>
  <text x="64" y="${size.height - panelHeight + 86}" font-family="Arial, DejaVu Sans, sans-serif" font-size="28" fill="#6B7280">${store}</text>
  <text x="64" y="${size.height - panelHeight + 156}" font-family="Arial, DejaVu Sans, sans-serif" font-size="52" font-weight="700" fill="#171827">${title}</text>
  <text x="64" y="${size.height - 88}" font-family="Arial, DejaVu Sans, sans-serif" font-size="42" font-weight="700" fill="#6336F5">${price}</text>
</svg>`;
  return sharp({ create: { width: size.width, height: size.height, channels: 3, background: input.color } })
    .composite([
      { input: photo, top: 0, left: 0 },
      { input: Buffer.from(svg), top: 0, left: 0 },
    ])
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
}

export async function derivativeImage(input: Buffer) {
  const image = sharp(input).rotate();
  const meta = await image.metadata();
  if (meta.hasAlpha) {
    return { buffer: await image.png().toBuffer(), mimeType: "image/png" };
  }
  return { buffer: await image.jpeg({ quality: 86, mozjpeg: true }).toBuffer(), mimeType: "image/jpeg" };
}

export async function imageMetadata(input: Buffer) {
  const meta = await sharp(input).metadata();
  return { width: meta.width ?? null, height: meta.height ?? null };
}
