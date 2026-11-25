import { z } from "zod";
import {
  AD_TONES,
  ASPECT_RATIOS,
  MOTION_MODES,
  ORDER_ORIGINS,
  ORDER_STATUSES,
  PRODUCT_STATUSES,
  SOCIAL_PROVIDERS,
  TRANSITIONS,
  VIDEO_DURATIONS,
  VIDEO_OBJECTIVES,
  VIDEO_STYLES,
  VOICE_STYLES,
  normalizeHashtags,
} from "@vendefacil/types";

export const emailSchema = z.string().trim().email("Informe um e-mail válido.").max(180).transform((value) => value.toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, "A senha precisa ter ao menos 8 caracteres.")
  .max(128)
  .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), "Use letras e números na senha.");

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  password: passwordSchema,
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "Aceite os termos e a política de privacidade." }) }),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const forgotSchema = z.object({ email: emailSchema });

export const resetSchema = z.object({
  token: z.string().min(20),
  password: passwordSchema,
});

export const otpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Informe o código de 6 dígitos.");

export const verifySchema = z.object({
  email: emailSchema,
  code: otpCodeSchema,
});

export const resendVerificationSchema = z.object({
  email: emailSchema,
});

export const onboardingSchema = z.object({
  storeName: z.string().trim().min(2).max(80),
  description: z.string().trim().max(400).optional().default(""),
  whatsapp: z.string().trim().max(20).optional().default(""),
});

export const variantSchema = z.object({
  name: z.string().trim().min(1).max(80),
  sku: z.string().trim().max(60).optional().default(""),
  priceCents: z.number().int().nonnegative().nullable().optional(),
  stockQuantity: z.number().int().nonnegative().nullable().optional(),
});

export const productSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(4000).optional().default(""),
  priceCents: z.number().int().nonnegative(),
  promoPriceCents: z.number().int().nonnegative().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  sku: z.string().trim().max(60).optional().default(""),
  stockQuantity: z.number().int().nonnegative().nullable().optional(),
  trackStock: z.boolean().optional().default(false),
  status: z.enum(PRODUCT_STATUSES).optional().default("DRAFT"),
  published: z.boolean().optional().default(false),
  variants: z.array(variantSchema).max(30).optional().default([]),
}).superRefine((value, ctx) => {
  if (value.promoPriceCents != null && value.promoPriceCents >= value.priceCents) {
    ctx.addIssue({ code: "custom", path: ["promoPriceCents"], message: "O preço promocional precisa ser menor que o preço." });
  }
});

export const productListSchema = z.object({
  q: z.string().trim().max(80).optional().default(""),
  status: z.enum(PRODUCT_STATUSES).optional(),
  categoryId: z.string().uuid().optional(),
  published: z.enum(["true", "false"]).optional(),
  sort: z.enum(["recent", "price_asc", "price_desc", "name"]).optional().default("recent"),
  page: z.preprocess((value) => value == null || value === "" ? 1 : value, z.coerce.number().int().min(1)),
  pageSize: z.preprocess((value) => value == null || value === "" ? 20 : value, z.coerce.number().int().min(1).max(50)),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(40),
});

export const uploadRequestSchema = z.object({
  mimeType: z.string().min(3).max(120),
  sizeBytes: z.number().int().positive(),
  kind: z.enum(["IMAGE", "VIDEO", "AUDIO"]),
  originalName: z.string().max(180).optional().default(""),
});

export const confirmedFactsSchema = z.object({
  name: z.string().trim().min(2).max(120),
  priceCents: z.number().int().nonnegative().nullable().optional(),
  brand: z.string().trim().max(80).optional().default(""),
  facts: z.string().trim().max(1500).optional().default(""),
  audience: z.string().trim().max(160).optional().default(""),
});

export const adGenerateSchema = z.object({
  productId: z.string().uuid().nullable().optional(),
  assetIds: z.array(z.string().uuid()).min(1).max(8),
  tone: z.enum(AD_TONES),
  facts: confirmedFactsSchema,
});

export const adUpdateSchema = z.object({
  title: z.string().trim().min(2).max(140),
  description: z.string().trim().min(2).max(4000),
  hashtags: z.preprocess((value) => normalizeHashtags(value), z.array(z.string().min(2).max(30)).max(12)),
  tone: z.enum(AD_TONES),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  productId: z.string().uuid().nullable().optional(),
});

export const artworkSchema = z.object({
  productId: z.string().uuid(),
  template: z.enum(["story", "feed", "portrait"]),
  title: z.string().trim().min(2).max(80),
  priceLabel: z.string().trim().max(40).optional().default(""),
});

export const videoCreateSchema = z.object({
  productId: z.string().uuid(),
  title: z.string().trim().min(2).max(120).optional(),
  objective: z.enum(VIDEO_OBJECTIVES),
  style: z.enum(VIDEO_STYLES),
  durationSec: z.union([z.literal(10), z.literal(15), z.literal(30), z.literal(45), z.literal(60)]),
  aspectRatio: z.enum(ASPECT_RATIOS),
  motionMode: z.enum(MOTION_MODES).optional().default("PHOTO"),
  voiceProfileId: z.string().uuid().nullable().optional(),
  musicTrackId: z.string().uuid().nullable().optional(),
});

