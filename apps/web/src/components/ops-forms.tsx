"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { formatBrl, CREDIT_LABEL, type CreditKind } from "@vendefacil/types";
import { Button, Field, inputClass, areaClass, buttonClass, useToast } from "@/components/ui";
import { api, ApiClientError } from "@/lib/http";
import { uploadFile } from "@/components/workspace";

export function StoreForm({ store }: { store: { name: string; description: string; whatsapp: string; published: boolean; slug: string; primaryColor: string; seoTitle: string; seoDescription: string; address: string; allowOrders: boolean; showPrices: boolean } }) {
  const toast = useToast();
  return (
    <form className="max-w-xl space-y-3" onSubmit={async (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      try {
        await api("/api/store", { method: "PATCH", body: JSON.stringify({ name: data.get("name"), description: data.get("description"), whatsapp: data.get("whatsapp"), published: data.get("published") === "on", primaryColor: data.get("primaryColor"), seoTitle: data.get("seoTitle"), seoDescription: data.get("seoDescription"), address: data.get("address"), allowOrders: data.get("allowOrders") === "on", showPrices: data.get("showPrices") === "on" }) });
        toast("Loja atualizada.");
      } catch (cause) { toast(cause instanceof ApiClientError ? cause.message : "Falha ao salvar.", "err"); }
    }}>
      <Field label="Nome"><input name="name" className={inputClass} defaultValue={store.name} /></Field>
      <Field label="Descrição"><textarea name="description" className={areaClass} defaultValue={store.description} /></Field>
      <Field label="WhatsApp"><input name="whatsapp" className={inputClass} defaultValue={store.whatsapp} /></Field>
      <Field label="Cor"><input name="primaryColor" className={inputClass} defaultValue={store.primaryColor} /></Field>
      <Field label="Título SEO"><input name="seoTitle" className={inputClass} defaultValue={store.seoTitle} /></Field>
      <Field label="Descrição SEO"><input name="seoDescription" className={inputClass} defaultValue={store.seoDescription} /></Field>
      <Field label="Endereço"><input name="address" className={inputClass} defaultValue={store.address} /></Field>
      <label className="flex gap-2 text-sm"><input type="checkbox" name="published" defaultChecked={store.published} /> Vitrine publicada</label>
      <label className="flex gap-2 text-sm"><input type="checkbox" name="showPrices" defaultChecked={store.showPrices} /> Mostrar preços</label>
      <label className="flex gap-2 text-sm"><input type="checkbox" name="allowOrders" defaultChecked={store.allowOrders} /> Receber pedidos pela vitrine</label>
      <Button type="submit">Salvar loja</Button>
      <p className="text-[12px] leading-4 text-muted">Link público: /v/{store.slug}</p>
      <label className={`${buttonClass} cursor-pointer border border-line bg-surface text-ink`}>
        <ImageIcon size={16} />
        Enviar logo
        <input className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
            toast("Use uma imagem JPG, PNG ou WebP de até 10 MB.", "err");
            return;
          }
          try {
            const asset = await uploadFile(file);
            await api("/api/store/logo", { method: "POST", body: JSON.stringify({ assetId: asset.id }) });
            toast("Logo enviada.");
          } catch (cause) {
            toast(cause instanceof ApiClientError ? cause.message : "Não foi possível enviar a logo.", "err");
          }
        }} />
      </label>
    </form>
  );
}

