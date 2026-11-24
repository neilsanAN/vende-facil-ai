import { formatBrl, ORDER_STATUS_LABEL, type OrderStatus } from "@vendefacil/types";
import { getContainer } from "@vendefacil/business";
import { PageHeader } from "@/components/ui";
import { OrderStatusForm } from "@/components/actions";
import { tenant } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const session = await tenant();
  const { id } = await params;
  const order = await getContainer().commerce.getOrder(session, id);
  return (
    <div>
      <PageHeader backHref="/pedidos" title={order.customer.name} text={`${order.origin} · pagamento ${order.paymentStatus}`} />
      <ul className="mb-4 space-y-1 text-sm">{order.items.map((item) => <li key={item.id}>{item.quantity}× {item.name} · {formatBrl(item.unitPriceCents)}</li>)}</ul>
      <p className="mb-4 text-sm font-semibold">Total {formatBrl(order.totalCents)}</p>
      <OrderStatusForm id={order.id} status={order.status} />
      <h2 className="mb-2 mt-6 text-sm font-semibold">Histórico</h2>
      <ul className="space-y-1 text-sm text-muted">{order.events.map((event) => <li key={event.id}>{ORDER_STATUS_LABEL[event.status as OrderStatus]} · {event.note}</li>)}</ul>
    </div>
  );
}
