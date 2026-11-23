import type { PipelineStatus } from "@vendefacil/types";

const LINEAR: PipelineStatus[] = [
  "CREATED",
  "VALIDATING",
  "GENERATING_SCRIPT",
  "GENERATING_AUDIO",
  "PREPARING_SCENES",
  "RENDERING",
  "UPLOADING",
  "COMPLETED",
];

const EXTRA: Record<PipelineStatus, PipelineStatus[]> = {
  CREATED: ["VALIDATING", "CANCELLED"],
  VALIDATING: ["GENERATING_SCRIPT", "FAILED", "CANCELLED"],
  GENERATING_SCRIPT: ["GENERATING_AUDIO", "PREPARING_SCENES", "FAILED", "CANCELLED", "RETRYING"],
  GENERATING_AUDIO: ["PREPARING_SCENES", "FAILED", "CANCELLED", "RETRYING"],
  PREPARING_SCENES: ["RENDERING", "FAILED", "CANCELLED", "RETRYING"],
  RENDERING: ["UPLOADING", "FAILED", "CANCELLED", "RETRYING"],
  UPLOADING: ["COMPLETED", "FAILED", "RETRYING"],
  COMPLETED: [],
  FAILED: ["RETRYING"],
  CANCELLED: [],
  RETRYING: ["VALIDATING", "GENERATING_SCRIPT", "GENERATING_AUDIO", "PREPARING_SCENES", "RENDERING", "UPLOADING", "FAILED", "CANCELLED"],
};

export function canTransition(from: PipelineStatus, to: PipelineStatus) {
  return EXTRA[from].includes(to);
}

export function nextRetryDelayMs(attempt: number) {
  return Math.min(60_000 * 2 ** Math.max(0, attempt - 1), 15 * 60_000);
}

export function isTerminal(status: PipelineStatus) {
  return status === "COMPLETED" || status === "FAILED" || status === "CANCELLED";
}

export function progressFor(status: PipelineStatus) {
  const index = LINEAR.indexOf(status);
  if (status === "FAILED" || status === "CANCELLED") return 100;
  if (status === "RETRYING") return 5;
  if (index < 0) return 0;
  return Math.round((index / (LINEAR.length - 1)) * 100);
}

export function isRetryable(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as { code: string }).code);
    if (["SCRIPT_REQUIRED", "PROVIDER_NOT_CONFIGURED", "AI_UNGROUNDED", "CANCELLED", "FORBIDDEN"].includes(code)) return false;
  }
  const message = error instanceof Error ? error.message : "";
  if (message === "CANCELLED") return false;
  if (/não encontrado no worker|ENOENT/i.test(message)) return false;
  return true;
}
