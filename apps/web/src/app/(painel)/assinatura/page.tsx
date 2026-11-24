import { getContainer } from "@vendefacil/business";
import { BillingPanel } from "@/components/ops-forms";
import { PageHeader } from "@/components/ui";
import { tenant } from "@/server/session";
export const dynamic = "force-dynamic";
export default async function Page() {
  const session = await tenant();
  const data = await getContainer().billing.overview(session);
  return <div><PageHeader backHref="/mais" title="Assinatura e créditos" /><BillingPanel data={JSON.parse(JSON.stringify(data))} /></div>;
}
