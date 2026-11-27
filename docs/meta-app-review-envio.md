# Meta App Review — textos e roteiro (VendeFácil)

Copie e cole nos campos da análise. Grave **um** vídeo no celular e use o mesmo arquivo nas 3 permissões.

App: VendeFácil · Conta gravando: Administrador/Testador · App Meta: Não publicado (ok para teste)

---

## 1. pages_show_list

### Descrição (colar)
```
O VendeFácil AI é um aplicativo de gestão e publicação para lojistas. Usamos a permissão pages_show_list somente para listar as Páginas do Facebook que o usuário administra (Graph API GET /me/accounts), para que ele escolha a Página da loja ao tocar em “Conectar Facebook/Instagram”. Em seguida salvamos o id e o nome da Página selecionada e o page access token de forma criptografada, para publicar anúncios e produtos nessa Página. Não usamos essa permissão para anúncios pagos, scraping, analytics de terceiros nem para acessar Páginas que o usuário não autorizou no Login do Facebook.
```

### Conformidade
Marque: **Sim, estou em conformidade com o uso permitido.**

---

## 2. business_management

### Descrição (colar)
```
Usamos business_management apenas para permitir que o lojista conecte os ativos comerciais dele (Página do Facebook e Instagram profissional vinculado) por meio do Facebook Login for Business. Isso é necessário para obter a Página autorizada e a conta Instagram Business associada e publicar o conteúdo da loja a partir do VendeFácil. Não gerenciamos o Business Manager de terceiros, não acessamos contas de anúncio, não alteramos a estrutura do portfólio empresarial além da conexão OAuth explicitamente autorizada pelo usuário.
```

### Conformidade
Marque: **Sim, estou em conformidade com o uso permitido.**

### Testes de API
Em developers.facebook.com → VendeFácil → **Teste**, execute as ligações exigidas para `business_management` até o status ficar completo (não pode ficar “0 de 1”).

---

## 3. pages_read_engagement

### Descrição (colar)
```
Usamos pages_read_engagement em conjunto com pages_show_list para acessar a Página do Facebook autorizada pelo lojista, validar o acesso à Página escolhida e concluir o fluxo de conexão e publicação de conteúdo (posts/fotos de produtos e anúncios criados no VendeFácil). Não vendemos dados, não exibimos insights de engajamento a terceiros e não lemos conteúdo de Páginas não autorizadas. O uso é exclusivo do dono ou gestor da loja dentro do aplicativo.
```

### Conformidade
Marque: **Sim, estou em conformidade com o uso permitido.**

### Dependência
O envio já inclui `pages_show_list` (obrigatório junto com `pages_read_engagement`).

### Testes de API
Em **Teste**, execute as ligações exigidas para `pages_read_engagement` até completar.

---

## 4. Roteiro do screencast (grave 60–90 segundos)

Ferramenta: gravador de tela do Android (Configurações → Ferramentas do sistema → Gravador de tela) ou iPhone (Central de Controle → Gravação de tela).

Formato: MP4 · horizontal ou vertical · sem cortar a barra de URL da Meta no meio do OAuth.

| Tempo | O que mostrar |
|------:|----------------|
| 0:00 | Abrir o **VendeFácil** já logado |
| 0:05 | Ir em **Publicar** (ou tela de canais) |
| 0:10 | Ativar **Facebook** e/ou **Instagram** |
| 0:15 | Tocar **Conectar** |
| 0:20–0:45 | Tela da Meta: login (se pedir) → permitir Páginas → confirmar |
| 0:45 | Voltar ao app mostrando **conectado** (nome da Página / Instagram) |
| 0:55 | (Ideal) Publicar 1 anúncio/produto no Facebook e mostrar sucesso |
| 1:10 | Fim |

Use **a mesma** conta que é Administrador/Testador do app Meta e que tem Página + Instagram Business.

### Upload
1. Em cada permissão → **Começar** / carregar screencast  
2. Suba o **mesmo** MP4 nas 3  
3. Conclua os testes de API pendentes  
4. Envie a análise **só** com essas permissões (sem Marketing/Threads/WhatsApp/Ads)

---

## 5. O que NÃO enviar neste review
- Marketing API / ads_management / ads_read  
- Threads  
- WhatsApp Business API  

Isso atrasa ou rejeita o envio. O VendeFácil compartilha no WhatsApp pelo app do celular, não pela API Business.
