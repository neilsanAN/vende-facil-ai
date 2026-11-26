import { normalizeHashtags } from "@vendefacil/types";
import { AD_COPY_PROMPT, factsBlock, polishDescription, polishTitle } from "./ad-copy";
import { ProviderNotConfiguredError, type AdCopy, type ConfirmedFacts, type ImageAnalysis, type Usage, type VideoScript } from "./types";

type OpenAiConfig = {
  apiKey: string;
  textModel: string;
  visionModel: string;
  ttsModel: string;
};

const ANALYSIS_PROMPT = `Você analisa fotos de produtos para um vendedor no Brasil.
Responda somente JSON válido.
Descreva apenas o que está visível.
Não invente marca, material que não dê para ver, composição, garantia, certificação, preço, medida, voltagem ou origem.
Se houver texto legível, transcreva em visibleText.
Quando não tiver certeza, deixe o campo vazio.
Formato: {"productType":"","colors":[],"visibleText":[],"form":"","context":"","uncertain":[]}`;

function estimateTextCost(model: string, inputTokens: number, outputTokens: number) {
  const mini = model.includes("mini");
  const inputRate = mini ? 15 : 250;
  const outputRate = mini ? 60 : 1000;
  return Math.max(1, Math.round((inputTokens * inputRate + outputTokens * outputRate) / 1_000_000));
}

async function postJson(apiKey: string, body: unknown) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
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
    model?: string;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
    choices?: Array<{ message?: { content?: string } }>;
  };
  if (!response.ok) {
    throw new Error(payload.error?.message || "Falha na geração de texto.");
  }
  return { payload, latencyMs: Date.now() - started };
}

function parseJson<T>(content: string): T {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("A resposta da IA não veio em JSON.");
  return JSON.parse(content.slice(start, end + 1)) as T;
}

export function createOpenAiProviders(config: OpenAiConfig) {
  if (!config.apiKey) return null;

  const vision = {
    id: "openai",
    async analyze(input: { image: Buffer; mimeType: string }) {
      const { payload, latencyMs } = await postJson(config.apiKey, {
        model: config.visionModel,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: ANALYSIS_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Analise esta foto de produto." },
              { type: "image_url", image_url: { url: `data:${input.mimeType};base64,${input.image.toString("base64")}` } },
            ],
          },
        ],
      });
      const content = payload.choices?.[0]?.message?.content || "{}";
      const raw = parseJson<Partial<ImageAnalysis>>(content);
      const analysis: ImageAnalysis = {
        productType: String(raw.productType || ""),
        colors: Array.isArray(raw.colors) ? raw.colors.map(String).slice(0, 6) : [],
        visibleText: Array.isArray(raw.visibleText) ? raw.visibleText.map(String).slice(0, 8) : [],
        form: String(raw.form || ""),
        context: String(raw.context || ""),
        uncertain: Array.isArray(raw.uncertain) ? raw.uncertain.map(String).slice(0, 8) : [],
      };
      const inputTokens = payload.usage?.prompt_tokens ?? 0;
      const outputTokens = payload.usage?.completion_tokens ?? 0;
      const usage: Usage = {
        provider: "openai",
        model: payload.model || config.visionModel,
        inputTokens,
        outputTokens,
        units: 1,
        latencyMs,
        estimatedCostCents: estimateTextCost(config.visionModel, inputTokens, outputTokens),
      };
      return { analysis, usage };
    },
  };

  const text = {
    id: "openai",
    async adCopy(input: { facts: ConfirmedFacts; tone: string }) {
      const { payload, latencyMs } = await postJson(config.apiKey, {
        model: config.textModel,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: AD_COPY_PROMPT,
          },
          { role: "user", content: `Tom: ${input.tone}\n${factsBlock(input.facts)}` },
        ],
      });
      const raw = parseJson<Partial<AdCopy>>(payload.choices?.[0]?.message?.content || "{}");
      const copy: AdCopy = {
        title: polishTitle(String(raw.title || input.facts.name)).slice(0, 140),
        description: polishDescription(String(raw.description || ""), input.facts.name).slice(0, 4000),
        hashtags: normalizeHashtags(raw.hashtags, input.facts.name),
      };
      const inputTokens = payload.usage?.prompt_tokens ?? 0;
      const outputTokens = payload.usage?.completion_tokens ?? 0;
      return {
        copy,
        usage: {
          provider: "openai",
          model: payload.model || config.textModel,
          inputTokens,
          outputTokens,
          units: 1,
          latencyMs,
          estimatedCostCents: estimateTextCost(config.textModel, inputTokens, outputTokens),
        } satisfies Usage,
      };
    },
    async videoScript(input: { facts: ConfirmedFacts; objective: string; style: string; sceneCount: number }) {
      const { payload, latencyMs } = await postJson(config.apiKey, {
        model: config.textModel,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Crie um roteiro curto de vídeo comercial em português do Brasil. Use somente fatos confirmados. Não invente especificações. Com poucos fatos, faça um convite comercial genérico, sem detalhe técnico. Responda JSON: {\"narration\":\"\",\"scenes\":[{\"headline\":\"\",\"caption\":\"\",\"narration\":\"\"}]}. A quantidade de cenas deve ser exatamente a pedida. Cada narração de cena é uma frase curta.",
          },
          {
            role: "user",
            content: `Objetivo: ${input.objective}\nEstilo: ${input.style}\nCenas: ${input.sceneCount}\n${factsBlock(input.facts)}`,
          },
        ],
      });
      const raw = parseJson<Partial<VideoScript>>(payload.choices?.[0]?.message?.content || "{}");
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
      const inputTokens = payload.usage?.prompt_tokens ?? 0;
      const outputTokens = payload.usage?.completion_tokens ?? 0;
      return {
        script,
        usage: {
          provider: "openai",
          model: payload.model || config.textModel,
          inputTokens,
          outputTokens,
          units: 1,
          latencyMs,
          estimatedCostCents: estimateTextCost(config.textModel, inputTokens, outputTokens),
        } satisfies Usage,
      };
    },
  };

  const speech = {
    id: "openai",
    async synthesize(input: { text: string; voiceId: string; speed: number }) {
      const started = Date.now();
      const response = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          authorization: `Bearer ${config.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: config.ttsModel,
          voice: input.voiceId,
          input: input.text,
          speed: input.speed,
          response_format: "mp3",
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(payload?.error?.message || "Falha na narração.");
      }
      const audio = Buffer.from(await response.arrayBuffer());
      const units = input.text.length;
      return {
        audio,
        mimeType: "audio/mpeg",
        usage: {
          provider: "openai",
          model: config.ttsModel,
          inputTokens: 0,
          outputTokens: 0,
          units,
          latencyMs: Date.now() - started,
          estimatedCostCents: Math.max(1, Math.round((units * 1500) / 1_000_000)),
        } satisfies Usage,
      };
    },
  };

  return { vision, text, speech };
}

export function assertConfigured<T>(value: T | null, provider: string): T {
  if (!value) throw new ProviderNotConfiguredError(provider);
  return value;
}
