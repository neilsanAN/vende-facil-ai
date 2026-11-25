"use client";

import { Button, Skeleton, useToast } from "@/components/ui";
import { api, ApiClientError } from "@/lib/http";

type PlanRow = {
  code: string;
  name: string;
  description: string;
  priceCents: number;
  features: string[];
  badge?: string | null;
  highlighted?: boolean;
  active: boolean;
  limits: Record<string, unknown>;
  prices: Array<{ interval: "MONTH" | "YEAR"; priceCents: number }>;
};

function priceFor(plan: PlanRow, interval: "MONTH" | "YEAR") {
  return plan.prices.find((item) => item.interval === interval)?.priceCents ?? plan.priceCents;
}

export function AdminPlansPanel({ plans }: { plans: PlanRow[] }) {
  const toast = useToast();
  if (!plans.length) return <Skeleton className="h-40 w-full" />;
  return (
    <div className="space-y-4">
      {plans.map((plan) => (
        <form
          key={plan.code}
          className="space-y-3 rounded-2xl border border-line bg-surface p-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            try {
              await api(`/api/admin/plans/${plan.code}`, {
                method: "PUT",
                body: JSON.stringify({
                  name: form.get("name"),
                  description: form.get("description"),
                  active: form.get("active") === "on",
                  badge: String(form.get("badge") || "") || null,
                  highlighted: form.get("highlighted") === "on",
                  prices: [
                    { interval: "MONTH", priceCents: Number(form.get("monthCents") || 0) },
                    { interval: "YEAR", priceCents: Number(form.get("yearCents") || 0) },
                  ],
                  priceCents: Number(form.get("monthCents") || 0),
                  features: String(form.get("features") || "")
                    .split("\n")
                    .map((line) => line.trim())
                    .filter(Boolean),
                  limits: {
                    ...plan.limits,
                    products: Number(form.get("products")),
                    members: Number(form.get("members")),
                    announcementCredits: Number(form.get("announcementCredits")),
                    narrationCredits: Number(form.get("narrationCredits")),
                    renderCredits: Number(form.get("renderCredits")),
                    storageGb: Number(form.get("storageGb")),
                    videoSoftCap: Number(form.get("videoSoftCap")),
                  },
                }),
              });
              toast(`Plano ${plan.code} atualizado.`);
            } catch (cause) {
              toast(cause instanceof ApiClientError ? cause.message : "Falha ao salvar plano.", "err");
            }
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[14px] font-bold">{plan.code}</h2>
            <label className="flex items-center gap-2 text-[12px]">
              <input name="active" type="checkbox" defaultChecked={plan.active} /> Ativo
            </label>
          </div>
          <input name="name" defaultValue={plan.name} className="w-full rounded-lg border border-line px-3 py-2 text-[12px]" />
          <textarea name="description" defaultValue={plan.description} className="w-full rounded-lg border border-line px-3 py-2 text-[12px]" rows={2} />
          <input name="badge" defaultValue={plan.badge || ""} placeholder="Badge" className="w-full rounded-lg border border-line px-3 py-2 text-[12px]" />
          <label className="flex items-center gap-2 text-[12px]">
            <input name="highlighted" type="checkbox" defaultChecked={Boolean(plan.highlighted)} /> Destacar
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px]">
              Mensal (centavos)
              <input name="monthCents" type="number" defaultValue={priceFor(plan, "MONTH")} className="mt-1 w-full rounded-lg border border-line px-3 py-2" />
            </label>
            <label className="text-[11px]">
              Anual (centavos)
              <input name="yearCents" type="number" defaultValue={priceFor(plan, "YEAR")} className="mt-1 w-full rounded-lg border border-line px-3 py-2" />
            </label>
          </div>
          <textarea
            name="features"
            defaultValue={(Array.isArray(plan.features) ? plan.features : []).join("\n")}
            rows={4}
            className="w-full rounded-lg border border-line px-3 py-2 text-[12px]"
            placeholder="Um benefício por linha"
          />
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {(
              [
                ["products", "Produtos (-1 ilim.)"],
                ["members", "Membros"],
                ["announcementCredits", "Créditos IA"],
                ["narrationCredits", "Narração"],
                ["renderCredits", "Render"],
                ["storageGb", "Storage GB"],
                ["videoSoftCap", "Teto vídeos"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="text-[11px]">
                {label}
                <input
                  name={key}
                  type="number"
                  defaultValue={Number((plan.limits as Record<string, number>)[key] ?? 0)}
                  className="mt-1 w-full rounded-lg border border-line px-3 py-2"
                />
              </label>
            ))}
          </div>
          <Button type="submit">Salvar {plan.name}</Button>
        </form>
      ))}
    </div>
  );
}
