import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

function key(hex: string) {
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) throw new Error("Chave de criptografia inválida.");
  return Buffer.from(hex, "hex");
}

export function sealJson(value: unknown, keyHex: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(keyHex), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${data.toString("base64url")}`;
}

export function openJson<T>(payload: string, keyHex: string): T {
  const [version, iv, tag, data] = payload.split(".");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Credencial protegida inválida.");
  const decipher = createDecipheriv("aes-256-gcm", key(keyHex), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  const plain = Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]);
  return JSON.parse(plain.toString("utf8")) as T;
}

export function signPayload(payload: string, keyHex: string) {
  return createHmac("sha256", key(keyHex)).update(`upload-v1:${payload}`).digest("base64url");
}

export function verifyPayload(payload: string, signature: string, keyHex: string) {
  const expected = signPayload(payload, keyHex);
  const left = Buffer.from(expected);
  const right = Buffer.from(signature);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function verifyMercadoPagoSignature(input: {
  secret: string;
  signatureHeader: string | null;
  requestId: string | null;
  dataId: string | null;
}) {
  if (!input.secret || !input.signatureHeader || !input.requestId || !input.dataId) return false;
  const parts = Object.fromEntries(
    input.signatureHeader.split(",").map((part) => {
      const [name, ...rest] = part.split("=");
      return [name?.trim() || "", rest.join("=").trim()];
    }),
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;
  const manifest = `id:${input.dataId.toLowerCase()};request-id:${input.requestId};ts:${ts};`;
  const expected = createHmac("sha256", input.secret).update(manifest).digest("hex");
  const left = Buffer.from(expected);
  const right = Buffer.from(v1);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
