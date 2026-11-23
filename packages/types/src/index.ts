export const PRODUCT_STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const AD_TONES = ["PROFESSIONAL", "FRIENDLY", "URGENT", "ELEGANT"] as const;
export type AdTone = (typeof AD_TONES)[number];

export const AD_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export type AdStatus = (typeof AD_STATUSES)[number];

export const VIDEO_OBJECTIVES = ["SELL", "OFFER", "PRESENT", "SOCIAL"] as const;
export type VideoObjective = (typeof VIDEO_OBJECTIVES)[number];

export const VIDEO_STYLES = ["PREMIUM", "OFFER", "SHOWCASE", "ELEGANT", "SOCIAL", "MINIMAL"] as const;
export type VideoStyle = (typeof VIDEO_STYLES)[number];

export const ASPECT_RATIOS = ["R9_16", "R1_1", "R4_5", "R16_9"] as const;
export type AspectRatio = (typeof ASPECT_RATIOS)[number];

export const VIDEO_DURATIONS = [10, 15, 30, 45, 60] as const;
export type VideoDuration = (typeof VIDEO_DURATIONS)[number];

export const MOTION_MODES = ["PHOTO", "GENERATIVE"] as const;
export type MotionMode = (typeof MOTION_MODES)[number];

export const PIPELINE_STATUSES = [
  "CREATED",
  "VALIDATING",
  "GENERATING_SCRIPT",
  "GENERATING_AUDIO",
  "PREPARING_SCENES",
  "RENDERING",
  "UPLOADING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "RETRYING",
] as const;
export type PipelineStatus = (typeof PIPELINE_STATUSES)[number];

export const PIPELINE_LABEL: Record<PipelineStatus, string> = {
  CREATED: "Na fila",
  VALIDATING: "Validando",
  GENERATING_SCRIPT: "Gerando roteiro",
  GENERATING_AUDIO: "Gerando narração",
  PREPARING_SCENES: "Preparando cenas",
  RENDERING: "Renderizando",
  UPLOADING: "Enviando vídeo",
  COMPLETED: "Concluído",
  FAILED: "Falhou",
  CANCELLED: "Cancelado",
  RETRYING: "Tentando novamente",
};

export const TRANSITIONS = ["CUT", "FADE", "SLIDE", "WIPE"] as const;
export type TransitionType = (typeof TRANSITIONS)[number];

export const VOICE_GENDERS = ["FEMALE", "MALE"] as const;
export type VoiceGender = (typeof VOICE_GENDERS)[number];

export const VOICE_STYLES = ["SOFT", "INSTITUTIONAL", "PROMOTIONAL"] as const;
export type VoiceStyle = (typeof VOICE_STYLES)[number];

export const CREDIT_KINDS = ["ANNOUNCEMENT", "NARRATION", "RENDER", "GENERATIVE_VIDEO"] as const;
export type CreditKind = (typeof CREDIT_KINDS)[number];

export const CREDIT_LABEL: Record<CreditKind, string> = {
  ANNOUNCEMENT: "Anúncios",
  NARRATION: "Narração",
  RENDER: "Vídeos com fotos",
  GENERATIVE_VIDEO: "Vídeo generativo",
};

export const MEMBER_ROLES = ["OWNER", "ADMIN", "EDITOR", "VIEWER"] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

export const ORDER_STATUSES = ["NEW", "CONFIRMED", "PREPARING", "COMPLETED", "CANCELLED"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_ORIGINS = ["STORE", "WHATSAPP", "MANUAL"] as const;
export type OrderOrigin = (typeof ORDER_ORIGINS)[number];

export const SOCIAL_PROVIDERS = ["WHATSAPP", "INSTAGRAM", "FACEBOOK"] as const;
export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number];

export const PUBLICATION_STATUSES = [
  "DRAFT",
  "SCHEDULED",
  "PUBLISHED",
  "FAILED",
  "MANUAL_REQUIRED",
  "CANCELLED",
] as const;
export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number];

export const ASPECT_DIMENSIONS: Record<AspectRatio, { width: number; height: number; label: string }> = {
  R9_16: { width: 720, height: 1280, label: "9:16" },
  R1_1: { width: 720, height: 720, label: "1:1" },
  R4_5: { width: 720, height: 900, label: "4:5" },
  R16_9: { width: 1280, height: 720, label: "16:9" },
};

export const OBJECTIVE_LABEL: Record<VideoObjective, string> = {
  SELL: "Comercial",
  OFFER: "Oferta",
  PRESENT: "Apresentação",
  SOCIAL: "Redes sociais",
};

export const STYLE_LABEL: Record<VideoStyle, string> = {
  PREMIUM: "Comercial premium",
  OFFER: "Oferta promocional",
  SHOWCASE: "Apresentação de produto",
  ELEGANT: "Vitrine elegante",
  SOCIAL: "Redes sociais",
  MINIMAL: "Minimalista",
};

export const TONE_LABEL: Record<AdTone, string> = {
  PROFESSIONAL: "Profissional",
  FRIENDLY: "Próximo",
  URGENT: "Promocional",
  ELEGANT: "Elegante",
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  NEW: "Novo",
  CONFIRMED: "Confirmado",
  PREPARING: "Em preparo",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
};

export type PlanLimits = {
  products: number;
  members: number;
  announcementCredits: number;
  narrationCredits: number;
  renderCredits: number;
  generativeVideoCredits: number;
  aiPerHour: number;
  scheduledPosts: boolean;
};

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  platformRole: "USER" | "PLATFORM_ADMIN";
  emailVerified: boolean;
  organizationId: string | null;
  role: MemberRole | null;
};

export function formatBrl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function isPlanLimits(value: unknown): value is PlanLimits {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.products === "number" && typeof record.announcementCredits === "number";
}
