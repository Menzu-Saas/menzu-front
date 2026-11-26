# Menzu · front

Páginas, cardápio, checkout e painel do restaurante (Next.js), publicados na **Vercel**.
A API fica no repositório [`menzu-api`](https://github.com/Menzu-Saas/menzu-api), publicada no Render.

## Como os dois conversam

O navegador só fala com o front. Tudo o que chega em `/api/*` é repassado para `MENZU_API_ORIGIN`.
O painel (ações de servidor) fala direto com o Supabase e a Asaas, por isso o front também precisa dos
segredos listados em `.env.example`. Os dois usam o mesmo banco.

## Publicar na Vercel

1. Importe este repositório; a branch de produção é a `main`.
2. Cadastre as variáveis de `.env.example` em **Settings → Environment Variables**.
3. Faça o deploy. Se faltar uma variável essencial, o build falha e diz qual é.

## Rodar no computador

```
npm ci
npm run dev
```

Abre em http://localhost:3003. Suba a API (`menzu-api`) em http://localhost:3004 e use esse endereço
em `MENZU_API_ORIGIN`.

## Código compartilhado

Parte de `src/lib` e `src/server` existe aqui e no [`menzu-api`](https://github.com/Menzu-Saas/menzu-api)
(login, Supabase, pagamentos, regras de pedido). Ao alterar um desses arquivos, leve a mesma mudança
para o outro repositório.

Este repositório é público. Nunca versione chaves, senhas ou dados de clientes.
