import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { Prisma, PrismaClient } from "@prisma/client";
import type { CreditKind, PlanLimits } from "@vendefacil/types";
import { isPlanLimits } from "@vendefacil/types";
import { AppError } from "./errors";

const scryptAsync = promisify(scrypt);
type Db = PrismaClient | Prisma.TransactionClient;

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [algo, salt, hex] = stored.split("$");
  if (algo !== "scrypt" || !salt || !hex) return false;
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  const current = Buffer.from(hex, "hex");
  if (current.length !== derived.length) return false;
  return timingSafeEqual(current, derived);
}

export function newToken() {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function slugify(input: string) {
  const slug = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "item";
}

const RESERVED = new Set(["admin", "api", "app", "entrar", "cadastro", "v", "inicio", "produtos", "estudio"]);

export function assertPublicSlug(slug: string) {
  if (RESERVED.has(slug)) throw new AppError("SLUG_RESERVED", "Escolha outro nome para a loja.", 422);
}

export async function uniqueSlug(base: string, taken: (slug: string) => Promise<boolean>) {
  const root = slugify(base);
  let slug = root;
  let index = 2;
  while (await taken(slug)) {
    slug = `${root.slice(0, 42)}-${index}`;
    index += 1;
  }
  return slug;
}

export function nextBalance(balance: number, amount: number) {
  const next = balance + amount;
  if (next < 0) throw new AppError("INSUFFICIENT_CREDITS", "Créditos insuficientes para esta ação.", 402);
  return next;
}

export function parseLimits(value: unknown): PlanLimits {
  if (!isPlanLimits(value)) throw new AppError("PLAN_INVALID", "Os limites do plano estão incompletos.", 500);
  return value;
}

export function assertGroundedCopy(text: string, priceConfirmed: boolean) {
  if (!priceConfirmed && /R\$\s?\d|\d+[\.,]?\d*\s?reais/i.test(text)) {
    throw new AppError("AI_UNGROUNDED", "A IA citou preço sem confirmação. Informe o preço ou edite o texto.", 422);
  }
}

export function whatsAppLink(phone: string, text: string) {
  const message = encodeURIComponent(text);
  let digits = phone.replace(/\D/g, "");
  if (!digits) return `https://wa.me/?text=${message}`;
  if (digits.length <= 11) digits = `55${digits}`;
  return `https://wa.me/${digits}?text=${message}`;
}

export function visitorHash(ip: string, userAgent: string, secret: string) {
  const day = new Date().toISOString().slice(0, 10);
  return createHash("sha256").update(`${secret}|${day}|${ip}|${userAgent}`).digest("hex").slice(0, 32);
}

export async function applyCredit(
  db: Db,
  input: {
    organizationId: string;
    walletId: string;
    amount: number;
    reason: string;
    idempotencyKey: string;
    referenceType?: string;
    referenceId?: string;
  },
) {
  const locked = await db.$queryRaw<Array<{ id: string; balance: number }>>`
    SELECT id, balance FROM "CreditWallet" WHERE id = ${input.walletId}::uuid FOR UPDATE
  `;
  const wallet = locked[0];
  if (!wallet) throw new AppError("NOT_FOUND", "Carteira de créditos não encontrada.", 404);
  const existing = await db.creditTransaction.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) return { transaction: existing, replay: true as const };
  const balanceAfter = nextBalance(wallet.balance, input.amount);
  await db.creditWallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } });
  try {
    const transaction = await db.creditTransaction.create({
      data: {
        organizationId: input.organizationId,
        walletId: wallet.id,
        amount: input.amount,
        balanceAfter,
        reason: input.reason,
        idempotencyKey: input.idempotencyKey,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
      },
    });
    return { transaction, replay: false as const };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "P2002") {
      const replay = await db.creditTransaction.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
      if (replay) return { transaction: replay, replay: true as const };
    }
    throw error;
  }
}

export async function debitKind(
  db: PrismaClient,
  input: { organizationId: string; kind: CreditKind; amount: number; reason: string; idempotencyKey: string; referenceType?: string; referenceId?: string },
) {
  return db.$transaction(async (tx) => {
    const wallet = await tx.creditWallet.findUnique({
      where: { organizationId_kind: { organizationId: input.organizationId, kind: input.kind } },
    });
    if (!wallet) throw new AppError("NOT_FOUND", "Carteira de créditos não encontrada.", 404);
    return applyCredit(tx, { ...input, walletId: wallet.id, amount: -Math.abs(input.amount) });
  });
}

export async function creditKind(
  db: PrismaClient,
  input: { organizationId: string; kind: CreditKind; amount: number; reason: string; idempotencyKey: string; referenceType?: string; referenceId?: string },
) {
  return db.$transaction(async (tx) => {
    const wallet = await tx.creditWallet.findUnique({
      where: { organizationId_kind: { organizationId: input.organizationId, kind: input.kind } },
    });
    if (!wallet) throw new AppError("NOT_FOUND", "Carteira de créditos não encontrada.", 404);
    return applyCredit(tx, { ...input, walletId: wallet.id, amount: Math.abs(input.amount) });
  });
}

export const INCLUDED_KINDS = ["ANNOUNCEMENT", "NARRATION", "RENDER"] as const;

export function allowanceFor(limits: PlanLimits, kind: (typeof INCLUDED_KINDS)[number] | "GENERATIVE_VIDEO") {
  if (kind === "ANNOUNCEMENT") return limits.announcementCredits;
  if (kind === "NARRATION") return limits.narrationCredits;
  if (kind === "RENDER") return limits.renderCredits;
  return limits.generativeVideoCredits;
}
