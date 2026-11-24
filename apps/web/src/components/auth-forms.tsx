"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, registerSchema, forgotSchema, resetSchema, onboardingSchema } from "@vendefacil/validation";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { LogoMark } from "@/components/shell";
import { Button, Field, areaClass, inputClass, useToast } from "@/components/ui";
import { api, ApiClientError, cn } from "@/lib/http";
import { useEffect, useMemo, useState } from "react";

function AuthLogo({ className }: { className?: string }) {
  return (
    <span className={cn("relative grid h-11 w-11 place-items-center", className)}>
      <span className="absolute inset-0 rounded-[12px] bg-[#A78BFA]/50 blur-md" />
      <span className="relative grid h-11 w-11 place-items-center rounded-[12px] bg-gradient-to-br from-[#9B7BFF] to-[#5B3DF0] shadow-[0_0_0_2px_rgba(196,181,253,0.55)]">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6.5 8.5h11l-.8 10.2a1.6 1.6 0 0 1-1.6 1.5H9a1.6 1.6 0 0 1-1.6-1.5L6.5 8.5Z" stroke="white" strokeWidth="1.7" />
          <path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" stroke="white" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M10.4 13.2v3.1l3.2-1.55-3.2-1.55Z" fill="white" />
        </svg>
      </span>
    </span>
  );
}

