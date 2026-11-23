"use client";

import { useRouter } from "next/navigation";
import { Button, inputClass, useToast } from "@/components/ui";
import { api } from "@/lib/http";

export function ProductActions({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  return (
    <div className="flex gap-2">
      <Button variant="secondary" size="sm" onClick={async () => { const copy = await api<{ id: string }>(`/api/products/${id}/duplicate`, { method: "POST" }); router.push(`/produtos/${copy.id}`); }}>Duplicar</Button>
      <Button variant="danger" size="sm" onClick={async () => { if (!confirm("Arquivar este produto? Ele sai da vitrine.")) return; await api(`/api/products/${id}/archive`, { method: "POST" }); toast("Produto arquivado."); router.push("/produtos"); router.refresh(); }}>Arquivar</Button>
    </div>
  );
}

export function OrderStatusForm({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  return (
    <form className="flex gap-2" onSubmit={async (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      await api(`/api/orders/${id}`, { method: "PATCH", body: JSON.stringify({ status: data.get("status"), notes: data.get("notes"), paymentStatus: data.get("paymentStatus") }) });
      router.refresh();
    }}>
      <select name="status" defaultValue={status} className={inputClass}><option value="NEW">Novo</option><option value="CONFIRMED">Confirmado</option><option value="PREPARING">Em preparo</option><option value="COMPLETED">Concluído</option><option value="CANCELLED">Cancelado</option></select>
      <select name="paymentStatus" defaultValue="UNPAID" className={inputClass}><option value="UNPAID">Não pago</option><option value="PAID">Pago por fora</option><option value="NOT_APPLICABLE">Sem cobrança</option></select>
      <input name="notes" placeholder="Observação" className={inputClass} />
      <Button type="submit" size="sm">Atualizar</Button>
    </form>
  );
}
