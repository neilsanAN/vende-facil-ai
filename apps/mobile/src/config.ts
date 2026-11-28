import Constants from "expo-constants";

/** API de produção do mobile (Render). */
export const PRODUCTION_API_URL = "https://vende-facil-ai.onrender.com";

/**
 * Resolve a URL da API.
 * Em release/OTA, nunca usa localhost — isso quebrava o login quando o eas update
 * rodava sem EXPO_PUBLIC_API_URL no ambiente.
 */
export function resolveApiUrl() {
  const raw = String(Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || "")
    .trim()
    .replace(/\/$/, "");
  if (__DEV__) return raw || "http://localhost:3000";
  if (!raw || /localhost|127\.0\.0\.1/i.test(raw)) return PRODUCTION_API_URL;
  return raw;
}
