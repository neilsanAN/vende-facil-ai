import { AppState, Platform } from "react-native";

let inflight = false;
let lastBackgroundAt = 0;

AppState.addEventListener("change", (state) => {
  if (state === "background" || state === "inactive") lastBackgroundAt = Date.now();
});

/** Baixa o pacote JS do canal do APK e recarrega. Não gera outro APK. */
export async function checkOtaUpdate(opts?: { force?: boolean }) {
  if (__DEV__ || inflight || Platform.OS === "web") return;
  // Evita reload ao voltar da câmera/galeria (fundo curto).
  if (!opts?.force && lastBackgroundAt && Date.now() - lastBackgroundAt < 120_000) return;
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
