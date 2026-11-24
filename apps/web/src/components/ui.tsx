"use client";

import Link from "next/link";
import { createContext, useContext, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/http";
import { buttonClass, sectionLabelClass } from "@/components/controls";

export { areaClass, areaSoftClass, buttonClass, chipClass, inputClass, inputSoftClass, sectionLabelClass } from "@/components/controls";

const buttonStyles = cva(buttonClass, {
  variants: {
    variant: {
      primary: "bg-primary text-white hover:bg-primary-hover",
      secondary: "border border-line bg-surface text-ink hover:border-primary/50",
      ghost: "text-ink hover:bg-background",
      danger: "bg-danger text-white hover:opacity-90",
    },
    size: { sm: "h-10", md: "h-10", lg: "h-10" },
  },
  defaultVariants: { variant: "primary", size: "md" },
});

export function Button({ className, variant, size, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonStyles>) {
  return <button className={cn(buttonStyles({ variant, size }), className)} {...props} />;
}

export function Field({
  label,
  hint,
  section = false,
  children,
}: {
  label: string;
  hint?: string;
  section?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className={cn(sectionLabelClass, section && "text-[12px] font-semibold leading-4 text-ink")}>{label}</span>
      {children}
      {hint ? <span className="block text-[10px] font-medium leading-[13px] text-muted">{hint}</span> : null}
    </label>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" | "primary" }) {
  const tones = {
    neutral: "bg-background text-muted",
    success: "bg-emerald-400/15 text-success",
    warning: "bg-amber-400/15 text-warning",
    danger: "bg-rose-400/15 text-danger",
    primary: "bg-primary-soft text-primary",
  };
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-tiny font-semibold", tones[tone])}>{children}</span>;
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-10 text-center">
      <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted">{text}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-line/80", className)} />;
}

export function PageHeader({
  title,
  text,
  action,
  backHref,
}: {
  title: string;
  text?: string;
  action?: ReactNode;
  backHref?: string;
}) {
  return (
    <div className="mb-5 pt-1">
      <div className="flex items-center gap-2">
        {backHref ? (
          <Link
            href={backHref}
            aria-label="Voltar"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink shadow-card"
          >
            <ChevronLeft size={20} strokeWidth={2.2} />
          </Link>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className={cn("font-bold tracking-tight text-ink", backHref ? "text-[17px] leading-[21px]" : "text-[20px] leading-6")}>{title}</h1>
            {action}
          </div>
          {text ? <p className="mt-1 text-[12px] leading-4 text-muted">{text}</p> : null}
        </div>
      </div>
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-3 py-3 shadow-card">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 text-lg font-bold tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

const ToastContext = createContext<(message: string, tone?: "ok" | "err") => void>(() => undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ message: string; tone: "ok" | "err" } | null>(null);
  return (
    <ToastContext.Provider value={(message, tone = "ok") => { setToast({ message, tone }); setTimeout(() => setToast(null), 3400); }}>
      {children}
      {toast ? <div className={cn("fixed bottom-20 left-1/2 z-50 w-[min(92vw,380px)] -translate-x-1/2 rounded-xl px-4 py-3 text-sm text-white shadow-lift md:bottom-6", toast.tone === "err" ? "bg-danger" : "bg-[#1B2438]")}>{toast.message}</div> : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

export function Modal({ open, title, children, onClose }: { open: boolean; title: string; children: ReactNode; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/60 p-4 sm:place-items-center" role="presentation" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-line bg-surface p-5 shadow-lift" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <h2 className="text-lg font-bold">{title}</h2>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}