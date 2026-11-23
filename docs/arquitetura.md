# Arquitetura — VendeFacil AI

## 1. Arquitetura

Monorepo pnpm e Turborepo.

- `apps/web`: Next.js App Router. A interface e os Route Handlers.
- `apps/mobile`: Expo. Consome a mesma API e não compartilha componente de DOM.
- `packages/business`: regras, autorização e transações.
- `packages/database`: Prisma e PostgreSQL.
- `packages/ai`: provedores substituíveis.
- `packages/media`: armazenamento, validação de arquivo, arte e FFmpeg.
- `packages/validation` e `packages/types`: contratos.
- `packages/ui-tokens`: cor, raio e nome. O app web tem os componentes visuais.

Toda linha comercial carrega `organizationId`. Serviço de leitura e escrita filtra por essa organização. O papel de plataforma só entra nas rotas `/admin`.

## 2. Pastas

```
apps/web/src/app          telas e rotas HTTP
apps/web/src/components   interface
packages/*/src            bibliotecas
packages/database/prisma  schema, seed e migrations
```

## 3. Dados

Usuários, sessões e tokens de e-mail. Organização, membros e convites. Loja e ajustes. Categorias, produtos, variações e imagens. Arquivos. Anúncios e versões. Projetos, cenas e renders. Vozes, narrações e gerações de IA. Conexões sociais e publicações. Clientes, pedidos e contatos. Planos, assinaturas, faturas e checkouts. Carteiras e lançamentos de crédito. Eventos de uso, visualizações e cliques. Auditoria, jobs, notificações e suporte.

Dinheiro fica em centavos. Crédito de anúncio, narração, render com fotos e vídeo generativo são carteiras separadas.

## 4. Fluxos

1. Cadastro, verificação de e-mail e criação da loja no plano gratuito.
2. Produto com fotos. A publicação gera uma cópia pública sem metadados.
3. Anúncio: foto, fatos confirmados, geração ou texto manual, revisão e versão.
4. Vídeo: cenas e roteiro ficam no produto; o render em background não faz parte deste deploy.
5. Vitrine anônima, pedido registrado ou clique de WhatsApp. Os dois não se misturam.
6. Assinatura. Sem Mercado Pago, o plano gratuito continua e o pago não é marcado como quitado.

## 5. Design

Fundo `#F8F9FC`, superfície branca, texto `#171827`, roxo `#6336F5`. Verde só em sucesso. A entrada usa o painel escuro da referência. O app interno é claro, compacto, com a navegação Início, Produtos, Criar, Estúdio e Mais.

## 6. API

Base `/api`. Sessão por cookie HttpOnly na web e Bearer no mobile. Erros no formato `{ error: { code, message } }`.

Principais grupos: `/auth`, `/onboarding`, `/products`, `/uploads`, `/ai`, `/ads`, `/videos`, `/narration`, `/orders`, `/billing`, `/publications`, `/public/:slug` e `/admin`.

Geração e render exigem `Idempotency-Key`.

## 7. Armazenamento

O crédito é debitado na criação e estornado em falha final ou cancelamento, com chave única. Upload nasce privado, confirma tipo real e tamanho, e a cópia pública só existe para mídia publicada. Temporários pendentes há mais de um dia são apagados.

## 8. Fases

A fundação, o catálogo, a vitrine, os anúncios, o estúdio, os pedidos, os planos e a administração já têm código de produto. Homologação e produção ainda dependem de PostgreSQL, R2, SMTP, chave de IA e, se houver cobrança, Mercado Pago. Essas integrações não são declaradas prontas sem credencial e teste no ambiente de destino.
