export type ApiError = { error?: { code?: string; message?: string } };

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
    if (!response.ok) throw new Error(payload?.error?.message || "Falha na API.");
    return payload;
  }
  return {
    login: (body: { email: string; password: string }) => request<{ accessToken: string; refreshToken: string }>("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
    me: () => request("/api/auth/me"),
    products: () => request("/api/products"),
    dashboard: () => request("/api/dashboard"),
    orders: () => request("/api/orders"),
    stats: (range = "7d") => request(`/api/stats?range=${range}`),
  };
}
