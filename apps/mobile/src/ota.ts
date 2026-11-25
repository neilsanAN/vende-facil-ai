import { AppState, Platform } from "react-native";

let inflight = false;
let lastBackgroundAt = 0;

AppState.addEventListener("change", (state) => {
  if (state === "background" || state === "inactive") lastBackgroundAt = Date.now();
});

export type OtaStatus = {
  message: string;
  detail?: string;
};

/** Baixa o pacote JS do canal do APK e recarrega. Não gera outro APK. */
export async function checkOtaUpdate(opts?: {
  force?: boolean;
  onStatus?: (status: OtaStatus) => void;
}) {
  if (__DEV__ || inflight || Platform.OS === "web") return false;
  // Evita reload ao voltar da câmera/galeria (fundo curto).
  if (!opts?.force && lastBackgroundAt && Date.now() - lastBackgroundAt < 120_000) return false;
  inflight = true;
  const report = (message: string, detail?: string) => opts?.onStatus?.({ message, detail });
  try {
    const Updates = await import("expo-updates");
    if (!Updates.isEnabled) return false;
    report("Buscando atualizações…", "Conferindo se há uma versão nova");
    const withTimeout = <T,>(promise: Promise<T>, ms: number) =>
      Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          setTimeout(() => reject(new Error("timeout")), ms);
        }),
      ]);
    const result = await withTimeout(Updates.checkForUpdateAsync(), 8_000);
    if (!result.isAvailable) return false;
    report("Baixando atualização…", "Melhorias e correções do app");
    const fetched = await withTimeout(Updates.fetchUpdateAsync(), 25_000);
    if (fetched.isNew) {
      report("Aplicando atualização…", "O app vai reiniciar em instantes");
      await Updates.reloadAsync();
      return true;
    }
  } catch {
    // Sem rede, timeout ou sem canal: segue com o pacote já instalado.
  } finally {
    inflight = false;
  }
  return false;
}
