export type ApiError = { error?: { code?: string; message?: string; details?: unknown } };

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

export function createApiClient(options: {
  baseUrl: string;
  getAccessToken?: () => Promise<string | null>;
  refresh?: () => Promise<string | null>;
}) {
  async function request<T>(path: string, init?: RequestInit, retry = true): Promise<T> {
    const token = options.getAccessToken ? await options.getAccessToken() : null;
    const response = await fetch(`${options.baseUrl}${path}`, {
      ...init,
      headers: {
        "x-vendefacil-client": "mobile",
        ...(init?.body ? { "content-type": "application/json" } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(init?.headers || {}),
      },
    });
    if (response.status === 401 && retry && options.refresh) {
      const next = await options.refresh();
      if (next) return request<T>(path, init, false);
    }
    const payload = (await response.json().catch(() => null)) as T & ApiError;
    if (!response.ok) {
      throw new ApiClientError(payload?.error?.message || "Falha na API.", payload?.error?.code, response.status, payload?.error?.details);
    }
    return payload;
  }
  return {
    login: (body: { email: string; password: string }) =>
      request<{ accessToken: string; refreshToken: string }>("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
    register: (body: { name: string; email: string; password: string; acceptTerms: true }) =>
      request<{ email: string; message: string; delivered: boolean; devCode?: string | null }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    verifyEmail: (body: { email: string; code: string }) =>
      request<{ accessToken: string; refreshToken: string; already: boolean }>("/api/auth/verify", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    resendVerification: (email: string) =>
      request<{ ok: boolean; message: string; delivered: boolean; devCode?: string | null }>("/api/auth/resend", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
    me: () =>
      request<{
        user: {
          userId: string;
          name: string;
          email: string;
          emailVerified: boolean;
          organizationId: string | null;
          role: string | null;
        };
      }>("/api/auth/me"),
    onboard: (body: { storeName: string; description?: string; whatsapp?: string }) =>
      request<{ organizationId: string }>("/api/onboarding", { method: "POST", body: JSON.stringify(body) }),
    products: () => request("/api/products"),
    dashboard: () => request("/api/dashboard"),
    orders: () => request("/api/orders"),
    stats: (range = "7d") => request(`/api/stats?range=${range}`),
    createUpload: (body: { mimeType: string; sizeBytes: number; kind: "IMAGE" | "VIDEO" | "AUDIO"; originalName?: string }) =>
      request<{ assetId: string; url: string; method: "PUT" | "POST"; headers: Record<string, string> }>("/api/uploads", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    confirmUpload: (assetId: string) => request<{ id: string; url: string }>(`/api/uploads/${assetId}/confirm`, { method: "POST" }),
    generateAd: (body: {
      productId?: string | null;
      assetIds: string[];
      tone: "PROFESSIONAL" | "FRIENDLY" | "URGENT" | "ELEGANT";
      facts: { name: string; priceCents?: number | null; brand?: string; facts?: string; audience?: string };
    }) =>
      request<{ id: string; title: string; description: string; hashtags: string[] }>("/api/ai/ads", {
        method: "POST",
        headers: { "idempotency-key": `${Date.now()}-${Math.random().toString(36).slice(2, 10)}` },
        body: JSON.stringify(body),
      }),
    updateAd: (
      id: string,
      body: {
        title: string;
        description: string;
        hashtags: string[];
        tone: "PROFESSIONAL" | "FRIENDLY" | "URGENT" | "ELEGANT";
        status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
      },
    ) =>
      request<{ id: string; title: string; description: string; hashtags: string[] }>(`/api/ads/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
  };
}
