import { existsSync } from "node:fs";
import path from "node:path";

export function repoRoot(start = process.cwd()) {
  let dir = start;
  for (let i = 0; i < 6; i += 1) {
    if (existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return start;
}

const SECRET = /key|token|password|authorization|secret|credential/i;

export function redact(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => redact(item));
  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    output[key] = SECRET.test(key) ? "[redacted]" : redact(entry);
  }
  return output;
}

export function log(
  level: "info" | "warn" | "error",
  message: string,
  fields?: Record<string, unknown>,
) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    message,
    ...(fields ? (redact(fields) as Record<string, unknown>) : {}),
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
