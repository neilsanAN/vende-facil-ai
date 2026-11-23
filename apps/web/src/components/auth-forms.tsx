"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, registerSchema, forgotSchema, resetSchema, onboardingSchema } from "@vendefacil/validation";
import { LogoMark } from "@/components/shell";
import { Button, Field, areaClass, inputClass, useToast } from "@/components/ui";
import { api, ApiClientError } from "@/lib/http";
import { useEffect, useState } from "react";

function Screen({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#1A1240_0%,_#070B18_46%)] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 py-10">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoMark />
          <p className="mt-4 text-2xl font-bold tracking-tight">VendeFácil AI</p>
          {title ? <p className="mt-1 text-sm text-white/60">{title}</p> : null}
        </div>
        {children}
      </div>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.7-6.6 7.1l6.3 5.3C37.4 38.4 44 34 44 24c0-1.3-.1-2.7-.4-3.5z" />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M16.37 12.72c.03 2.52 2.21 3.36 2.24 3.37-.02.06-.35 1.2-1.15 2.37-.69 1.01-1.41 2.02-2.54 2.04-1.11.02-1.47-.66-2.74-.66s-1.67.64-2.72.68c-1.09.04-1.92-1.09-2.62-2.1-1.43-2.06-2.52-5.82-1.05-8.36.73-1.26 2.03-2.06 3.44-2.08 1.07-.02 2.09.72 2.74.72.65 0 1.86-.89 3.14-.76.53.02 2.03.22 2.99 1.63-.08.05-1.79 1.04-1.73 3.15zM14.77 6.3c.58-.7.97-1.68.86-2.65-.83.03-1.84.55-2.44 1.25-.53.62-1 1.61-.88 2.56.93.07 1.88-.47 2.46-1.16z" />
    </svg>
  );
}

function useIphone() {
  const [iphone, setIphone] = useState(false);
  useEffect(() => {
    setIphone(/iPhone/i.test(navigator.userAgent));
  }, []);
  return iphone;
}

function SocialButtons() {
  const toast = useToast();
  const iphone = useIphone();
  const socialClass = "flex h-10 w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-[12px] font-semibold leading-[15px]";
  return (
    <div className="mt-4 space-y-2">
      <p className="text-center text-[10px] font-medium leading-[13px] text-white/40">ou</p>
      <button type="button" className={socialClass} onClick={() => toast("O acesso com Google entra quando o aplicativo estiver configurado.", "err")}>
        <GoogleMark />
        Continuar com Google
      </button>
      {iphone ? (
        <button type="button" className={socialClass} onClick={() => toast("O acesso com Apple entra quando o aplicativo estiver configurado.", "err")}>
          <AppleMark />
          Continuar com Apple
        </button>
      ) : null}
    </div>
  );
}

