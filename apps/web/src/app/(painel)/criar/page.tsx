import Link from "next/link";
import { PageHeader } from "@/components/ui";

const cards = [
  ["/anuncios/novo", "Criar anúncio", "Título, descrição e hashtags a partir da foto e dos fatos confirmados."],
  ["/estudio/arte", "Criar arte", "Montagem para stories, feed e retrato com a foto do produto."],
  ["/estudio/video/novo", "Criar vídeo", "Fotos com movimento, roteiro, narração e exportação."],
  ["/estudio/narracao", "Gerar narração", "Vozes de catálogo do provedor, sem clonagem."],
] as const;

export default function CreatePage() {
  return (
    <div>
      <PageHeader backHref="/inicio" title="Criar" text="Escolha o que vai produzir agora." />
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map(([href, title, text]) => <Link key={href} href={href} className="rounded-2xl border border-line bg-surface p-4 shadow-card"><h2 className="font-medium">{title}</h2><p className="mt-1 text-sm text-muted">{text}</p></Link>)}
      </div>
    </div>
  );
}
