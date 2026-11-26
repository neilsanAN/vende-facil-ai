import { normalizeHashtags } from "@vendefacil/types";
import { AD_COPY_PROMPT, factsBlock, polishDescription, polishTitle } from "./ad-copy";
import { type AdCopy, type ConfirmedFacts, type ImageAnalysis, type Usage, type VideoScript } from "./types";

type GeminiConfig = {
  apiKey: string;
  textModel: string;
  visionModel: string;
};

const ANALYSIS_PROMPT = `Você analisa fotos de produtos para um vendedor no Brasil.
Responda somente JSON válido.
Descreva apenas o que está visível.
Não invente marca, material que não dê para ver, composição, garantia, certificação, preço, medida, voltagem ou origem.
Se houver texto legível, transcreva em visibleText.
Quando não tiver certeza, deixe o campo vazio.
Formato: {"productType":"","colors":[],"visibleText":[],"form":"","context":"","uncertain":[]}`;

function estimateTextCost(model: string, inputTokens: number, outputTokens: number) {
  const flash = model.includes("flash");
  const inputRate = flash ? 10 : 35;
  const outputRate = flash ? 40 : 140;
  return Math.max(1, Math.round((inputTokens * inputRate + outputTokens * outputRate) / 1_000_000));
}

function parseJson<T>(content: string): T {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("A resposta da IA não veio em JSON.");
  return JSON.parse(content.slice(start, end + 1)) as T;
}

async function generateContent(
  apiKey: string,
  model: string,
  body: {
    systemInstruction?: string;
    parts: Array<Record<string, unknown>>;
    temperature: number;
  },
) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...(body.systemInstruction
            ? { system_instruction: { parts: [{ text: body.systemInstruction }] } }
            : {}),
          contents: [{ role: "user", parts: body.parts }],
          generationConfig: {
            temperature: body.temperature,
            responseMimeType: "application/json",
          },
        }),
        signal: controller.signal,
      },
    );
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("A IA demorou demais para responder. Tente de novo.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
  const payload = (await response.json()) as {
    error?: { message?: string };
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    modelVersion?: string;
  };
  if (!response.ok) {
    throw new Error(payload.error?.message || "Falha na geração com Gemini.");
  }
  const content = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "{}";
  return {
    content,
    latencyMs: Date.now() - started,
    inputTokens: payload.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: payload.usageMetadata?.candidatesTokenCount ?? 0,
    model: payload.modelVersion || model,
  };
}

export function createGeminiProviders(config: GeminiConfig) {
  if (!config.apiKey) return null;

  const vision = {
    id: "gemini",
    async analyze(input: { image: Buffer; mimeType: string }) {
      const result = await generateContent(config.apiKey, config.visionModel, {
        systemInstruction: ANALYSIS_PROMPT,
        temperature: 0.1,
        parts: [
          { text: "Analise esta foto de produto." },
          {
            inline_data: {
              mime_type: input.mimeType,
              data: input.image.toString("base64"),
            },
          },
        ],
      });
      const raw = parseJson<Partial<ImageAnalysis>>(result.content);
      const analysis: ImageAnalysis = {
        productType: String(raw.productType || ""),
        colors: Array.isArray(raw.colors) ? raw.colors.map(String).slice(0, 6) : [],
        visibleText: Array.isArray(raw.visibleText) ? raw.visibleText.map(String).slice(0, 8) : [],
        form: String(raw.form || ""),
        context: String(raw.context || ""),
        uncertain: Array.isArray(raw.uncertain) ? raw.uncertain.map(String).slice(0, 8) : [],
      };
      const usage: Usage = {
        provider: "gemini",
        model: result.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        units: 1,
        latencyMs: result.latencyMs,
        estimatedCostCents: estimateTextCost(config.visionModel, result.inputTokens, result.outputTokens),
      };
      return { analysis, usage };
    },
  };

  const text = {
    id: "gemini",
    async adCopy(input: { facts: ConfirmedFacts; tone: string }) {
      const result = await generateContent(config.apiKey, config.textModel, {
        temperature: 0.4,
        systemInstruction: AD_COPY_PROMPT,
        parts: [{ text: `Tom: ${input.tone}\n${factsBlock(input.facts)}` }],
      });
      const raw = parseJson<Partial<AdCopy>>(result.content);
      const copy: AdCopy = {
        title: polishTitle(String(raw.title || input.facts.name)).slice(0, 140),
        description: polishDescription(String(raw.description || ""), input.facts.name).slice(0, 4000),
        hashtags: normalizeHashtags(raw.hashtags, input.facts.name),
      };
      return {
        copy,
        usage: {
          provider: "gemini",
          model: result.model,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          units: 1,
          latencyMs: result.latencyMs,
          estimatedCostCents: estimateTextCost(config.textModel, result.inputTokens, result.outputTokens),
        } satisfies Usage,
      };
    },
    async videoScript(input: { facts: ConfirmedFacts; objective: string; style: string; sceneCount: number }) {
      const result = await generateContent(config.apiKey, config.textModel, {
        temperature: 0.4,
        systemInstruction:
          "Crie um roteiro curto de vídeo comercial em português do Brasil. Use somente fatos confirmados. Não invente especificações. Com poucos fatos, faça um convite comercial genérico, sem detalhe técnico. Responda JSON: {\"narration\":\"\",\"scenes\":[{\"headline\":\"\",\"caption\":\"\",\"narration\":\"\"}]}. A quantidade de cenas deve ser exatamente a pedida. Cada narração de cena é uma frase curta.",
        parts: [
          {
            text: `Objetivo: ${input.objective}\nEstilo: ${input.style}\nCenas: ${input.sceneCount}\n${factsBlock(input.facts)}`,
          },
        ],
      });
      const raw = parseJson<Partial<VideoScript>>(result.content);
      const scenes = Array.isArray(raw.scenes) ? raw.scenes.slice(0, input.sceneCount) : [];
      while (scenes.length < input.sceneCount) scenes.push({ headline: "", caption: "", narration: "" });
      const script: VideoScript = {
        narration: String(raw.narration || scenes.map((scene) => scene.narration).filter(Boolean).join(" ")),
        scenes: scenes.map((scene) => ({
          headline: String(scene.headline || "").slice(0, 80),
          caption: String(scene.caption || "").slice(0, 180),
          narration: String(scene.narration || "").slice(0, 240),
        })),
      };
      return {
        script,
        usage: {
          provider: "gemini",
          model: result.model,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          units: 1,
          latencyMs: result.latencyMs,
          estimatedCostCents: estimateTextCost(config.textModel, result.inputTokens, result.outputTokens),
        } satisfies Usage,
      };
    },
  };

  return { vision, text };
}
