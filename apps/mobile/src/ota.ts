import { Platform } from "react-native";

let inflight = false;

/** Baixa o pacote JS do canal do APK e recarrega. Não gera outro APK. */
export async function checkOtaUpdate() {
  if (__DEV__ || inflight || Platform.OS === "web") return;
  inflight = true;
  try {
    const Updates = await import("expo-updates");
    if (!Updates.isEnabled) return;
    const result = await Updates.checkForUpdateAsync();
    if (!result.isAvailable) return;
    const fetched = await Updates.fetchUpdateAsync();
    if (fetched.isNew) await Updates.reloadAsync();
  } catch {
    // Sem rede ou sem canal: o app segue com o pacote já instalado.
  } finally {
    inflight = false;
  }
}
