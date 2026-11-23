"use client";

import { useState } from "react";
import { Button, Field, inputClass, areaClass } from "@/components/ui";

export function PublicOrderForm({ slug, mode, productId }: { slug: string; mode: "order" | "contact"; productId?: string }) {
  const [done, setDone] = useState("");
  return (
    <form className="mt-6 space-y-3 rounded-2xl border border-line bg-surface p-4" onSubmit={async (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const path = mode === "order" ? `/api/public/${slug}/orders` : `/api/public/${slug}/contact`;
      const body = mode === "order"
        ? { productId, quantity: 1, name: data.get("name"), phone: data.get("phone"), email: data.get("email"), notes: data.get("notes") }
        : { name: data.get("name"), phone: data.get("phone"), email: data.get("email"), message: data.get("message") };
      const response = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      setDone(response.ok ? (mode === "order" ? "Pedido registrado. A loja ainda não recebeu pagamento por aqui." : "Mensagem enviada.") : "Não foi possível enviar.");
    }}>
      <h2 className="text-sm font-semibold">{mode === "order" ? "Registrar interesse" : "Falar com a loja"}</h2>
      <Field label="Nome"><input name="name" className={inputClass} required /></Field>
      <Field label="WhatsApp"><input name="phone" className={inputClass} required={mode === "order"} /></Field>
      <Field label="E-mail"><input name="email" className={inputClass} /></Field>
      {mode === "order" ? <Field label="Observação"><textarea name="notes" className={areaClass} /></Field> : <Field label="Mensagem"><textarea name="message" className={areaClass} required /></Field>}
      <Button type="submit">{mode === "order" ? "Enviar pedido" : "Enviar mensagem"}</Button>
      {done ? <p className="text-sm">{done}</p> : null}
    </form>
  );
}
