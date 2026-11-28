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

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("timeout")), ms);
    }),
  ]);
}

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
    if (!Updates.isEnabled) {
      report("Atualização indisponível", "Este instalador não recebe OTA");
      return false;
    }
    report("Buscando atualizações…", "Conferindo se há uma versão nova");

    let result: Awaited<ReturnType<typeof Updates.checkForUpdateAsync>> | null = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        result = await withTimeout(Updates.checkForUpdateAsync(), 20_000);
        break;
      } catch {
        if (attempt === 2) return false;
        report("Reconectando…", "Tentando de novo a atualização");
        await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
      }
    }
    if (!result?.isAvailable) return false;

    report("Baixando atualização…", "Melhorias e correções do app");
    const fetched = await withTimeout(Updates.fetchUpdateAsync(), 60_000);
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
