import { describe, expect, it } from "vitest";
import { detectMime, assertAllowedUpload } from "./mime";
import { buildSrt } from "./ffmpeg";
import { sealJson, openJson, verifyMercadoPagoSignature } from "./crypto";
import { createHmac } from "node:crypto";

describe("mime", () => {
  it("reconhece JPEG, PNG e rejeita conteúdo divergente", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x01]);
    expect(detectMime(jpeg)).toBe("image/jpeg");
    expect(() =>
      assertAllowedUpload({
        declaredMime: "image/png",
        detectedMime: "image/jpeg",
        sizeBytes: 10,
        kind: "IMAGE",
        limits: { image: 100, audio: 100, video: 100 },
      }),
    ).toThrow(/não corresponde/);
  });
});

describe("legendas", () => {
  it("alinha o tempo das cenas", () => {
    const srt = buildSrt([
      { durationMs: 1500, caption: "Primeira" },
      { durationMs: 2000, caption: "Segunda" },
    ]);
    expect(srt).toContain("00:00:00,000 --> 00:00:01,500");
    expect(srt).toContain("00:00:01,500 --> 00:00:03,500");
  });
});

describe("criptografia", () => {
  const key = "ab".repeat(32);

  it("sela e abre JSON", () => {
    const sealed = sealJson({ token: "abc" }, key);
    expect(openJson(sealed, key)).toEqual({ token: "abc" });
  });

  it("valida a assinatura do Mercado Pago", () => {
    const secret = "segredo";
    const manifest = "id:123;request-id:req;ts:10;";
    const v1 = createHmac("sha256", secret).update(manifest).digest("hex");
    expect(
      verifyMercadoPagoSignature({
        secret,
        signatureHeader: `ts=10,v1=${v1}`,
        requestId: "req",
        dataId: "123",
      }),
    ).toBe(true);
    expect(
      verifyMercadoPagoSignature({
        secret,
        signatureHeader: "ts=10,v1=00",
        requestId: "req",
        dataId: "123",
      }),
    ).toBe(false);
  });
});
