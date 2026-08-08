# SushiFull

Site do restaurante **SushiFull** (Valparaíso de Goiás/GO): cardápio online, pedido enviado pelo WhatsApp e painel gerencial.

## O que o site tem

| Rota | O que é |
|---|---|
| `/` | Home — hero com vídeo, destaques, reels, sobre e mapa |
| `/cardapio` | Cardápio completo com busca e filtro por categoria |
| `/bio` | Link na bio (o `/links` antigo redireciona para cá) |
| `/admin` | Painel gerencial, protegido por login |

O cliente monta o pedido no site e ele chega **formatado no WhatsApp** do restaurante. O pedido também fica registrado no banco para faturamento e histórico.

## Painel

Produtos · Categorias · Pedidos · Clientes · Entrega (cidades, bairros e regras de frete) · Formas de pagamento · Horários · Fotos · Configurações do negócio.

Tudo que aparece no site vem do banco: preços, fotos, endereço, redes sociais, horários e frete. **Nenhuma alteração exige deploy.**

Produtos, categorias e bairros também aceitam **importação por planilha CSV**, com prévia do que vai mudar antes de gravar.

## Stack

Next.js 16 (App Router) · React 19 · Tailwind v4 · Prisma + Postgres (Supabase) · NextAuth v4 · Zustand · Vercel Blob

## Rodando localmente

```bash
npm install
cp .env.example .env        # preencha as variáveis
npx prisma migrate deploy   # cria as tabelas
npm run db:seed             # admin, configurações e os 91 itens do cardápio
npm run dev
```

O seed lê o cardápio de [`prisma/data/menu.json`](prisma/data/menu.json) e é **idempotente**: rodar de novo não duplica nada e não sobrescreve foto, ativo ou destaque que tenham sido ajustados no painel.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` / `build` / `start` | Ciclo normal do Next |
| `npm test` | Testes das libs puras (horários, frete, dinheiro, WhatsApp) |
| `npm run db:deploy` / `db:seed` / `db:studio` | Banco |
| `npm run media:all` | Reprocessa fotos, vídeos e ícones a partir de `raw/` |

O material bruto (`raw/`) fica fora do repositório. Os arquivos já otimizados em `public/` são versionados.

## Variáveis de ambiente

Veja [`.env.example`](.env.example). Duas pegadinhas que valem ler antes:

- **`DIRECT_URL`**: o formato `db.<ref>.supabase.co:5432` responde só em **IPv6**. Em ambiente sem IPv6 (Vercel), use a *Session Pooler*.
- **Senha com caractere especial** na URL do banco precisa de percent-encoding (`@` → `%40`).

`NEXT_PUBLIC_ALLOW_INDEXING` ausente ou `false` bloqueia os buscadores — é o padrão enquanto o site está num endereço provisório.

## Notas de arquitetura

Três decisões que não são óbvias no código:

**O checkout é síncrono até o `window.open`.** Qualquer `await` antes dele faz o Safari/iOS tratar a abertura como não solicitada pelo usuário e bloquear o popup — o pedido morre ali. Por isso o registro do pedido vai em *fire-and-forget*.

**Dados de cliente nunca são consultados por telefone numa rota pública.** O autopreenchimento usa `localStorage` no aparelho. Uma rota que devolvesse nome e endereço a partir de um telefone digitado seria um vazamento enumerável de dado pessoal.

**Dinheiro é `Int` em centavos, do banco até a tela.** `Float` acumula erro no frete e no troco; `Decimal` do Prisma não atravessa a fronteira Server → Client Component.

---

Desenvolvido por [BeM Digital Online](https://bemdigital.online).