function Screen({ children, title, dark = false }: { children: React.ReactNode; title?: string; dark?: boolean }) {
  return (
    <main className={cn("min-h-screen", dark ? "bg-[radial-gradient(circle_at_top,_#1A1240_0%,_#070B18_46%)] text-white" : "bg-background text-ink")}>
      <div className="mx-auto flex min-h-screen w-full max-w-[390px] flex-col px-6 py-10">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoMark />
          <p className={cn("mt-4 text-2xl font-bold tracking-tight", dark ? "text-white" : "text-ink")}>
            VendeFácil <span className="text-primary">AI</span>
          </p>
          {title ? <p className={cn("mt-1 text-sm", dark ? "text-white/60" : "text-muted")}>{title}</p> : null}
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

function SocialButtons({ alwaysApple = false }: { alwaysApple?: boolean }) {
  const toast = useToast();
  const iphone = useIphone();
  const socialClass = "flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#D7D5E5] bg-white px-4 text-[13px] font-semibold leading-[16px] text-[#2A2740] shadow-sm";
  return (
    <div className="mt-5 space-y-3">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-[#D9D6E5]" />
        <span className="text-[12px] font-medium text-[#8B879C]">ou</span>
        <span className="h-px flex-1 bg-[#D9D6E5]" />
      </div>
      <button type="button" className={socialClass} onClick={() => toast("O acesso com Google entra quando o aplicativo estiver configurado.", "err")}>
        <GoogleMark />
        Continuar com Google
      </button>
      {alwaysApple || iphone ? (
        <button type="button" className={socialClass} onClick={() => toast("O acesso com Apple entra quando o aplicativo estiver configurado.", "err")}>
          <AppleMark />
          Continuar com Apple
        </button>
      ) : null}
    </div>
  );
}

function PasswordInput({
  label,
  password,
  registration,
  showStrength = false,
}: {
  label: string;
  password: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registration: any;
  showStrength?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const strength = useMemo(() => scorePassword(password), [password]);
  return (
    <div className="space-y-1.5">
      <Field label={label}>
        <div className="relative">
          <input className={cn(inputClass, "pr-10")} type={visible ? "text" : "password"} autoComplete="new-password" {...registration} />
          <button
            type="button"
            className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          >
            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </Field>
      {showStrength ? <PasswordStrength value={password} score={strength.score} checks={strength.checks} /> : null}
    </div>
  );
}

function scorePassword(password: string) {
  const checks = {
    length: password.length >= 8,
    letter: /[A-Za-z]/.test(password),
    number: /\d/.test(password),
    upper: /[A-Z]/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };
  const score = [checks.length, checks.letter, checks.number, checks.upper, checks.symbol].filter(Boolean).length;
  return { score, checks };
}

function PasswordStrength({
  value,
  score,
  checks,
}: {
  value: string;
  score: number;
  checks: { length: boolean; letter: boolean; number: boolean; upper: boolean; symbol: boolean };
}) {
  const labels = ["", "Fraca", "Fraca", "Média", "Forte", "Muito forte"];
  const colors = ["bg-line", "bg-danger", "bg-danger", "bg-warning", "bg-success", "bg-success"];
  const width = value ? `${Math.max(20, score * 20)}%` : "0%";
  return (
    <div className="space-y-2">
      <div className="h-1.5 overflow-hidden rounded-full bg-line">
        <div className={cn("h-full rounded-full transition-all duration-300 ease-out", colors[score])} style={{ width }} />
      </div>
      <p className="text-[10px] font-medium leading-[13px] text-muted">{value ? labels[score] : "Digite uma senha"}</p>
      <ul className="grid grid-cols-2 gap-1">
        {[
          [checks.length, "8+ caracteres"],
          [checks.letter, "Letras"],
          [checks.number, "Números"],
          [checks.upper, "Maiúscula"],
          [checks.symbol, "Símbolo"],
        ].map(([ok, text]) => (
          <li key={String(text)} className={cn("text-[10px] font-medium leading-[13px] transition-colors duration-200", ok ? "text-success" : "text-muted")}>
            {ok ? "✓" : "○"} {text}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LoginForm() {
  const router = useRouter();
  const form = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#2A1760_0%,#6B4AD6_42%,#E9E4F8_78%,#F7F5FC_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[390px] flex-col px-6 pb-8 pt-12">
        <div className="flex items-center justify-center gap-2.5">
          <AuthLogo />
          <p className="text-[22px] font-bold leading-7 tracking-tight text-white">
            VendeFácil <span className="text-[#D4C8FF]">AI</span>
          </p>
        </div>
        <h1 className="mt-8 text-center text-[24px] font-bold leading-8 tracking-tight text-white">Acesse sua conta</h1>

        <form
          className="mt-7"
          onSubmit={form.handleSubmit(async (values) => {
            setError("");
            try {
              await api("/api/auth/login", { method: "POST", body: JSON.stringify(values) });
              router.push("/inicio");
              router.refresh();
            } catch (cause) {
              if (cause instanceof ApiClientError && cause.code === "EMAIL_UNVERIFIED") {
                const details = cause.details as { email?: string; devCode?: string | null } | undefined;
                const email = details?.email || values.email;
                sessionStorage.setItem("vf_otp_email", email);
                if (details?.devCode) sessionStorage.setItem("vf_otp_dev", details.devCode);
                router.push(`/verificar-email?email=${encodeURIComponent(email)}`);
                return;
              }
              setError(cause instanceof ApiClientError ? cause.message : "Falha no acesso.");
            }
          })}
        >
          <div className="overflow-hidden rounded-2xl bg-white shadow-[0_12px_32px_rgba(42,23,96,0.18)]">
            <label className="flex items-center gap-3 px-4 py-3.5">
              <Mail size={18} className="shrink-0 text-[#9A96AB]" />
              <input
                className="h-6 w-full border-0 bg-transparent text-[13px] font-medium text-[#171827] outline-none placeholder:text-[#9A96AB]"
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                {...form.register("email")}
              />
            </label>
            <div className="mx-4 h-px bg-[#ECEAF3]" />
            <label className="flex items-center gap-3 px-4 py-3.5">
              <Lock size={18} className="shrink-0 text-[#9A96AB]" />
              <input
                className="h-6 w-full border-0 bg-transparent text-[13px] font-medium tracking-wide text-[#171827] outline-none placeholder:text-[#9A96AB]"
                type={visible ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                {...form.register("password")}
              />
              <button type="button" className="grid h-8 w-8 place-items-center text-[#9A96AB]" onClick={() => setVisible((v) => !v)} aria-label={visible ? "Ocultar senha" : "Mostrar senha"}>
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </label>
          </div>

          <div className="mt-3 flex justify-end">
            <Link href="/recuperar-senha" className="text-[12px] font-semibold text-[#6D4AFF]">
              Esqueci minha senha
            </Link>
          </div>

          {error ? <p className="mt-3 text-center text-[12px] text-danger">{error}</p> : null}

          <button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="mt-5 flex h-12 w-full items-center justify-center rounded-2xl bg-[#6D4AFF] text-[14px] font-semibold text-white shadow-[0_10px_24px_rgba(109,74,255,0.35)] disabled:opacity-50"
          >
            Entrar
          </button>
        </form>

        <SocialButtons alwaysApple />

        <p className="mt-auto pt-8 text-center text-[13px] text-[#5C5870]">
          Não tem uma conta?{" "}
          <Link href="/cadastro" className="font-bold text-[#6D4AFF]">
            Cadastre-se
          </Link>
        </p>
      </div>
    </main>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const form = useForm({ resolver: zodResolver(registerSchema), defaultValues: { name: "", email: "", password: "", acceptTerms: false as unknown as true } });
  const [error, setError] = useState("");
  const password = form.watch("password") || "";
  const strength = scorePassword(password);
  const canSubmit = strength.checks.length && strength.checks.letter && strength.checks.number && form.watch("acceptTerms");
  return (
    <Screen title="Criar conta com e-mail">
      <form
        className="space-y-3"
        onSubmit={form.handleSubmit(async (values) => {
          setError("");
          try {
            const result = await api<{ email: string; message: string; devCode?: string | null }>("/api/auth/register", { method: "POST", body: JSON.stringify(values) });
            sessionStorage.setItem("vf_otp_email", result.email);
            if (result.devCode) sessionStorage.setItem("vf_otp_dev", result.devCode);
            else sessionStorage.removeItem("vf_otp_dev");
            router.push(`/verificar-email?email=${encodeURIComponent(result.email)}`);
          } catch (cause) {
            setError(cause instanceof ApiClientError ? cause.message : "Não foi possível cadastrar.");
          }
        })}
      >
        <Field label="Nome">
          <input className={inputClass} autoComplete="name" {...form.register("name")} />
        </Field>
        <Field label="E-mail">
          <input className={inputClass} type="email" autoComplete="email" {...form.register("email")} />
        </Field>
        <PasswordInput label="Senha" password={password} registration={form.register("password")} showStrength />
        <label className="flex items-start gap-2 text-[12px] leading-4 text-muted">
          <input className="mt-0.5" type="checkbox" {...form.register("acceptTerms")} />
          <span>
            Li e aceito os <Link className="text-primary" href="/termos">termos</Link> e a <Link className="text-primary" href="/privacidade">política de privacidade</Link>.
          </span>
        </label>
        {error || form.formState.errors.acceptTerms ? <p className="text-sm text-danger">{error || form.formState.errors.acceptTerms?.message}</p> : null}
        <Button className="w-full" type="submit" disabled={!canSubmit || form.formState.isSubmitting}>
          Criar conta
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-muted">
        Já tem conta?{" "}
        <Link href="/entrar" className="font-semibold text-primary">
          Entrar
        </Link>
      </p>
    </Screen>
  );
}

export function ForgotForm() {
  const form = useForm({ resolver: zodResolver(forgotSchema), defaultValues: { email: "" } });
  const [link, setLink] = useState("");
  const [done, setDone] = useState(false);
  return (
    <Screen title="Recuperar senha">
      <p className="text-sm text-muted">Se o e-mail existir, enviaremos as instruções. A resposta não revela se a conta existe.</p>
      <form
        className="mt-5 space-y-3"
        onSubmit={form.handleSubmit(async (values) => {
          const result = await api<{ devResetUrl?: string | null }>("/api/auth/forgot", { method: "POST", body: JSON.stringify(values) });
          setDone(true);
          if (result.devResetUrl) setLink(result.devResetUrl);
        })}
      >
        <Field label="E-mail">
          <input className={inputClass} type="email" {...form.register("email")} />
        </Field>
        <Button className="w-full" type="submit">
          Enviar
        </Button>
      </form>
      {done ? <p className="mt-3 text-sm">Se houver uma conta, o próximo passo foi preparado.</p> : null}
      {link ? (
        <a className="mt-2 block text-sm text-primary" href={link}>
          Abrir redefinição deste ambiente local
        </a>
      ) : null}
    </Screen>
  );
}

export function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const form = useForm({ resolver: zodResolver(resetSchema), defaultValues: { token: params.get("token") || "", password: "" } });
  const [error, setError] = useState("");
  const password = form.watch("password") || "";
  const strength = scorePassword(password);
  const canSubmit = strength.checks.length && strength.checks.letter && strength.checks.number;
  return (
    <Screen title="Nova senha">
      <form
        className="space-y-3"
        onSubmit={form.handleSubmit(async (values) => {
          try {
            await api("/api/auth/reset", { method: "POST", body: JSON.stringify(values) });
            router.push("/entrar");
          } catch (cause) {
            setError(cause instanceof ApiClientError ? cause.message : "Link inválido.");
          }
        })}
      >
        <input type="hidden" {...form.register("token")} />
        <PasswordInput label="Nova senha" password={password} registration={form.register("password")} showStrength />
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button className="w-full" type="submit" disabled={!canSubmit || form.formState.isSubmitting}>
          Salvar senha
        </Button>
      </form>
    </Screen>
  );
}

export function VerifyPanel() {
  const params = useSearchParams();
  const router = useRouter();
  const initialEmail = params.get("email") || (typeof window !== "undefined" ? sessionStorage.getItem("vf_otp_email") || "" : "");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [devCode, setDevCode] = useState(() => (typeof window !== "undefined" ? sessionStorage.getItem("vf_otp_dev") || "" : ""));

  useEffect(() => {
    if (!email && typeof window !== "undefined") {
      const stored = sessionStorage.getItem("vf_otp_email");
      if (stored) setEmail(stored);
    }
  }, [email]);

  return (
    <Screen title="Verificar e-mail">
      <div className="rounded-2xl border border-line bg-surface px-3 py-3 text-[12px] leading-4 text-muted shadow-card">
        Enviamos um código de 6 dígitos para <strong className="text-ink">{email || "seu e-mail"}</strong>. Confira a caixa de entrada e o spam.
      </div>
      <form
        className="mt-5 space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          setBusy(true);
          try {
            await api("/api/auth/verify", { method: "POST", body: JSON.stringify({ email, code }) });
            sessionStorage.removeItem("vf_otp_dev");
            router.push("/onboarding");
            router.refresh();
          } catch (cause) {
            setError(cause instanceof ApiClientError ? cause.message : "Não foi possível confirmar.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {!initialEmail ? (
          <Field label="E-mail">
            <input className={inputClass} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </Field>
        ) : null}
        <Field label="Código de 6 dígitos">
          <input
            className={cn(inputClass, "tracking-[0.35em]")}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            required
          />
        </Field>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {message ? <p className="text-sm text-primary">{message}</p> : null}
        {devCode ? <p className="text-[10px] font-medium leading-[13px] text-muted">Ambiente local: use o código {devCode}</p> : null}
        <Button className="w-full" type="submit" disabled={busy || code.length !== 6 || !email}>
          Confirmar e-mail
        </Button>
      </form>
      <button
        type="button"
        className="mt-3 w-full text-center text-[12px] font-semibold text-primary"
        disabled={busy || !email}
        onClick={async () => {
          setError("");
          setBusy(true);
          try {
            const result = await api<{ message: string; devCode?: string | null }>("/api/auth/resend", {
              method: "POST",
              body: JSON.stringify({ email }),
            });
            setMessage(result.message || "Novo código enviado.");
            if (result.devCode) {
              sessionStorage.setItem("vf_otp_dev", result.devCode);
              setDevCode(result.devCode);
            }
          } catch (cause) {
            setError(cause instanceof ApiClientError ? cause.message : "Não foi possível reenviar o código.");
          } finally {
            setBusy(false);
          }
        }}
      >
        Reenviar código por e-mail
      </button>
      <p className="mt-4 text-center text-sm text-muted">
        <Link href="/entrar" className="font-semibold text-primary">
          Voltar para entrar
        </Link>
      </p>
    </Screen>
  );
}

export function OnboardingForm() {
  const router = useRouter();
  const form = useForm({ resolver: zodResolver(onboardingSchema), defaultValues: { storeName: "", description: "", whatsapp: "" } });
  const [error, setError] = useState("");
  return (
    <Screen title="Configure sua loja">
      <form
        className="mt-5 space-y-3"
        onSubmit={form.handleSubmit(async (values) => {
          try {
            await api("/api/onboarding", { method: "POST", body: JSON.stringify(values) });
            router.push("/inicio");
            router.refresh();
          } catch (cause) {
            setError(cause instanceof ApiClientError ? cause.message : "Não foi possível criar a loja.");
          }
        })}
      >
        <Field label="Nome da loja">
          <input className={inputClass} {...form.register("storeName")} />
        </Field>
        <Field label="Descrição">
          <textarea className={areaClass} {...form.register("description")} />
        </Field>
        <Field label="WhatsApp" hint="DDD e número. Usado no botão da vitrine.">
          <input className={inputClass} {...form.register("whatsapp")} />
        </Field>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button className="w-full" type="submit">
          Criar loja
        </Button>
      </form>
    </Screen>
  );
}
