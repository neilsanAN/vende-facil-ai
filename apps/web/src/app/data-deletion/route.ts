export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL = "tecnologialtdaatlas@gmail.com";

/** Página mínima (HTML puro) para a Meta validar a URL de exclusão de dados. */
export function GET() {
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Data Deletion - VendeFacil AI</title>
  <meta name="description" content="How to delete your VendeFacil AI account and Facebook/Instagram connected data."/>
</head>
<body style="font-family: system-ui, sans-serif; max-width: 720px; margin: 40px auto; padding: 0 16px; line-height: 1.55; color: #151229;">
  <h1>Exclusão de dados / Data deletion</h1>
  <p>Você pode excluir a conta e os dados do VendeFácil AI a qualquer momento, inclusive dados recebidos do Facebook e do Instagram (Página, conta e tokens).</p>
  <h2>Pelo aplicativo</h2>
  <ol>
    <li>Abra o VendeFácil AI e entre na conta.</li>
    <li>Toque em <strong>Mais</strong> → <strong>Excluir minha conta</strong>.</li>
    <li>Confirme com e-mail e senha.</li>
  </ol>
  <p>A conta é anonimizada, a loja sai do ar, arquivos são apagados e as conexões Meta são removidas.</p>
  <h2>Remover só Facebook/Instagram</h2>
  <ol>
    <li>No Facebook: Configurações → Integrações comerciais (Apps e sites).</li>
    <li>Remova <strong>VendeFácil</strong>.</li>
  </ol>
  <h2>Por e-mail</h2>
  <p>Envie para <a href="mailto:${EMAIL}">${EMAIL}</a> com o assunto “Exclusão de dados” e o e-mail da conta. Prazo: até 30 dias.</p>
  <p><a href="/privacidade">Política de privacidade</a> · <a href="/termos">Termos</a></p>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}
