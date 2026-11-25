import Constants from "expo-constants";
import { createApiClient } from "@vendefacil/api-client";
import { getItem, setItem } from "./storage";

export const apiBase = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export const api = createApiClient({
  baseUrl: apiBase,
  getAccessToken: () => getItem("vf_access"),
  refresh: async () => {
    const refreshToken = await getItem("vf_refresh");
    if (!refreshToken) return null;
    const response = await fetch(`${apiBase}/api/auth/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-vendefacil-client": "mobile" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { accessToken?: string; refreshToken?: string };
    if (!payload.accessToken || !payload.refreshToken) return null;
    await setItem("vf_access", payload.accessToken);
    await setItem("vf_refresh", payload.refreshToken);
    return payload.accessToken;
  },
});
