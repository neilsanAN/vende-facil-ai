import Link from "next/link";

export const metadata = {
  title: "Exclusão de dados — VendeFácil AI",
  description: "Como excluir sua conta e seus dados do VendeFácil AI, inclusive dados vindos do Facebook e do Instagram.",
};

const SUPPORT_EMAIL = "neilton.saints@gmail.com";

export default function DataDeletionPage() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-10 text-sm leading-6">
      <Link href="/" className="text-[12px] font-semibold text-primary">
        ← Voltar
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Exclusão de dados do usuário</h1>
      <p className="mt-4">
        Você pode excluir a sua conta e todos os dados do VendeFácil AI a qualquer momento, inclusive os dados recebidos do Facebook e do Instagram
        (nome da Página, conta do Instagram e tokens de acesso).
      </p>

      <h2 className="mt-6 text-lg font-semibold">Pelo painel</h2>
      <ol className="mt-2 list-decimal space-y-1 pl-5">
        <li>
          Entre na sua conta em{" "}
          <Link href="/configuracoes" className="font-semibold text-primary">
            vende-facil-ai.onrender.com/configuracoes
          </Link>
          .
        </li>
        <li>Na seção <strong>Exclusão da conta</strong>, digite seu e-mail e sua senha.</li>
        <li>Toque em <strong>Excluir conta</strong> e confirme.</li>
      </ol>
      <p className="mt-2">
        A conta é anonimizada, a loja é despublicada, os arquivos são apagados e as conexões com Facebook e Instagram (incluindo os tokens de acesso) são removidas imediatamente.
      </p>

      <h2 className="mt-6 text-lg font-semibold">Remover só a conexão com Facebook/Instagram</h2>
      <ol className="mt-2 list-decimal space-y-1 pl-5">
        <li>No Facebook, acesse <strong>Configurações e privacidade</strong> → <strong>Configurações</strong> → <strong>Integrações comerciais</strong> (ou Apps e sites).</li>
        <li>Encontre <strong>VendeFácil AI</strong> e toque em <strong>Remover</strong>.</li>
        <li>Os tokens deixam de funcionar na hora e são apagados dos nossos servidores.</li>
      </ol>

      <h2 className="mt-6 text-lg font-semibold">Por e-mail</h2>
      <p className="mt-2">
        Envie um pedido para{" "}
        <a className="font-semibold text-primary" href={`mailto:${SUPPORT_EMAIL}?subject=Exclus%C3%A3o%20de%20dados`}>
          {SUPPORT_EMAIL}
        </a>{" "}
        com o assunto <strong>“Exclusão de dados”</strong> e o e-mail da sua conta. Confirmamos e concluímos a exclusão em até 30 dias.
      </p>

      <p className="mt-6 text-[12px] text-gray-500">
        Pedidos de venda já registrados podem ser mantidos pelo prazo exigido por lei, sem o e-mail da conta excluída. Veja também a{" "}
        <Link href="/privacidade" className="text-primary">
          Política de privacidade
        </Link>
        .
      </p>
    </article>
  );
}
