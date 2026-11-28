export class ProviderNotConfiguredError extends Error {
  readonly code = "PROVIDER_NOT_CONFIGURED";

  constructor(provider: string) {
    super(`O provedor ${provider} não está configurado.`);
  }
}

export type Usage = {
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  units: number;
  latencyMs: number;
  estimatedCostCents: number;
};

export type ImageAnalysis = {
  productType: string;
  colors: string[];
  visibleText: string[];
  form: string;
  context: string;
  uncertain: string[];
  /** Nome comercial curto inferido da foto (estilo Google Lens). */
  suggestedName: string;
  /** Marca só se texto/logo legível. */
  brandVisible: string;
  /** Categoria curta em PT (ex.: Calçados, Eletrônicos). */
  category: string;
  /** Atributos visíveis (cor, modelo aparente, etc.). */
  attributes: string[];
  confidence: "high" | "medium" | "low";
};

export type AdCopy = {
  title: string;
  description: string;
  hashtags: string[];
};

export type VideoScript = {
  narration: string;
  scenes: Array<{ headline: string; caption: string; narration: string }>;
};

export type ConfirmedFacts = {
  name: string;
  priceLabel?: string;
  brand?: string;
  facts?: string;
  audience?: string;
  visible?: ImageAnalysis | null;
};

export type StudioBackgroundStyle =
  | "white_studio"
  | "soft_gray"
  | "marble"
  | "dark_premium"
  | "wood_natural"
  | "pastel_mint"
  | "lifestyle_blur";

export interface ImageAnalysisProvider {
  readonly id: string;
  analyze(input: { image: Buffer; mimeType: string }): Promise<{ analysis: ImageAnalysis; usage: Usage }>;
}

export interface ImageEditProvider {
  readonly id: string;
  studioBackground(input: {
    image: Buffer;
    mimeType: string;
    style: StudioBackgroundStyle;
  }): Promise<{ image: Buffer; mimeType: string; usage: Usage }>;
}

export interface TextGenerationProvider {
  readonly id: string;
  adCopy(input: { facts: ConfirmedFacts; tone: string }): Promise<{ copy: AdCopy; usage: Usage }>;
  videoScript(input: { facts: ConfirmedFacts; objective: string; style: string; sceneCount: number }): Promise<{ script: VideoScript; usage: Usage }>;
}

export interface TextToSpeechProvider {
  readonly id: string;
  synthesize(input: { text: string; voiceId: string; speed: number }): Promise<{ audio: Buffer; mimeType: string; usage: Usage }>;
}

export interface VideoGenerationProvider {
  readonly id: string;
  start(input: { prompt: string; imageUrls: string[]; durationSec: number; aspectRatio: string }): Promise<{ providerJobId: string; usage: Usage }>;
}

export type AiRegistry = {
  vision: ImageAnalysisProvider | null;
  imageEdit: ImageEditProvider | null;
  text: TextGenerationProvider | null;
  speech: TextToSpeechProvider[];
  generativeVideo: VideoGenerationProvider | null;
};