export function BillingPanel({ data }: { data: { paymentsConfigured: boolean; policy: string; plans: Array<{ code: string; name: string; description: string; priceCents: number }>; subscription: { status: string; cancelAtPeriodEnd: boolean; plan: { name: string; code: string } } | null; wallets: Array<{ kind: CreditKind; balance: number }>; invoices: Array<{ id: string; description: string; amountCents: number; status: string }> } }) {
  const toast = useToast();
  return (
    <div className="space-y-4">
      <p className="text-sm">Plano atual: <strong>{data.subscription?.plan.name || "Gratuito"}</strong> · {data.subscription?.status} {data.subscription?.cancelAtPeriodEnd ? "· cancelamento ao fim do período" : ""}</p>
      <p className="text-xs text-muted">{data.policy}</p>
      {!data.paymentsConfigured ? <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">A cobrança online não está configurada. Os limites do plano gratuito continuam valendo.</p> : null}
      <div className="grid gap-3 md:grid-cols-3">{data.plans.map((plan) => <article key={plan.code} className="rounded-2xl border border-line bg-surface p-4"><h2 className="font-medium">{plan.name}</h2><p className="mt-1 text-lg">{formatBrl(plan.priceCents)}<span className="text-xs text-muted">/mês</span></p><p className="mt-2 text-sm text-muted">{plan.description}</p><Button className="mt-3" variant={plan.code === data.subscription?.plan.code ? "secondary" : "primary"} onClick={async () => { try { const result = await api<{ url: string | null }>("/api/billing/checkout", { method: "POST", body: JSON.stringify({ planCode: plan.code }) }); if (result.url) window.location.href = result.url; else toast("Plano atualizado."); } catch (cause) { toast(cause instanceof ApiClientError ? cause.message : "Não foi possível alterar o plano.", "err"); } }}>{plan.priceCents === 0 ? "Usar gratuito" : "Assinar"}</Button></article>)}</div>
      <div className="grid grid-cols-2 gap-2">{data.wallets.map((wallet) => <div key={wallet.kind} className="rounded-xl border border-line bg-surface p-3 text-sm">{CREDIT_LABEL[wallet.kind]}<strong className="block text-lg">{wallet.balance}</strong></div>)}</div>
      <Button variant="secondary" onClick={async () => { await api("/api/billing/cancel", { method: "POST" }); toast("Cancelamento agendado para o fim do período."); }}>Cancelar ao fim do período</Button>
      <ul className="text-sm">{data.invoices.map((invoice) => <li key={invoice.id}>{invoice.description} · {formatBrl(invoice.amountCents)} · {invoice.status}</li>)}</ul>
    </div>
  );
}

export function TeamPanel({ members }: { members: Array<{ id: string; name: string; email: string; role: string }> }) {
  const toast = useToast();
  const [invite, setInvite] = useState("");
  return (
    <div className="space-y-4">
      <ul className="space-y-2 text-sm">{members.map((member) => <li key={member.id} className="flex items-center justify-between rounded-xl border border-line bg-surface px-3 py-2"><span>{member.name}<span className="block text-xs text-muted">{member.email} · {member.role}</span></span>{member.role !== "OWNER" ? <button className="text-danger" onClick={async () => { await api(`/api/team/${member.id}`, { method: "DELETE" }); toast("Membro removido."); }}>Remover</button> : null}</li>)}</ul>
      <form className="flex gap-2" onSubmit={async (event) => { event.preventDefault(); const data = new FormData(event.currentTarget); const result = await api<{ devInviteUrl?: string | null }>("/api/team", { method: "POST", body: JSON.stringify({ email: data.get("email"), role: data.get("role") }) }); setInvite(result.devInviteUrl || ""); toast("Convite criado."); }}>
        <input name="email" type="email" required className={inputClass} placeholder="e-mail" />
        <select name="role" className={inputClass}><option value="EDITOR">Editor</option><option value="ADMIN">Admin</option><option value="VIEWER">Leitura</option></select>
        <Button type="submit">Convidar</Button>
      </form>
      {invite ? <a className="text-sm text-primary" href={invite}>Link local do convite</a> : null}
    </div>
  );
}

export function SettingsPanel({ email }: { email: string }) {
  const toast = useToast();
  return (
    <div className="max-w-xl space-y-6">
      <form className="space-y-3" onSubmit={async (event) => { event.preventDefault(); const data = new FormData(event.currentTarget); await api("/api/profile", { method: "PATCH", body: JSON.stringify({ name: data.get("name"), phone: data.get("phone") }) }); toast("Perfil salvo."); }}>
        <Field label="Nome"><input name="name" className={inputClass} required /></Field>
        <Field label="Telefone"><input name="phone" className={inputClass} /></Field>
        <Button type="submit">Salvar perfil</Button>
      </form>
      <form className="space-y-3" onSubmit={async (event) => { event.preventDefault(); const data = new FormData(event.currentTarget); try { await api("/api/account/password", { method: "POST", body: JSON.stringify({ currentPassword: data.get("currentPassword"), password: data.get("password") }) }); toast("Senha alterada."); } catch (cause) { toast(cause instanceof ApiClientError ? cause.message : "Falha.", "err"); } }}>
        <Field label="Senha atual"><input name="currentPassword" type="password" className={inputClass} /></Field>
        <Field label="Nova senha"><input name="password" type="password" className={inputClass} /></Field>
        <Button type="submit" variant="secondary">Trocar senha</Button>
      </form>
      <a className="text-sm text-primary" href="/api/account/export">Baixar meus dados</a>
      <form className="space-y-3 rounded-xl border border-red-100 p-3" onSubmit={async (event) => { event.preventDefault(); if (!confirm("Excluir a conta e despublicar a loja?")) return; const data = new FormData(event.currentTarget); await api("/api/account/delete", { method: "POST", body: JSON.stringify({ email: data.get("email"), password: data.get("password") }) }); window.location.href = "/"; }}>
        <p className="text-sm">Exclusão da conta. Digite {email} para confirmar.</p>
        <input name="email" className={inputClass} />
        <input name="password" type="password" className={inputClass} />
        <Button variant="danger" type="submit">Excluir conta</Button>
      </form>
    </div>
  );
}
