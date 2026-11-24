import Link from "next/link";
import { formatBrl } from "@vendefacil/types";
import { getContainer } from "@vendefacil/business";
import { chipClass } from "@/components/controls";
import { PageHeader, Stat } from "@/components/ui";
import { tenant } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const session = await tenant();
  const params = await searchParams;
  const range = params.range === "30d" ? 30 : params.range === "90d" ? 90 : 7;
  const stats = await getContainer().commerce.stats(session, range);
  const hasSeries = stats.series.some((item) => item.views > 0);
  const max = Math.max(1, ...stats.series.map((item) => item.views));
  return (
    <div>
      <PageHeader title="Estatísticas" text={`Últimos ${range} dias · números reais`} action={<div className="flex gap-2">{(["7d", "30d", "90d"] as const).map((item) => <Link key={item} href={`?range=${item}`} className={`${chipClass} ${range === Number(item.replace("d", "")) ? "bg-primary text-white" : "border border-line text-muted"}`}>{item === "7d" ? "7 dias" : item === "30d" ? "30 dias" : "90 dias"}</Link>)}</div>} />
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Visualizações" value={String(stats.views)} />
        <Stat label="Cliques" value={String(stats.whatsappClicks)} hint="WhatsApp" />
        <Stat label="Pedidos" value={String(stats.orders)} />
        <Stat label="Receita" value={formatBrl(stats.salesCents)} hint="Pedidos confirmados" />
      </div>
      <div className="mt-4 rounded-2xl border border-line bg-surface p-4 shadow-card">
        {hasSeries ? (
          <div className="flex h-32 items-end gap-1">
            {stats.series.map((item) => (
              <div key={item.day} className="flex-1 rounded-t bg-gradient-to-t from-[#5B3DF0] to-[#A78BFA]" style={{ height: `${Math.max(6, (item.views / max) * 100)}%` }} title={`${item.day}: ${item.views} visualizações`} />
            ))}
          </div>
        ) : (
          <div className="grid h-32 place-items-center rounded-xl bg-background text-center text-[12px] text-muted">
            Sem visualizações neste período.
          </div>
        )}
        <p className="mt-3 text-[11px] leading-4 text-muted">{stats.note}</p>
      </div>
      <h2 className="mb-2 mt-6 text-[12px] font-semibold leading-4">Top produtos</h2>
      {stats.top.length === 0 ? <p className="text-sm text-muted">Ainda não há visualização de produto neste período.</p> : (
        <ul className="space-y-2 text-sm">{stats.top.map((item) => <li key={item.product?.id || item.views} className="flex justify-between rounded-xl border border-line bg-surface px-3 py-2"><span>{item.product?.name || "Produto removido"}</span><span className="text-muted">{item.views}</span></li>)}</ul>
      )}
    </div>
  );
}
