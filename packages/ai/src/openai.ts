import { normalizeHashtags } from "@vendefacil/types";
import { ProviderNotConfiguredError, type AdCopy, type ConfirmedFacts, type ImageAnalysis, type Usage, type VideoScript } from "./types";

type OpenAiConfig = {
  apiKey: string;
  textModel: string;
  visionModel: string;
  ttsModel: string;
};

const ANALYSIS_PROMPT = `Você identifica produtos em fotos como o Google Lens, para um vendedor no Brasil.
Responda somente JSON válido.
Identifique o que é o produto, a categoria e atributos visíveis.
Marca e modelo só se estiverem legíveis (texto/logo). Não invente marca, preço, composição oculta, garantia, certificação, medida ou voltagem.
Se houver texto legível, transcreva em visibleText.
suggestedName: nome comercial curto e específico (ex.: "Tênis Nike Air Max preto").
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
Hashtags: 6 a 10 tags específicas do produto. Sem # no JSON.
Responda JSON: {"title":"","description":"","hashtags":[]}.`;

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
      const analysis = parseAnalysis(parseJson<Partial<ImageAnalysis>>(content));
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
        temperature: 0.35,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: AD_COPY_PROMPT },
          { role: "user", content: `Tom: ${input.tone}\n${factsBlock(input.facts)}` },
        ],
      });
      const raw = parseJson<Partial<AdCopy>>(payload.choices?.[0]?.message?.content || "{}");
      const fallbackName = input.facts.visible?.suggestedName || input.facts.name;
      const copy: AdCopy = {
        title: String(raw.title || fallbackName).slice(0, 140),
        description: String(raw.description || "").slice(0, 4000),
        hashtags: normalizeHashtags(raw.hashtags, fallbackName),
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