export function LoginForm() {
  const router = useRouter();
  const form = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const [error, setError] = useState("");
  return (
    <Screen title="Acesse sua conta">
      <form className="space-y-3" onSubmit={form.handleSubmit(async (values) => {
        setError("");
        try { await api("/api/auth/login", { method: "POST", body: JSON.stringify(values) }); router.push("/inicio"); router.refresh(); }
        catch (cause) { setError(cause instanceof ApiClientError ? cause.message : "Falha no acesso."); }
      })}>
        <Field label="E-mail"><input className={inputClass} type="email" {...form.register("email")} /></Field>
        <Field label="Senha"><input className={inputClass} type="password" {...form.register("password")} /></Field>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>Entrar</Button>
      </form>
      <div className="mt-3 text-center"><Link href="/recuperar-senha" className="text-[10px] font-medium leading-[13px] text-white/70 underline">Esqueci minha senha</Link></div>
      <SocialButtons />
      <Link href="/cadastro" className="mt-4 block text-center text-sm text-[#C4B5FF]">Criar conta grátis</Link>
    </Screen>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const form = useForm({ resolver: zodResolver(registerSchema), defaultValues: { name: "", email: "", password: "", acceptTerms: false as unknown as true } });
  const [error, setError] = useState("");
  return (
    <Screen title="Criar conta grátis">
      <form className="mt-5 space-y-3" onSubmit={form.handleSubmit(async (values) => {
        setError("");
        try {
          const result = await api<{ devVerificationUrl?: string | null }>("/api/auth/register", { method: "POST", body: JSON.stringify(values) });
          if (result.devVerificationUrl) sessionStorage.setItem("vf_verify", result.devVerificationUrl);
          router.push("/verificar-email");
        } catch (cause) { setError(cause instanceof ApiClientError ? cause.message : "Não foi possível cadastrar."); }
      })}>
        <Field label="Nome"><input className={inputClass} {...form.register("name")} /></Field>
        <Field label="E-mail"><input className={inputClass} type="email" {...form.register("email")} /></Field>
        <Field label="Senha" hint="Mínimo de 8 caracteres, com letras e números."><input className={inputClass} type="password" {...form.register("password")} /></Field>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" {...form.register("acceptTerms")} /> <span>Li e aceito os <Link className="text-primary" href="/termos">termos</Link> e a <Link className="text-primary" href="/privacidade">política de privacidade</Link>.</span></label>
        {error || form.formState.errors.acceptTerms ? <p className="text-sm text-danger">{error || form.formState.errors.acceptTerms?.message}</p> : null}
        <Button className="w-full" type="submit">Criar conta</Button>
      </form>
    </Screen>
  );
}

export function ForgotForm() {
  const form = useForm({ resolver: zodResolver(forgotSchema), defaultValues: { email: "" } });
  const [link, setLink] = useState("");
  const [done, setDone] = useState(false);
  return (
    <Screen title="Recuperar senha">
      <p className="mt-1 text-sm text-muted">Se o e-mail existir, enviaremos as instruções. A resposta não revela se a conta existe.</p>
      <form className="mt-5 space-y-3" onSubmit={form.handleSubmit(async (values) => {
        const result = await api<{ devResetUrl?: string | null }>("/api/auth/forgot", { method: "POST", body: JSON.stringify(values) });
        setDone(true);
        if (result.devResetUrl) setLink(result.devResetUrl);
      })}>
        <Field label="E-mail"><input className={inputClass} type="email" {...form.register("email")} /></Field>
        <Button className="w-full" type="submit">Enviar</Button>
      </form>
      {done ? <p className="mt-3 text-sm">Se houver uma conta, o próximo passo foi preparado.</p> : null}
      {link ? <a className="mt-2 block text-sm text-primary" href={link}>Abrir redefinição deste ambiente local</a> : null}
    </Screen>
  );
}

export function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const form = useForm({ resolver: zodResolver(resetSchema), defaultValues: { token: params.get("token") || "", password: "" } });
  const [error, setError] = useState("");
  return (
    <Screen title="Nova senha">
      <form className="mt-5 space-y-3" onSubmit={form.handleSubmit(async (values) => {
        try { await api("/api/auth/reset", { method: "POST", body: JSON.stringify(values) }); router.push("/entrar"); }
        catch (cause) { setError(cause instanceof ApiClientError ? cause.message : "Link inválido."); }
      })}>
        <input type="hidden" {...form.register("token")} />
        <Field label="Nova senha"><input className={inputClass} type="password" {...form.register("password")} /></Field>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button className="w-full" type="submit">Salvar senha</Button>
      </form>
    </Screen>
  );
}

export function VerifyPanel() {
  const params = useSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState("Confirme o e-mail para abrir a loja.");
  const [link, setLink] = useState("");
  return (
    <Screen title="Verificar e-mail">
      <p className="mt-2 text-sm text-muted">{message}</p>
      <Button className="mt-5 w-full" onClick={async () => {
        const stored = typeof window !== "undefined" ? sessionStorage.getItem("vf_verify") : null;
        const token = params.get("token") || (stored ? new URL(stored).searchParams.get("token") : "");
        if (!token) { setMessage("Abra o link enviado ou solicite outro."); return; }
        try { await api("/api/auth/verify", { method: "POST", body: JSON.stringify({ token }) }); router.push("/onboarding"); }
        catch (cause) { setMessage(cause instanceof ApiClientError ? cause.message : "Não foi possível confirmar."); }
      }}>Confirmar e-mail</Button>
      <button className="mt-3 text-sm text-primary" onClick={async () => {
        const result = await api<{ devVerificationUrl?: string | null }>("/api/auth/resend", { method: "POST" });
        if (result.devVerificationUrl) { sessionStorage.setItem("vf_verify", result.devVerificationUrl); setLink(result.devVerificationUrl); }
        setMessage("Se o envio estiver configurado, a mensagem foi disparada.");
      }}>Enviar novamente</button>
      {link ? <a className="mt-3 block text-sm text-primary" href={link}>Link local de verificação</a> : null}
    </Screen>
  );
}

export function OnboardingForm() {
  const router = useRouter();
  const form = useForm({ resolver: zodResolver(onboardingSchema), defaultValues: { storeName: "", description: "", whatsapp: "" } });
  const [error, setError] = useState("");
  return (
    <Screen title="Configure sua loja">
      <form className="mt-5 space-y-3" onSubmit={form.handleSubmit(async (values) => {
        try { await api("/api/onboarding", { method: "POST", body: JSON.stringify(values) }); router.push("/inicio"); router.refresh(); }
        catch (cause) { setError(cause instanceof ApiClientError ? cause.message : "Não foi possível criar a loja."); }
      })}>
        <Field label="Nome da loja"><input className={inputClass} {...form.register("storeName")} /></Field>
        <Field label="Descrição"><textarea className={areaClass} {...form.register("description")} /></Field>
        <Field label="WhatsApp" hint="DDD e número. Usado no botão da vitrine."><input className={inputClass} {...form.register("whatsapp")} /></Field>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button className="w-full" type="submit">Criar loja</Button>
      </form>
    </Screen>
  );
}
