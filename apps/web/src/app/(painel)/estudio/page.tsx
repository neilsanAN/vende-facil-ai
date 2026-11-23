import Link from "next/link";
import { getContainer } from "@vendefacil/business";
import { CREDIT_LABEL, type CreditKind } from "@vendefacil/types";
import { PageHeader } from "@/components/ui";
import { tenant } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const session = await tenant();
  const [history, videos] = await Promise.all([getContainer().studio.history(session), getContainer().videos.list(session)]);
  return (
    <div>
      <PageHeader title="Estúdio" text="Anúncios, artes, vídeos e o consumo real de créditos." />
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {([["/anuncios/novo", "Criar anúncio"], ["/estudio/arte", "Criar arte"], ["/estudio/video/novo", "Criar vídeo"], ["/estudio/narracao", "Gerar narração"]] as const).map(([href, label]) => <Link key={href} href={href} className="rounded-xl border border-line bg-surface p-4 text-sm font-semibold">{label}</Link>)}
      </div>
      <h2 className="mb-2 mt-6 text-sm font-semibold">Créditos</h2>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">{history.wallets.map((wallet) => <div key={wallet.kind} className="rounded-xl border border-line bg-surface p-3"><p className="text-xs text-muted">{CREDIT_LABEL[wallet.kind as CreditKind]}</p><p className="text-lg font-semibold">{wallet.balance}</p></div>)}</div>
      <h2 className="mb-2 mt-6 text-sm font-semibold">Projetos recentes</h2>
      <ul className="space-y-2">{videos.map((video) => <li key={video.id}><Link className="block rounded-xl border border-line bg-surface px-3 py-3 text-sm" href={`/estudio/video/${video.id}`}>{video.title}</Link></li>)}</ul>
      <Link href="/estudio/historico" className="mt-4 inline-block text-sm text-primary">Histórico de gerações</Link>
    </div>
  );
}
