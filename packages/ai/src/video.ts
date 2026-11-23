import type { Usage, VideoGenerationProvider } from "./types";
import { ProviderNotConfiguredError } from "./types";

export function createHttpVideoProvider(config: { apiUrl: string; apiKey: string }): VideoGenerationProvider | null {
  if (!config.apiUrl || !config.apiKey) return null;
  return {
    id: "http-video",
    async start(input) {
      const started = Date.now();
      const response = await fetch(config.apiUrl, {
        method: "POST",
        headers: {
          authorization: `Bearer ${config.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(input),
      });
      const payload = (await response.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!response.ok || !payload.id) {
        throw new Error(payload.error || "O provedor de vídeo generativo recusou o pedido.");
      }
      const usage: Usage = {
        provider: "http-video",
        model: "external",
        inputTokens: 0,
        outputTokens: 0,
        units: input.durationSec,
        latencyMs: Date.now() - started,
        estimatedCostCents: 0,
      };
      return { providerJobId: payload.id, usage };
    },
  };
}

export function unavailableVideoProvider(): VideoGenerationProvider {
  return {
    id: "none",
    async start() {
      throw new ProviderNotConfiguredError("vídeo generativo");
    },
  };
}
