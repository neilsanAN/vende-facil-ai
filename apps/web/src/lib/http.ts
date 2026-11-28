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

function isNetworkFailure(cause: unknown) {
  if (!(cause instanceof Error)) return false;
  const message = cause.message.toLowerCase();
  return (
    cause.name === "TypeError" ||
    message.includes("network request failed") ||
    message.includes("failed to fetch") ||
    message.includes("network error") ||
    message.includes("load failed")
  );
}

export async function api<T>(path: string, init?: RequestInit, retryAuth = true): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: {
        ...(init?.body instanceof FormData ? {} : { "content-type": "application/json" }),
        ...(init?.headers || {}),
      },
      credentials: "include",
    });
  } catch (cause) {
    if (isNetworkFailure(cause)) {
      throw new ApiClientError("Não foi possível conectar ao servidor. Aguarde alguns segundos e tente de novo.", "NETWORK", 0);
    }
    throw cause;
  }
  if (response.status === 401 && retryAuth && !path.startsWith("/api/auth/refresh") && !path.startsWith("/api/auth/login") && !path.startsWith("/api/auth/verify")) {
    const refreshed = await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
    if (refreshed.ok) return api<T>(path, init, false);
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
