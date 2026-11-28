import { normalizeHashtags } from "@vendefacil/types";
import {
  type AdCopy,
  type ConfirmedFacts,
  type ImageAnalysis,
  type StudioBackgroundStyle,
  type Usage,
  type VideoScript,
} from "./types";

type GeminiConfig = {
  apiKey: string;
  textModel: string;
  visionModel: string;
  imageModel?: string;
};

const ANALYSIS_PROMPT = `Você identifica produtos em fotos como o Google Lens, para um vendedor no Brasil.
Responda somente JSON válido.
Identifique o produto com precisão comercial: tipo, categoria, cor dominante, marca/modelo só se legíveis, e um suggestedName específico.
Não invente marca, preço, composição oculta, garantia, certificação, medida ou voltagem.
Se houver texto legível na embalagem/etiqueta, transcreva em visibleText.
suggestedName: nome comercial curto e específico (ex.: "Tênis Nike Air Max preto 42").
category: uma categoria curta em português (ex.: Calçados, Eletrônicos, Beleza, Moda, Casa, Alimentos, Outros).
attributes: lista curta do que dá para ver.
confidence: high|medium|low.
Quando não tiver certeza, deixe o campo vazio ou use confidence low.
Formato: {"productType":"","suggestedName":"","brandVisible":"","category":"","attributes":[],"colors":[],"visibleText":[],"form":"","context":"","uncertain":[],"confidence":"medium"}`;

const AD_COPY_PROMPT = `Escreva anúncios em português do Brasil para WhatsApp/Instagram, como se a foto tivesse sido identificada pelo Google Lens.
O título e a descrição DEVEM nomear o produto de forma assertiva (tipo + cor/modelo/marca se confirmados), sem genéricos como "Produto incrível".
Use somente identificação visual + fatos do vendedor. Não invente marca, composição, garantia, certificação, preço ou especificação ausente.
Se a marca não foi informada/visível, não cite marca. Se o preço não foi informado, não cite valor; se foi, use exatamente o preço informado.
Título: específico e comercial, até ~70 caracteres.
Descrição: 2 a 4 frases — o que é, diferencial visível, condição/pagamento/entrega se informados, CTA para WhatsApp.
Hashtags: 6 a 10 tags específicas do produto (categoria, tipo, marca se visível, cor/uso). Sem # no JSON.
Responda JSON: {"title":"","description":"","hashtags":[]}.`;

const STUDIO_BG_PROMPTS: Record<StudioBackgroundStyle, string> = {
  white_studio:
    "Recrie esta foto como foto profissional de e-commerce: o MESMO produto centralizado em fundo branco seamless de estúdio, iluminação softbox suave, sombra leve realista, sem texto extra, sem pessoas, sem logos inventados.",
  soft_gray:
    "Recrie esta foto como foto profissional de catálogo: o MESMO produto centralizado em fundo cinza claro neutro de estúdio, luz difusa, sombra suave, ultra-realista.",
  marble:
    "Recrie esta foto como foto premium de produto: o MESMO produto sobre superfície de mármore branco elegante com fundo limpo, iluminação de estúdio, composição comercial.",
  dark_premium:
    "Recrie esta foto como foto premium: o MESMO produto em fundo preto/grafite sofisticado, iluminação dramática suave, aspecto de loja de luxo, sem texto.",
  wood_natural:
    "Recrie esta foto como foto lifestyle de produto: o MESMO produto sobre madeira clara natural, fundo desfocado limpo, luz natural suave, realista.",
  pastel_mint:
    "Recrie esta foto como foto comercial moderna: o MESMO produto em fundo pastel menta suave, estúdio limpo, luz suave, composição central.",
  lifestyle_blur:
    "Recrie esta foto como foto comercial lifestyle: o MESMO produto em primeiro plano nítido com fundo ambiente levemente desfocado e limpo, luz natural profissional.",
};

function factsBlock(facts: ConfirmedFacts) {
  return [
    `Nome confirmado: ${facts.name}`,
    `Preço confirmado: ${facts.priceLabel || "não informado"}`,
    `Marca confirmada: ${facts.brand || "não informada"}`,
    `Características confirmadas pelo vendedor: ${facts.facts || "nenhuma"}`,
    `Público informado: ${facts.audience || "não informado"}`,
    `Identificação visual (estilo Lens): ${facts.visible ? JSON.stringify(facts.visible) : "não disponíveis"}`,
  ].join("\n");
}

