import Link from "next/link";
import { formatBrl, ORDER_STATUS_LABEL, type OrderStatus } from "@vendefacil/types";
import { getContainer } from "@vendefacil/business";
import { chipClass } from "@/components/controls";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { tenant } from "@/server/session";

export const dynamic = "force-dynamic";

const tabs = [
  { id: "todos", label: "Todos" },
  { id: "pendentes", label: "Pendentes" },
  { id: "concluidos", label: "Concluídos" },
] as const;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await tenant();
  const tab = (await searchParams).tab || "todos";
  const orders = await getContainer().commerce.listOrders(session);
  const visible = orders.filter((order) => {
    if (tab === "pendentes") return order.status === "NEW" || order.status === "CONFIRMED" || order.status === "PREPARING";
    if (tab === "concluidos") return order.status === "COMPLETED";
    return true;
  });
  return (
    <div>
      <PageHeader backHref="/mais" title="Pedidos" text="Pedidos registrados na vitrine ou lançados por você. Um clique no WhatsApp não entra aqui." />
      <div className="mb-4 flex gap-2">
        {tabs.map((item) => <Link key={item.id} href={item.id === "todos" ? "/pedidos" : `/pedidos?tab=${item.id}`} className={`${chipClass} ${tab === item.id ? "bg-primary text-white" : "border border-line bg-surface text-muted"}`}>{item.label}</Link>)}
      </div>
      {visible.length === 0 ? <EmptyState title="Nenhum pedido nesta aba" text="Quando um cliente enviar o formulário da vitrine, o pedido aparece com o valor real." /> : (
        <ul className="space-y-2">{visible.map((order) => {
          const tone = order.status === "COMPLETED" ? "success" : order.status === "PREPARING" ? "warning" : order.status === "CANCELLED" ? "danger" : "primary";
          return <li key={order.id}><Link href={`/pedidos/${order.id}`} className="flex items-center justify-between rounded-2xl border border-line bg-surface px-3 py-3 text-sm"><span>{order.customer.name}<span className="block text-xs text-muted">{order.items.length} {order.items.length === 1 ? "produto" : "produtos"} · {formatBrl(order.totalCents)}</span></span><Badge tone={tone}>{ORDER_STATUS_LABEL[order.status as OrderStatus]}</Badge></Link></li>;
        })}</ul>
      )}
    </div>
  );
}
