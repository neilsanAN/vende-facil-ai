# VendeFácil AI

Plataforma para o vendedor cadastrar produtos, gerar anúncios e vídeos com IA quando houver provedor configurado, publicar uma vitrine e acompanhar pedidos e acessos reais.

## Subir localmente

1. Copie `.env.example` para `.env`.
2. Suba o PostgreSQL. Com Docker: `docker compose up -d`. Sem Docker: `node scripts/dev-postgres.mjs` e deixe esse processo aberto.
3. `corepack pnpm install`
4. `corepack pnpm db:generate`
5. `corepack pnpm db:deploy`
6. `corepack pnpm db:seed`
7. `corepack pnpm dev`

A web/API fica em http://localhost:3000.

### Produção no Render (igual Invento)

| Serviço | URL | Função |
|---|---|---|
| `vende-facil-api` | https://vende-facil-api.onrender.com | API + painel Next |
| `vende-facil-app` | https://vende-facil-app.onrender.com | App Expo (web) |
| `vende-facil-db` | — | PostgreSQL |

Defina `GEMINI_API_KEY` (e demais secrets) só no serviço **API**. O app usa `EXPO_PUBLIC_API_URL` apontando para a API.

No ambiente local, se o SMTP não estiver configurado, o cadastro mostra o link de verificação. Em produção esse link não volta na API.

Para criar um administrador da plataforma, defina `ADMIN_EMAIL` e `ADMIN_PASSWORD` antes do seed.

## O que já é funcional

- Conta, sessão com rotação, loja, papéis e isolamento por organização.
- Produtos, fotos, vitrine pública, pedidos e contatos.
- Anúncio por IA quando `OPENAI_API_KEY` existe; sem a chave, o texto é manual.
- Narração quando OpenAI ou ElevenLabs estão configurados.
- Arte composta no servidor com Sharp.
- Créditos e estorno de anúncio. Render de vídeo fica desligado neste deploy.
- WhatsApp por link real. Instagram permanece manual. Facebook publica pela API se o aplicativo Meta estiver configurado e a Página conectada.
- Planos, créditos e Mercado Pago quando o token e o segredo do webhook existem.

Sem credencial, a tela explica o estado. Nada é marcado como publicado ou pago por simulação.

A arquitetura está em `docs/arquitetura.md`.
