import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { createApiClient } from "@vendefacil/api-client";

const baseUrl = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export const api = createApiClient({
  baseUrl,
  getAccessToken: () => SecureStore.getItemAsync("vf_access"),
  refresh: async () => {
    const refreshToken = await SecureStore.getItemAsync("vf_refresh");
    if (!refreshToken) return null;
    const response = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-vendefacil-client": "mobile" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { accessToken?: string; refreshToken?: string };
    if (!payload.accessToken || !payload.refreshToken) return null;
    await SecureStore.setItemAsync("vf_access", payload.accessToken);
    await SecureStore.setItemAsync("vf_refresh", payload.refreshToken);
    return payload.accessToken;
  },
});
