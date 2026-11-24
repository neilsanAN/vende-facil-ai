"use client";

import { useEffect } from "react";

/** Mantém a sessão viva ao voltar da câmera/galeria (página remonta sem vf_access). */
export function SessionKeepAlive() {
  useEffect(() => {
    let busy = false;
    async function ensure() {
      if (busy || document.visibilityState === "hidden") return;
      busy = true;
      try {
        const me = await fetch("/api/auth/me", { credentials: "include" });
        if (me.ok) return;
        await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
      } catch {
        /* rede offline: segue com o que houver */
      } finally {
        busy = false;
      }
    }
    void ensure();
    const onShow = () => void ensure();
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("pageshow", onShow);
    window.addEventListener("focus", onShow);
    return () => {
      document.removeEventListener("visibilitychange", onShow);
      window.removeEventListener("pageshow", onShow);
      window.removeEventListener("focus", onShow);
    };
  }, []);
  return null;
}
