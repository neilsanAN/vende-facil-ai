export type DetectedKind = "IMAGE" | "AUDIO" | "VIDEO";

const IMAGE = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const AUDIO = new Set(["audio/mpeg", "audio/wav", "audio/mp4"]);
const VIDEO = new Set(["video/mp4", "video/webm"]);

export function detectMime(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (buffer.length >= 6 && (buffer.subarray(0, 6).toString("ascii") === "GIF87a" || buffer.subarray(0, 6).toString("ascii") === "GIF89a")) return "image/gif";
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WAVE") return "audio/wav";
  if (buffer.length >= 3 && buffer.subarray(0, 3).toString("ascii") === "ID3") return "audio/mpeg";
  const second = buffer[1];
  if (buffer.length >= 2 && buffer[0] === 0xff && second !== undefined && (second & 0xe0) === 0xe0) return "audio/mpeg";
  if (buffer.length >= 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = buffer.subarray(8, 12).toString("ascii");
    if (brand.startsWith("qt") || brand === "M4A " || brand === "M4B ") return "audio/mp4";
    return "video/mp4";
  }
  if (buffer.length >= 4 && buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) return "video/webm";
  return null;
}

export function assertAllowedUpload(input: {
  declaredMime: string;
  detectedMime: string | null;
  sizeBytes: number;
  kind: DetectedKind;
  limits: { image: number; audio: number; video: number };
}) {
  if (!input.detectedMime) {
    throw new Error("Não foi possível confirmar o tipo real do arquivo.");
  }
  const allowed = input.kind === "IMAGE" ? IMAGE : input.kind === "AUDIO" ? AUDIO : VIDEO;
  if (!allowed.has(input.detectedMime)) {
    throw new Error("Tipo de arquivo não permitido.");
  }
  if (input.declaredMime !== input.detectedMime && !(input.declaredMime === "audio/mp3" && input.detectedMime === "audio/mpeg")) {
    throw new Error("O conteúdo do arquivo não corresponde ao tipo informado.");
  }
  const max = input.kind === "IMAGE" ? input.limits.image : input.kind === "AUDIO" ? input.limits.audio : input.limits.video;
  if (input.sizeBytes > max) throw new Error("O arquivo excede o tamanho permitido.");
}

export function extensionForMime(mime: string) {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "audio/mpeg":
      return "mp3";
    case "audio/wav":
      return "wav";
    case "audio/mp4":
      return "m4a";
    case "video/mp4":
      return "mp4";
    case "video/webm":
      return "webm";
    default:
      return "bin";
  }
}
