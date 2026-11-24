import { randomInt } from "node:crypto";
import { log } from "@vendefacil/config";
import { AppError } from "./errors";

export type AuthMailPurpose = "verify_email" | "reset_password";

function mailConfigured() {
  return Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST || process.env.SMTP_URL);
}

function mailFrom() {
  return process.env.MAIL_FROM || process.env.SMTP_FROM || "VendeFácil AI <onboarding@resend.dev>";
}

export function generateOtpCode() {
  return String(randomInt(100000, 999999));
}

export async function sendAuthCode(input: { to: string; code: string; purpose: AuthMailPurpose }) {
  const subject =
    input.purpose === "verify_email" ? "Seu código VendeFácil AI" : "Código para redefinir a senha — VendeFácil AI";
  const title = input.purpose === "verify_email" ? "Confirme seu e-mail" : "Redefinir senha";
  const html = `
      <div style="font-family:Segoe UI,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#171827">
        <h1 style="font-size:22px;margin:0 0 8px">${title}</h1>
        <p style="color:#6B7288;line-height:1.5">Use o código abaixo no VendeFácil AI. Ele expira em 15 minutos.</p>
        <div style="margin:24px 0;padding:20px;background:#F5F6FA;border-radius:16px;text-align:center">
          <span style="font-size:32px;letter-spacing:8px;font-weight:800;color:#7C5CFF">${input.code}</span>
        </div>
        <p style="font-size:13px;color:#98A2B3">Se você não solicitou, ignore este e-mail.</p>
      </div>
    `;
  const text = `${title}\n\nCódigo: ${input.code}\nVálido por 15 minutos.`;

  if (!mailConfigured()) {
    if (process.env.NODE_ENV === "production") {
      log("error", "email.unconfigured", { purpose: input.purpose, to: input.to });
      throw new AppError("MAIL_UNAVAILABLE", "Não foi possível enviar o e-mail. Tente novamente mais tarde.", 503);
    }
    log("warn", "email.dev_code", { purpose: input.purpose, to: input.to, code: input.code });
    return { delivered: false as const, code: input.code };
  }

  await deliverEmail({ to: input.to, subject, html, text });
  return { delivered: true as const, code: null };
}

export async function deliverEmail(input: { to: string; subject: string; text: string; html?: string }) {
  if (!mailConfigured()) {
    log("info", "email.skipped", { to: input.to, subject: input.subject });
    return { delivered: false as const };
  }

  if (process.env.RESEND_API_KEY) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: mailFrom(),
        to: [input.to],
        subject: input.subject,
        html: input.html || `<pre style="font-family:Segoe UI,Arial,sans-serif">${input.text}</pre>`,
        text: input.text,
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      log("error", "email.resend_failed", { status: response.status, body: body.slice(0, 300) });
      throw new AppError("MAIL_UNAVAILABLE", "Não foi possível enviar o e-mail. Tente novamente.", 503);
    }
    return { delivered: true as const };
  }

  const nodemailer = await import("nodemailer");
  const transport = process.env.SMTP_URL
    ? nodemailer.createTransport(process.env.SMTP_URL)
    : nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === "true" || Number(process.env.SMTP_PORT || 587) === 465,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      });

  await transport.sendMail({
    from: mailFrom(),
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
  return { delivered: true as const };
}
