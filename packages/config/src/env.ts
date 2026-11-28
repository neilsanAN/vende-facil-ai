import { createHash } from "node:crypto";
import { z } from "zod";

const INSECURE_KEYS = new Set([
  "0123456789abcdeffedcba98765432100123456789abcdeffedcba9876543210",
  "00".repeat(32),
]);

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  /** Origens extras permitidas (app Expo web no Render, etc). Separadas por vírgula. */
  CORS_ORIGINS: z.string().optional().default(""),
  DATABASE_URL: z.string().min(1),
  ENCRYPTION_KEY: z
    .string()
    .min(16)
    .transform((value) => (/^[0-9a-fA-F]{64}$/.test(value) ? value.toLowerCase() : createHash("sha256").update(value).digest("hex"))),
  STORAGE_DRIVER: z.enum(["local", "r2"]).default("local"),
  STORAGE_LOCAL_DIR: z.string().default("storage"),
  R2_ACCOUNT_ID: z.string().optional().default(""),
  R2_ACCESS_KEY_ID: z.string().optional().default(""),
  R2_SECRET_ACCESS_KEY: z.string().optional().default(""),
  R2_BUCKET_PRIVATE: z.string().optional().default(""),
  R2_BUCKET_PUBLIC: z.string().optional().default(""),
  R2_ENDPOINT: z.string().optional().default(""),
  R2_PUBLIC_BASE_URL: z.string().optional().default(""),
  GEMINI_API_KEY: z.string().optional().default(""),
  GEMINI_TEXT_MODEL: z.string().default("gemini-3.6-flash"),
  GEMINI_VISION_MODEL: z.string().default("gemini-3.6-flash"),
  GEMINI_IMAGE_MODEL: z.string().default("gemini-2.5-flash-image"),
  OPENAI_API_KEY: z.string().optional().default(""),
  OPENAI_TEXT_MODEL: z.string().default("gpt-4o-mini"),
  OPENAI_VISION_MODEL: z.string().default("gpt-4o-mini"),
  OPENAI_TTS_MODEL: z.string().default("tts-1"),
  ELEVENLABS_API_KEY: z.string().optional().default(""),
  ELEVENLABS_MODEL: z.string().default("eleven_multilingual_v2"),
  VIDEO_GEN_API_URL: z.string().optional().default(""),
  VIDEO_GEN_API_KEY: z.string().optional().default(""),
  FFMPEG_PATH: z.string().default("ffmpeg"),
  FONT_PATH: z.string().optional().default(""),
  MERCADOPAGO_ACCESS_TOKEN: z.string().optional().default(""),
  MERCADOPAGO_WEBHOOK_SECRET: z.string().optional().default(""),
  RESEND_API_KEY: z.string().optional().default(""),
  SMTP_HOST: z.string().optional().default(""),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASS: z.string().optional().default(""),
  SMTP_URL: z.string().optional().default(""),
  SMTP_SECURE: z.enum(["true", "false"]).optional().default("false"),
  SMTP_FROM: z.string().default("VendeFacil AI <nao-responda@localhost>"),
  MAIL_FROM: z.string().optional().default(""),
  ADMIN_EMAIL: z.string().optional().default(""),
  ADMIN_PASSWORD: z.string().optional().default(""),
  FACEBOOK_APP_ID: z.string().optional().default(""),
  FACEBOOK_APP_SECRET: z.string().optional().default(""),
  TRUST_PROXY: z.enum(["true", "false"]).default("false"),
  MAX_IMAGE_BYTES: z.coerce.number().default(10 * 1024 * 1024),
  MAX_AUDIO_BYTES: z.coerce.number().default(15 * 1024 * 1024),
  MAX_VIDEO_BYTES: z.coerce.number().default(100 * 1024 * 1024),
});

export type AppConfig = z.infer<typeof schema>;

let cached: AppConfig | null = null;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  if (cached && env === process.env) return cached;
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Configuração inválida. ${message}`);
  }
  const config = parsed.data;
  if (config.NODE_ENV === "production") {
    if (INSECURE_KEYS.has(config.ENCRYPTION_KEY.toLowerCase())) {
      throw new Error("ENCRYPTION_KEY de exemplo não pode ser usada em produção.");
    }
    if (!config.APP_URL.startsWith("https://")) {
      throw new Error("APP_URL precisa de HTTPS em produção.");
    }
  }
  if (config.STORAGE_DRIVER === "r2") {
    const endpoint =
      config.R2_ENDPOINT ||
      (config.R2_ACCOUNT_ID ? `https://${config.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : "");
    const resolved: AppConfig = { ...config, R2_ENDPOINT: endpoint };
    const missing = (
      [
        ["R2_ACCESS_KEY_ID", resolved.R2_ACCESS_KEY_ID],
        ["R2_SECRET_ACCESS_KEY", resolved.R2_SECRET_ACCESS_KEY],
        ["R2_BUCKET_PRIVATE", resolved.R2_BUCKET_PRIVATE],
        ["R2_BUCKET_PUBLIC", resolved.R2_BUCKET_PUBLIC],
        ["R2_ENDPOINT", resolved.R2_ENDPOINT],
      ] as const
    )
      .filter(([, value]) => !value)
      .map(([key]) => key);
    if (missing.length) {
      throw new Error(`Storage R2 incompleto: ${missing.join(", ")}. Crie 2 buckets e um token S3 no Cloudflare R2.`);
    }
    if (env === process.env) cached = resolved;
    return resolved;
  }
  if (env === process.env) cached = config;
  return config;
}

export function resetConfigCache() {
  cached = null;
}
