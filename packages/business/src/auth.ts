import type { MemberRole, PlatformRole, PrismaClient } from "@prisma/client";
import { log } from "@vendefacil/config";
import { AppError } from "./errors";
import { hashPassword, hashToken, newToken, verifyPassword } from "./ledger";

export type SessionContext = {
  userId: string;
  name: string;
  email: string;
  platformRole: PlatformRole;
  emailVerified: boolean;
  organizationId: string | null;
  role: MemberRole | null;
  sessionId: string;
};

const ACCESS_MS = 7 * 24 * 60 * 60 * 1000;
const REFRESH_MS = 30 * 24 * 60 * 60 * 1000;

async function loadContext(db: PrismaClient, userId: string, sessionId: string): Promise<SessionContext> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.deletedAt) throw new AppError("UNAUTHENTICATED", "Sessão inválida.", 401);
  let role: MemberRole | null = null;
  if (user.activeOrganizationId) {
    const member = await db.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: user.activeOrganizationId, userId: user.id } },
    });
    role = member?.role ?? null;
    if (!member) {
      await db.user.update({ where: { id: user.id }, data: { activeOrganizationId: null } });
    }
  }
  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    platformRole: user.platformRole,
    emailVerified: Boolean(user.emailVerifiedAt),
    organizationId: role ? user.activeOrganizationId : null,
    role,
    sessionId,
  };
}

export class AuthService {
  constructor(private db: PrismaClient) {}

