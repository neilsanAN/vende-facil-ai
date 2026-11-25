"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";
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
