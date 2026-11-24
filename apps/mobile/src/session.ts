import { router } from "expo-router";
import { ApiClientError } from "@vendefacil/api-client";
import { api } from "./api";

/** Depois do login: vai para onboarding se ainda não há loja. */
export async function routeAfterAuth() {
  try {
    const { user } = await api.me();
    if (!user.emailVerified) {
      router.replace("/");
      return;
    }
    if (!user.organizationId || !user.role) {
      router.replace("/onboarding");
      return;
    }
    router.replace("/inicio");
  } catch {
    router.replace("/inicio");
  }
}

/** Se a API pedir loja, manda para o formulário em vez de só mostrar o erro. */
export function handleTenantError(cause: unknown) {
  if (cause instanceof ApiClientError && cause.code === "ONBOARDING_REQUIRED") {
    router.replace("/onboarding");
    return true;
  }
  return false;
}
