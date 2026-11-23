import { describe, expect, it } from "vitest";
import { canTransition, isRetryable, nextRetryDelayMs } from "./pipeline";
import { assertGroundedCopy, nextBalance, slugify } from "./ledger";
import { AppError } from "./errors";
import { assertMinRole } from "./permissions";

describe("pipeline", () => {
  it("segue a ordem e bloqueia salto para concluído", () => {
    expect(canTransition("CREATED", "VALIDATING")).toBe(true);
    expect(canTransition("RENDERING", "COMPLETED")).toBe(false);
    expect(canTransition("UPLOADING", "COMPLETED")).toBe(true);
  });

  it("aumenta o intervalo até o teto", () => {
    expect(nextRetryDelayMs(1)).toBe(60_000);
    expect(nextRetryDelayMs(2)).toBe(120_000);
    expect(nextRetryDelayMs(8)).toBe(15 * 60_000);
  });

  it("não repete falta de configuração", () => {
    expect(isRetryable(new AppError("PROVIDER_NOT_CONFIGURED", "x", 503))).toBe(false);
    expect(isRetryable(new Error("rede"))).toBe(true);
  });
});

describe("créditos e texto", () => {
  it("impede saldo negativo", () => {
    expect(nextBalance(5, -2)).toBe(3);
    expect(() => nextBalance(1, -2)).toThrow(AppError);
  });

  it("recusa preço inventado", () => {
    expect(() => assertGroundedCopy("Por apenas R$ 20", false)).toThrow(/preço/);
    expect(() => assertGroundedCopy("Por apenas R$ 20", true)).not.toThrow();
  });

  it("normaliza slug", () => {
    expect(slugify("Fone Bluetooth Premium")).toBe("fone-bluetooth-premium");
  });
});

describe("permissões", () => {
  it("separa leitura e administração", () => {
    expect(() => assertMinRole("VIEWER", "EDITOR")).toThrow(AppError);
    expect(() => assertMinRole("ADMIN", "EDITOR")).not.toThrow();
  });
});