function parseAnalysis(raw: Partial<ImageAnalysis>): ImageAnalysis {
  const confidenceRaw = String(raw.confidence || "medium").toLowerCase();
  const confidence = confidenceRaw === "high" || confidenceRaw === "low" ? confidenceRaw : "medium";
  return {
    productType: String(raw.productType || ""),
    suggestedName: String(raw.suggestedName || ""),
    brandVisible: String(raw.brandVisible || ""),
    category: String(raw.category || "").trim() || "Outros",
    attributes: Array.isArray(raw.attributes) ? raw.attributes.map(String).slice(0, 8) : [],
    colors: Array.isArray(raw.colors) ? raw.colors.map(String).slice(0, 6) : [],
    visibleText: Array.isArray(raw.visibleText) ? raw.visibleText.map(String).slice(0, 8) : [],
    form: String(raw.form || ""),
    context: String(raw.context || ""),
    uncertain: Array.isArray(raw.uncertain) ? raw.uncertain.map(String).slice(0, 8) : [],
    confidence,
  };
}

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

async function generateImageEdit(
  apiKey: string,
  model: string,
  parts: Array<Record<string, unknown>>,
) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90_000);
  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
            imageConfig: { aspectRatio: "4:5" },
          },
        }),
        signal: controller.signal,
      },
    );
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("A IA demorou demais para gerar o fundo. Tente de novo.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
  const payload = (await response.json()) as {
    error?: { message?: string };
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
          inlineData?: { mimeType?: string; data?: string };
          inline_data?: { mime_type?: string; data?: string };
        }>;
      };
    }>;
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    modelVersion?: string;
  };
  if (!response.ok) {
    throw new Error(payload.error?.message || "Falha ao gerar fundo com IA.");
  }
  const outParts = payload.candidates?.[0]?.content?.parts || [];
  for (const part of outParts) {
    const inline = part.inlineData || part.inline_data;
    const data = inline && "data" in inline ? inline.data : undefined;
    if (data) {
      const mime =
        ("mimeType" in (inline || {}) && (inline as { mimeType?: string }).mimeType) ||
        ("mime_type" in (inline || {}) && (inline as { mime_type?: string }).mime_type) ||
        "image/jpeg";
      return {
        image: Buffer.from(data, "base64"),
        mimeType: mime,
        latencyMs: Date.now() - started,
        inputTokens: payload.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: payload.usageMetadata?.candidatesTokenCount ?? 0,
        model: payload.modelVersion || model,
      };
    }
  }
  throw new Error("A IA não retornou a imagem do fundo.");
}

export function createGeminiProviders(config: GeminiConfig) {
  if (!config.apiKey) return null;
  const imageModel = config.imageModel || "gemini-2.5-flash-image";

  const vision = {
    id: "gemini",
    async analyze(input: { image: Buffer; mimeType: string }) {
      const result = await generateContent(config.apiKey, config.visionModel, {
        systemInstruction: ANALYSIS_PROMPT,
        temperature: 0.1,
        parts: [
          { text: "Identifique este produto com precisão, como o Google Lens." },
          {
            inline_data: {
              mime_type: input.mimeType,
              data: input.image.toString("base64"),
            },
          },
        ],
      });
      const analysis = parseAnalysis(parseJson<Partial<ImageAnalysis>>(result.content));
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

  const imageEdit = {
    id: "gemini",
    async studioBackground(input: { image: Buffer; mimeType: string; style: StudioBackgroundStyle }) {
      const prompt = STUDIO_BG_PROMPTS[input.style] || STUDIO_BG_PROMPTS.white_studio;
      const result = await generateImageEdit(config.apiKey, imageModel, [
        { text: prompt },
        {
          inline_data: {
            mime_type: input.mimeType,
            data: input.image.toString("base64"),
          },
        },
      ]);
      const usage: Usage = {
        provider: "gemini",
        model: result.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        units: 1,
        latencyMs: result.latencyMs,
        estimatedCostCents: Math.max(5, estimateTextCost(imageModel, result.inputTokens, result.outputTokens)),
      };
      return { image: result.image, mimeType: result.mimeType, usage };
    },
  };

  const text = {
    id: "gemini",
    async adCopy(input: { facts: ConfirmedFacts; tone: string }) {
      const result = await generateContent(config.apiKey, config.textModel, {
        temperature: 0.35,
        systemInstruction: AD_COPY_PROMPT,
        parts: [{ text: `Tom: ${input.tone}\n${factsBlock(input.facts)}` }],
      });
      const raw = parseJson<Partial<AdCopy>>(result.content);
      const fallbackName = input.facts.visible?.suggestedName || input.facts.name;
      const copy: AdCopy = {
        title: String(raw.title || fallbackName).slice(0, 140),
        description: String(raw.description || "").slice(0, 4000),
        hashtags: normalizeHashtags(raw.hashtags, fallbackName),
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

  return { vision, imageEdit, text };
}
