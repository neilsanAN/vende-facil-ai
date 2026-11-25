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
    shell: () =>
      request<{
        store: { name: string; slug: string; published: boolean } | null;
        plan: string;
      }>("/api/shell"),
    onboard: (body: { storeName: string; description?: string; whatsapp?: string }) =>
      request<{ organizationId: string }>("/api/onboarding", { method: "POST", body: JSON.stringify(body) }),
    products: () => request("/api/products"),
    createProduct: (body: {
      name: string;
      description?: string;
      priceCents: number;
      promoPriceCents?: number | null;
      status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
      published?: boolean;
      categoryId?: string | null;
      sku?: string;
      trackStock?: boolean;
      stockQuantity?: number | null;
      variants?: Array<{ name: string; sku?: string; priceCents?: number | null; stockQuantity?: number | null }>;
    }) => request<{ id: string }>("/api/products", { method: "POST", body: JSON.stringify(body) }),
    updateProduct: (
      id: string,
      body: {
        name: string;
        description?: string;
        priceCents: number;
        promoPriceCents?: number | null;
        status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
        published?: boolean;
        categoryId?: string | null;
        sku?: string;
        trackStock?: boolean;
        stockQuantity?: number | null;
        variants?: Array<{ name: string; sku?: string; priceCents?: number | null; stockQuantity?: number | null }>;
      },
    ) => request<{ id: string }>(`/api/products/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    getProduct: (id: string) =>
      request<{
        id: string;
        name: string;
        description: string;
        priceCents: number;
        promoPriceCents?: number | null;
        status: string;
        published: boolean;
        images: Array<{ id: string; url: string }>;
      }>(`/api/products/${id}`),
    addProductImage: (id: string, assetId: string) =>
      request(`/api/products/${id}/images`, { method: "POST", body: JSON.stringify({ assetId }) }),
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
        body: JSON.stringify({
          ...body,
          hashtags: body.hashtags.map((tag) => tag.replace(/^#/, "").trim()).filter((tag) => tag.length >= 2).slice(0, 12),
        }),
      }),
    listAds: () =>
      request<
        Array<{
          id: string;
          title: string;
          description: string;
          hashtags: string[];
          tone: string;
          status: string;
          product: string | null;
          updatedAt: string;
        }>
      >("/api/ads"),
    archiveAd: (id: string) =>
      request<{ ok: boolean }>(`/api/ads/${id}/archive`, {
        method: "POST",
        body: JSON.stringify({}),
      }),
    softArchiveAd: (ad: {
      id: string;
      title: string;
      description: string;
      hashtags: string[];
      tone?: "PROFESSIONAL" | "FRIENDLY" | "URGENT" | "ELEGANT";
    }) =>
      request<{ id: string }>(`/api/ads/${ad.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: ad.title,
          description: ad.description,
          hashtags: ad.hashtags,
          tone: ad.tone || "PROFESSIONAL",
          status: "ARCHIVED",
        }),
      }).then(() => ({ ok: true as const })),
    archiveProduct: (id: string) => request<{ ok: boolean }>(`/api/products/${id}/archive`, { method: "POST" }),
    duplicateProduct: (id: string) => request(`/api/products/${id}/duplicate`, { method: "POST" }),
    voices: () =>
      request<Array<{ id: string; name: string; gender: string }>>("/api/voices"),
    listVideos: () =>
      request<
        Array<{
          id: string;
          title: string;
          durationSec: number;
          aspectRatio: string;
          updatedAt: string;
          render: { id: string; status: string; progress: number } | null;
        }>
      >("/api/videos"),
    createVideo: (body: {
      productId: string;
      objective: "SELL" | "OFFER" | "PRESENT" | "SOCIAL";
      style: "PREMIUM" | "OFFER" | "SHOWCASE" | "ELEGANT" | "SOCIAL" | "MINIMAL";
      durationSec: 10 | 15 | 30 | 45 | 60;
      aspectRatio: "R9_16" | "R1_1" | "R4_5" | "R16_9";
      motionMode?: "PHOTO" | "GENERATIVE";
      voiceProfileId?: string | null;
    }) =>
      request<{ id: string }>("/api/videos", {
        method: "POST",
        body: JSON.stringify({ ...body, motionMode: body.motionMode || "PHOTO" }),
      }),
    getVideo: (id: string) =>
      request<{
        id: string;
        title: string;
        script: string;
        durationSec: number;
        aspectRatio: "R9_16" | "R1_1" | "R4_5" | "R16_9";
        showPrice: boolean;
        showLogo: boolean;
        cta: string;
        narrationVolume: number;
        musicVolume: number;
        scenes: Array<{
          mediaAssetId?: string | null;
          durationMs: number;
          transition: "CUT" | "FADE" | "SLIDE" | "WIPE";
          zoom: number;
          panX: number;
          panY: number;
          headline: string;
          caption: string;
          cta: string;
        }>;
        renders: Array<{ id: string; status: string; progress: number; errorMessage?: string | null; outputAssetId?: string | null }>;
        product?: { id: string; name: string } | null;
      }>(`/api/videos/${id}`),
    updateVideo: (
      id: string,
      body: {
        title?: string;
        script?: string;
        cta?: string;
        showPrice?: boolean;
        showLogo?: boolean;
        narrationVolume?: number;
        musicVolume?: number;
        scenes?: Array<{
          mediaAssetId?: string | null;
          durationMs: number;
          transition: "CUT" | "FADE" | "SLIDE" | "WIPE";
          zoom: number;
          panX: number;
          panY: number;
          headline?: string;
          caption?: string;
          cta?: string;
        }>;
      },
    ) => request(`/api/videos/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    renderVideo: (id: string) =>
      request<{ id: string; status: string; progress: number }>(`/api/videos/${id}/render`, {
        method: "POST",
        headers: { "idempotency-key": `${Date.now()}-${Math.random().toString(36).slice(2, 10)}` },
      }),
    publications: () =>
      request<{
        items: unknown[];
        channels: Array<{ provider: string; status: string; detail: string }>;
      }>("/api/publications"),
    publish: (body: {
      channel: "WHATSAPP" | "INSTAGRAM" | "FACEBOOK";
      targetType: "PRODUCT" | "ADVERTISEMENT" | "VIDEO" | "CATALOG";
      targetId: string;
      caption?: string;
      scheduledAt?: string | null;
      confirmManual?: boolean;
    }) =>
      request<{ share: { whatsappUrl?: string; link?: string; caption?: string } | null }>("/api/publications", {
        method: "POST",
        body: JSON.stringify({ ...body, confirmManual: body.confirmManual ?? true }),
      }),
    billing: () =>
      request<{
        plans: Array<{
          id: string;
          code: string;
          name: string;
          description: string;
          priceCents: number;
          features: string[];
          badge?: string | null;
          highlighted?: boolean;
          icon?: string;
          prices: Array<{ interval: "MONTH" | "YEAR"; priceCents: number }>;
        }>;
        subscription: {
          status: string;
          cancelAtPeriodEnd: boolean;
          billingInterval: "MONTH" | "YEAR";
          currentPeriodEnd: string;
          plan: { code: string; name: string; priceCents: number };
        } | null;
        wallets: Array<{ kind: string; balance: number }>;
        invoices: Array<{ id: string; description: string; amountCents: number; status: string; createdAt: string; paidAt?: string | null }>;
        payments: Array<{ id: string; amountCents: number; status: string; method?: string | null; createdAt: string }>;
        usage: {
          videos: { used: number; cap: number };
          announcements: { used: number; cap: number };
          products: { used: number; cap: number };
          storage: { usedGb: number; capGb: number };
          periodEnd: string | null;
        };
        paymentsConfigured: boolean;
        policy: string;
        states: {
          expired: boolean;
          pendingPayment: boolean;
          cancelScheduled: boolean;
          upgradeAvailable: boolean;
          paymentsOffline: boolean;
        };
      }>("/api/billing"),
    checkout: (body: { planCode: string; interval?: "MONTH" | "YEAR" }) =>
      request<{ url: string | null; methods: string[]; status: string; prorationNote?: string }>("/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    changePlan: (body: { planCode: string; interval?: "MONTH" | "YEAR" }) =>
      request<{ url: string | null; methods: string[]; status: string; prorationNote?: string }>("/api/billing/change", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    cancelSubscription: () =>
      request<{ endsAt: string; retention: string }>("/api/billing/cancel", { method: "POST", body: JSON.stringify({}) }),
    reactivateSubscription: () => request<{ ok: boolean }>("/api/billing/reactivate", { method: "POST", body: JSON.stringify({}) }),
  };
}
