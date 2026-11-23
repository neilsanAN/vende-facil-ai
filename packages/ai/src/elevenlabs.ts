import type { Usage } from "./types";

export function createElevenLabsSpeech(config: { apiKey: string; model: string }) {
  if (!config.apiKey) return null;
  return {
    id: "elevenlabs",
    async synthesize(input: { text: string; voiceId: string; speed: number }) {
      const started = Date.now();
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${input.voiceId}`, {
        method: "POST",
        headers: {
          "xi-api-key": config.apiKey,
          "content-type": "application/json",
          accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: input.text,
          model_id: config.model,
          voice_settings: { stability: 0.45, similarity_boost: 0.75, speed: input.speed },
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { detail?: { message?: string } } | null;
        throw new Error(payload?.detail?.message || "Falha na narração ElevenLabs.");
      }
      const audio = Buffer.from(await response.arrayBuffer());
      const usage: Usage = {
        provider: "elevenlabs",
        model: config.model,
        inputTokens: 0,
        outputTokens: 0,
        units: input.text.length,
        latencyMs: Date.now() - started,
        estimatedCostCents: Math.max(1, Math.round(input.text.length / 20)),
      };
      return { audio, mimeType: "audio/mpeg", usage };
    },
  };
}