export const sceneSchema = z.object({
  mediaAssetId: z.string().uuid().nullable().optional(),
  durationMs: z.number().int().min(1000).max(20000),
  transition: z.enum(TRANSITIONS),
  zoom: z.number().min(1).max(1.4),
  panX: z.number().min(-1).max(1),
  panY: z.number().min(-1).max(1),
  headline: z.string().max(80).optional().default(""),
  caption: z.string().max(180).optional().default(""),
  cta: z.string().max(60).optional().default(""),
});

export const videoUpdateSchema = z.object({
  title: z.string().trim().min(2).max(120).optional(),
  script: z.string().max(4000).optional(),
  voiceProfileId: z.string().uuid().nullable().optional(),
  musicTrackId: z.string().uuid().nullable().optional(),
  narrationVolume: z.number().int().min(0).max(100).optional(),
  musicVolume: z.number().int().min(0).max(100).optional(),
  showPrice: z.boolean().optional(),
  showLogo: z.boolean().optional(),
  cta: z.string().max(60).optional(),
  scenes: z.array(sceneSchema).min(1).max(12).optional(),
});

export const narrationSchema = z.object({
  script: z.string().trim().min(2).max(2500),
  voiceProfileId: z.string().uuid(),
  speed: z.number().min(0.8).max(1.2).optional().default(1),
  style: z.enum(VOICE_STYLES).optional(),
  projectId: z.string().uuid().nullable().optional(),
});

export const storyboardSchema = z.object({
  mode: z.enum(["ai", "even"]),
});

export const storeSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(600).optional().default(""),
  whatsapp: z.string().trim().max(20).optional().default(""),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  published: z.boolean().optional(),
  seoTitle: z.string().trim().max(70).optional().default(""),
  seoDescription: z.string().trim().max(180).optional().default(""),
  contactEmail: emailSchema.optional().or(z.literal("")).optional(),
  address: z.string().trim().max(180).optional().default(""),
  showPrices: z.boolean().optional(),
  allowOrders: z.boolean().optional(),
});

export const publicOrderSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(20).default(1),
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(8).max(20),
  email: emailSchema.optional().or(z.literal("")).optional(),
  notes: z.string().trim().max(500).optional().default(""),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(20).optional().default(""),
  email: emailSchema.optional().or(z.literal("")).optional(),
  message: z.string().trim().min(2).max(1000),
});

export const manualOrderSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(20).optional().default(""),
  email: emailSchema.optional().or(z.literal("")).optional(),
  notes: z.string().trim().max(500).optional().default(""),
  origin: z.enum(ORDER_ORIGINS).default("MANUAL"),
  items: z.array(z.object({
    productId: z.string().uuid().nullable().optional(),
    name: z.string().trim().min(1).max(120),
    quantity: z.number().int().min(1).max(999),
    unitPriceCents: z.number().int().nonnegative(),
  })).min(1).max(30),
});

export const orderUpdateSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  notes: z.string().max(500).optional(),
  paymentStatus: z.enum(["UNPAID", "PAID", "NOT_APPLICABLE"]).optional(),
});

export const publicationSchema = z.object({
  channel: z.enum(SOCIAL_PROVIDERS),
  targetType: z.enum(["PRODUCT", "ADVERTISEMENT", "VIDEO", "CATALOG"]),
  targetId: z.string().min(1),
  caption: z.string().max(2000).optional().default(""),
  scheduledAt: z.string().datetime().nullable().optional(),
  confirmManual: z.boolean().optional().default(false),
});

export const inviteSchema = z.object({
  email: emailSchema,
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(20).optional().default(""),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  password: passwordSchema,
});

export const deleteAccountSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const ticketSchema = z.object({
  subject: z.string().trim().min(4).max(120),
  message: z.string().trim().min(4).max(4000),
});

export const musicSchema = z.object({
  title: z.string().trim().min(2).max(80),
  licenseNote: z.string().trim().min(8).max(300),
  confirmLicense: z.literal(true, { errorMap: () => ({ message: "Confirme que você tem licença para usar esta faixa." }) }),
  assetId: z.string().uuid(),
});

export const statsRangeSchema = z.object({
  range: z.enum(["7d", "30d", "90d"]).default("7d"),
});

export const trackingSchema = z.object({
  type: z.enum(["store_view", "product_view", "click"]),
  slug: z.string().min(1),
  productSlug: z.string().optional(),
  kind: z.enum(["WHATSAPP", "CATALOG", "PRODUCT", "SHARE"]).optional(),
});

export function parseBrlToCents(input: string): number | null {
  const normalized = input.trim().replace(/\s/g, "").replace(/^R\$/, "").replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const value = Math.round(Number(normalized) * 100);
  if (!Number.isSafeInteger(value) || value < 0) return null;
  return value;
}

export const VIDEO_DURATION_SET = new Set<number>(VIDEO_DURATIONS);
