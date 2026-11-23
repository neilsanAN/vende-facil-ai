"use client";
import { useRouter } from "next/navigation";
import { Button, inputClass } from "@/components/ui";
import { api } from "@/lib/http";
export function AdminReply({ id }: { id: string }) {
  const router = useRouter();
  return <form className="mt-2 flex gap-2" onSubmit={async (event) => { event.preventDefault(); const data = new FormData(event.currentTarget); await api(`/api/admin/tickets/${id}`, { method: "POST", body: JSON.stringify({ message: data.get("message") }) }); router.refresh(); }}><input name="message" className={`${inputClass} flex-1`} /><Button type="submit" size="sm">Responder</Button></form>;
}
