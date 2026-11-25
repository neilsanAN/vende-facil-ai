/** Retorno do checkout (Mercado Pago). O app é mobile — esta página só fecha o ciclo do browser. */
export default async function PaymentReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ pagamento?: string }>;
}) {
  const params = await searchParams;
  const status = params.pagamento;
  const title =
    status === "ok" ? "Pagamento enviado" : status === "pendente" ? "Pagamento pendente" : status === "falha" ? "Pagamento não concluído" : "Retorno do checkout";
  const text =
    status === "falha"
      ? "Volte ao app MeuVende+ e tente de novo em Planos."
      : "Volte ao app MeuVende+. A assinatura só libera depois da confirmação do provedor (não só por esta tela).";

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      <h1 className="text-[20px] font-bold tracking-tight text-ink">{title}</h1>
      <p className="mt-2 text-[13px] font-medium leading-5 text-muted">{text}</p>
    </main>
  );
}
