"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical } from "lucide-react";
import { api } from "@/lib/http";
import { useToast } from "@/components/ui";

export function ProductCardMenu({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-label={`Opções de ${name}`}
        onClick={() => setOpen((value) => !value)}
        className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-background hover:text-ink"
      >
        <MoreVertical size={16} />
      </button>
      {open ? (
        <div className="absolute right-0 top-9 z-30 min-w-[160px] overflow-hidden rounded-xl border border-line bg-surface shadow-lift">
          <button
            type="button"
            className="block w-full px-3.5 py-2.5 text-left text-[13px] font-semibold text-ink hover:bg-background"
            onClick={() => {
              setOpen(false);
              router.push(`/produtos/${id}`);
            }}
          >
            Editar
          </button>
          <button
            type="button"
            className="block w-full px-3.5 py-2.5 text-left text-[13px] font-semibold text-ink hover:bg-background"
            onClick={async () => {
              setOpen(false);
              const copy = await api<{ id: string }>(`/api/products/${id}/duplicate`, { method: "POST" });
              toast("Produto duplicado.");
              router.push(`/produtos/${copy.id}`);
              router.refresh();
            }}
          >
            Duplicar
          </button>
          <button
            type="button"
            className="block w-full px-3.5 py-2.5 text-left text-[13px] font-semibold text-rose-600 hover:bg-rose-50"
            onClick={async () => {
              setOpen(false);
              if (!confirm("Excluir este produto? Ele sai da vitrine.")) return;
              await api(`/api/products/${id}/archive`, { method: "POST" });
              toast("Produto excluído.");
              router.refresh();
            }}
          >
            Excluir
          </button>
        </div>
      ) : null}
    </div>
  );
}
