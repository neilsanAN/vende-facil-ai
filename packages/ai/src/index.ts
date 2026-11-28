import { createElevenLabsSpeech } from "./elevenlabs";
import { createGeminiProviders } from "./gemini";
import { createOpenAiProviders } from "./openai";
import type { AiRegistry } from "./types";
import { createHttpVideoProvider } from "./video";

export function createAiRegistry(env: {
  GEMINI_API_KEY?: string;
  GEMINI_TEXT_MODEL?: string;
  GEMINI_VISION_MODEL?: string;
  GEMINI_IMAGE_MODEL?: string;
  OPENAI_API_KEY?: string;
  OPENAI_TEXT_MODEL?: string;
  OPENAI_VISION_MODEL?: string;
  OPENAI_TTS_MODEL?: string;
  ELEVENLABS_API_KEY?: string;
  ELEVENLABS_MODEL?: string;
  VIDEO_GEN_API_URL?: string;
  VIDEO_GEN_API_KEY?: string;
}): AiRegistry {
  const gemini = createGeminiProviders({
    apiKey: env.GEMINI_API_KEY || "",
    textModel: env.GEMINI_TEXT_MODEL || "gemini-2.0-flash",
    visionModel: env.GEMINI_VISION_MODEL || "gemini-2.0-flash",
    imageModel: env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image",
  });
  const openai = createOpenAiProviders({
    apiKey: env.OPENAI_API_KEY || "",
    textModel: env.OPENAI_TEXT_MODEL || "gpt-4o-mini",
    visionModel: env.OPENAI_VISION_MODEL || "gpt-4o-mini",
    ttsModel: env.OPENAI_TTS_MODEL || "tts-1",
  });
  const eleven = createElevenLabsSpeech({
    apiKey: env.ELEVENLABS_API_KEY || "",
    model: env.ELEVENLABS_MODEL || "eleven_multilingual_v2",
  });
  return {
    // Gemini first for text/vision when configured; OpenAI remains fallback.
    vision: gemini?.vision ?? openai?.vision ?? null,
    imageEdit: gemini?.imageEdit ?? null,
    text: gemini?.text ?? openai?.text ?? null,
    speech: [openai?.speech, eleven].filter((item): item is NonNullable<typeof item> => Boolean(item)),
    generativeVideo: createHttpVideoProvider({
      apiUrl: env.VIDEO_GEN_API_URL || "",
      apiKey: env.VIDEO_GEN_API_KEY || "",
    }),
  };
}

export { ProviderNotConfiguredError } from "./types";
export type {
  AdCopy,
  AiRegistry,
  ConfirmedFacts,
  ImageAnalysis,
  StudioBackgroundStyle,
  Usage,
  VideoScript,
} from "./types";
