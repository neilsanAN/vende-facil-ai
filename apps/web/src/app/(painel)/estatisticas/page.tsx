import Link from "next/link";
import { DollarSign, Eye, MousePointer2, ShoppingCart } from "lucide-react";
import { formatBrl } from "@vendefacil/types";
import { getContainer } from "@vendefacil/business";
import { tenant } from "@/server/session";

export const dynamic = "force-dynamic";

const DOW = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const session = await tenant();
  const params = await searchParams;
  const range = params.range === "30d" ? 30 : params.range === "90d" ? 90 : 7;
  const rangeKey = range === 30 ? "30d" : range === 90 ? "90d" : "7d";
  const stats = await getContainer().commerce.stats(session, range);
  const hasSeries = stats.series.some((item) => item.views > 0);
  const max = Math.max(1, ...stats.series.map((item) => item.views));

  const metrics = [
    { label: "Visualizações", value: String(stats.views), icon: Eye },
    { label: "Cliques", value: String(stats.whatsappClicks), icon: MousePointer2 },
    { label: "Pedidos", value: String(stats.orders), icon: ShoppingCart },
    { label: "Vendas", value: formatBrl(stats.salesCents), icon: DollarSign },
  ];

  const productIds = stats.top.map((item) => item.product?.id).filter(Boolean) as string[];
  const thumbs = productIds.length
    ? await getContainer().db.productImage.findMany({
        where: { productId: { in: productIds } },
        orderBy: { position: "asc" },
      })
    : [];
  const thumbByProduct = new Map<string, string>();
  for (const item of thumbs) {
    if (!thumbByProduct.has(item.productId)) thumbByProduct.set(item.productId, `/api/media/${item.mediaAssetId}`);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-[22px] font-bold leading-7 tracking-tight text-ink">Estatísticas</h1>
        <Link
          href={`?range=${rangeKey}`}
          className="inline-flex h-10 items-center rounded-full border border-line bg-surface px-3 text-[11px] font-semibold text-ink"
        >
          {rangeKey === "7d" ? "Últimos 7 dias" : rangeKey === "30d" ? "30 dias" : "90 dias"}
        </Link>
      </div>

      <div className="mb-4 flex gap-2 overflow-auto">
        {(
          [
            ["7d", "Últimos 7 dias"],
            ["30d", "30 dias"],
            ["90d", "90 dias"],
          ] as const
        ).map(([key, label]) => (
          <Link
            key={key}
            href={`?range=${key}`}
            className={`inline-flex h-9 shrink-0 items-center rounded-full px-3 text-[11px] font-semibold ${rangeKey === key ? "bg-primary text-white" : "border border-line bg-surface text-ink"}`}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {metrics.map((item) => (
          <div key={item.label} className="rounded-[16px] border border-line bg-surface px-2 py-3 shadow-card">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary-soft text-primary">
              <item.icon size={14} />
            </span>
            <p className="mt-2 truncate text-[13px] font-bold leading-4 text-ink sm:text-[15px]">{item.value}</p>
            <p className="mt-0.5 text-[9px] font-medium leading-3 text-muted">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-[18px] border border-line bg-surface p-4 shadow-card">
        {hasSeries ? (
          <div className="relative h-32">
            <svg viewBox={`0 0 ${stats.series.length * 40} 128`} className="h-full w-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="gfill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7C5CFF" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#7C5CFF" stopOpacity="0" />
                </linearGradient>
              </defs>
              {(() => {
                const points = stats.series.map((item, i) => ({
                  x: i * 40 + 20,
                  y: 120 - (item.views / max) * 110,
                }));
                const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
                const last = points[points.length - 1]!;
                const first = points[0]!;
                const area = `${line} L ${last.x} 128 L ${first.x} 128 Z`;
                return (
                  <>
                    <path d={area} fill="url(#gfill)" />
                    <path d={line} fill="none" stroke="#7C5CFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    {points.map((p, i) => (
                      <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#7C5CFF" stroke="white" strokeWidth="2" />
                    ))}
                  </>
                );
              })()}
            </svg>
          </div>
        ) : (
          <div className="grid h-32 place-items-center rounded-xl bg-background text-center text-[12px] text-muted">Sem visualizações neste período.</div>
        )}
        {hasSeries && stats.series.length <= 7 ? (
          <div className="mt-2 flex justify-between text-[9px] font-medium text-muted">
            {stats.series.map((item) => {
              const d = new Date(item.day);
              return <span key={item.day}>{DOW[d.getDay() === 0 ? 6 : d.getDay() - 1] || item.day.slice(5)}</span>;
            })}
          </div>
        ) : null}
      </div>

      <div className="mb-2 mt-6 flex items-end justify-between">
        <h2 className="text-[13px] font-bold leading-4">Top produtos</h2>
        <Link href="/produtos" className="text-[11px] font-semibold text-primary">
          Ver todos
        </Link>
      </div>
      {stats.top.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma visualização de produto neste período.</p>
      ) : (
        <ul className="space-y-2">
          {stats.top.map((item) => {
            const thumb = item.product?.id ? thumbByProduct.get(item.product.id) : null;
            return (
              <li key={item.product?.id || item.views} className="flex items-center gap-3 rounded-[16px] border border-line bg-surface p-3 shadow-card">
                <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-background">
                  {thumb ? (
                    <img src={thumb} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-bold text-muted">{item.product?.name.slice(0, 2).toUpperCase()}</span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold leading-4 text-ink">{item.product?.name || "Produto removido"}</p>
                  {item.product?.priceCents ? <p className="text-[11px] font-semibold text-muted">{formatBrl(item.product.priceCents)}</p> : null}
                </span>
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted">
                  <Eye size={12} /> {item.views}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