  async register(input: { name: string; email: string; password: string }) {
    const existing = await this.db.user.findUnique({ where: { email: input.email } });
    if (existing) throw new AppError("EMAIL_IN_USE", "Já existe uma conta com este e-mail.", 409);
    const user = await this.db.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: await hashPassword(input.password),
        termsAcceptedAt: new Date(),
        privacyAcceptedAt: new Date(),
      },
    });
    const raw = newToken();
    await this.db.emailToken.create({
      data: {
        userId: user.id,
        email: user.email,
        purpose: "VERIFY_EMAIL",
        tokenHash: hashToken(raw),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    const session = await this.issue(user.id);
    return { userId: user.id, email: user.email, verificationToken: raw, ...session };
  }

  async login(input: { email: string; password: string; userAgent?: string; ip?: string }) {
    const user = await this.db.user.findUnique({ where: { email: input.email } });
    const valid = user ? await verifyPassword(input.password, user.passwordHash) : false;
    if (!user || user.deletedAt || !valid) {
      throw new AppError("INVALID_CREDENTIALS", "E-mail ou senha incorretos.", 401);
    }
    if (!user.emailVerifiedAt) {
      throw new AppError("EMAIL_UNVERIFIED", "Confirme seu e-mail antes de entrar.", 403);
    }
    return this.issue(user.id, input);
  }

  private async issue(userId: string, meta?: { userAgent?: string; ip?: string }) {
    const accessToken = newToken();
    const refreshToken = newToken();
    const session = await this.db.session.create({
      data: {
        userId,
        accessTokenHash: hashToken(accessToken),
        refreshTokenHash: hashToken(refreshToken),
        accessExpiresAt: new Date(Date.now() + ACCESS_MS),
        refreshExpiresAt: new Date(Date.now() + REFRESH_MS),
        userAgent: meta?.userAgent?.slice(0, 180),
        ip: meta?.ip?.slice(0, 64),
      },
    });
    return { accessToken, refreshToken, sessionId: session.id, accessExpiresAt: session.accessExpiresAt, refreshExpiresAt: session.refreshExpiresAt };
  }

  async fromAccess(token: string | null | undefined) {
    if (!token) return null;
    const session = await this.db.session.findUnique({ where: { accessTokenHash: hashToken(token) } });
    if (!session || session.revokedAt || session.accessExpiresAt < new Date()) return null;
    return loadContext(this.db, session.userId, session.id);
  }

  async refresh(refreshToken: string, meta?: { userAgent?: string; ip?: string }) {
    const current = await this.db.session.findUnique({ where: { refreshTokenHash: hashToken(refreshToken) } });
    if (!current) throw new AppError("UNAUTHENTICATED", "Sessão expirada.", 401);
    if (current.revokedAt || current.refreshExpiresAt < new Date()) {
      if (current.replacedById) {
        await this.db.session.updateMany({ where: { userId: current.userId, revokedAt: null }, data: { revokedAt: new Date() } });
      }
      throw new AppError("UNAUTHENTICATED", "Sessão expirada. Entre novamente.", 401);
    }
    const next = await this.issue(current.userId, meta);
    await this.db.session.update({
      where: { id: current.id },
      data: { revokedAt: new Date(), replacedById: next.sessionId },
    });
    return next;
  }

  async logout(accessToken: string | null | undefined) {
    if (!accessToken) return;
    await this.db.session.updateMany({
      where: { accessTokenHash: hashToken(accessToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async verifyEmail(token: string) {
    const row = await this.db.emailToken.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!row || row.purpose !== "VERIFY_EMAIL" || !row.userId) {
      throw new AppError("TOKEN_INVALID", "Link de verificação inválido.", 400);
    }
    const user = await this.db.user.findUnique({ where: { id: row.userId } });
    if (!user) throw new AppError("TOKEN_INVALID", "Link de verificação inválido.", 400);
    if (row.usedAt) {
      if (user.emailVerifiedAt) return { already: true, userId: user.id };
      throw new AppError("TOKEN_INVALID", "Este link já foi usado.", 400);
    }
    if (row.expiresAt < new Date()) throw new AppError("TOKEN_EXPIRED", "O link expirou. Solicite outro.", 400);
    await this.db.$transaction([
      this.db.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } }),
      this.db.emailToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    ]);
    return { already: false, userId: user.id };
  }

  async resendVerification(userId: string) {
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user || user.emailVerifiedAt) return null;
    const raw = newToken();
    await this.db.emailToken.create({
      data: {
        userId: user.id,
        email: user.email,
        purpose: "VERIFY_EMAIL",
        tokenHash: hashToken(raw),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    return { email: user.email, verificationToken: raw };
  }

  async forgotPassword(email: string) {
    const user = await this.db.user.findUnique({ where: { email } });
    if (!user || user.deletedAt) return null;
    const raw = newToken();
    await this.db.emailToken.create({
      data: {
        userId: user.id,
        email: user.email,
        purpose: "RESET_PASSWORD",
        tokenHash: hashToken(raw),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    return { email: user.email, token: raw };
  }

  async resetPassword(token: string, password: string) {
    const row = await this.db.emailToken.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!row || row.purpose !== "RESET_PASSWORD" || row.usedAt || row.expiresAt < new Date() || !row.userId) {
      throw new AppError("TOKEN_INVALID", "Link de redefinição inválido ou expirado.", 400);
    }
    await this.db.$transaction([
      this.db.user.update({ where: { id: row.userId }, data: { passwordHash: await hashPassword(password) } }),
      this.db.emailToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
      this.db.session.updateMany({ where: { userId: row.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
  }

  async changePassword(userId: string, currentPassword: string, password: string, sessionId: string) {
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
      throw new AppError("INVALID_CREDENTIALS", "A senha atual está incorreta.", 401);
    }
    await this.db.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(password) } });
    await this.db.session.updateMany({
      where: { userId, revokedAt: null, id: { not: sessionId } },
      data: { revokedAt: new Date() },
    });
  }

  async sessions(userId: string, currentSessionId: string) {
    const rows = await this.db.session.findMany({
      where: { userId, revokedAt: null, refreshExpiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt,
      ip: row.ip,
      userAgent: row.userAgent,
      current: row.id === currentSessionId,
    }));
  }

  async revoke(userId: string, sessionId: string) {
    await this.db.session.updateMany({ where: { id: sessionId, userId }, data: { revokedAt: new Date() } });
  }

  async hitLoginLimit(key: string) {
    const now = new Date();
    const bucket = await this.db.rateLimitBucket.findUnique({ where: { key } });
    if (!bucket || bucket.resetAt < now) {
      await this.db.rateLimitBucket.upsert({
        where: { key },
        create: { key, hits: 1, resetAt: new Date(now.getTime() + 15 * 60 * 1000) },
        update: { hits: 1, resetAt: new Date(now.getTime() + 15 * 60 * 1000) },
      });
      return;
    }
    if (bucket.hits >= 8) throw new AppError("RATE_LIMITED", "Muitas tentativas de entrada. Aguarde alguns minutos.", 429);
    await this.db.rateLimitBucket.update({ where: { key }, data: { hits: { increment: 1 } } });
  }
}

export async function deliverEmail(input: { to: string; subject: string; text: string }) {
  if (!process.env.SMTP_HOST) {
    log("info", "email.skipped", { to: input.to, subject: input.subject });
    return { delivered: false as const };
  }
  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  await transport.sendMail({ from: process.env.SMTP_FROM, to: input.to, subject: input.subject, text: input.text });
  return { delivered: true as const };
}
