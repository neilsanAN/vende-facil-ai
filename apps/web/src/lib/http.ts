import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const twMerge = extendTailwindMerge({
  extend: { classGroups: { "font-size": ["text-tiny"] } },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public code = "ERROR",
    public status = 500,
    public details?: unknown,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "content-type": "application/json" }),
      ...(init?.headers || {}),
    },
    credentials: "include",
  });
  if (response.status === 401 && !path.startsWith("/api/auth/refresh") && !path.startsWith("/api/auth/login")) {
    const refreshed = await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
    if (refreshed.ok) return api<T>(path, init);
  }
  const payload = (await response.json().catch(() => null)) as
    | { error?: { message?: string; code?: string; details?: unknown } }
    | T
    | null;
  if (!response.ok) {
    const error = payload && typeof payload === "object" && "error" in payload ? payload.error : undefined;
    throw new ApiClientError(error?.message || "Não foi possível concluir a ação.", error?.code, response.status, error?.details);
  }
  return payload as T;
}
