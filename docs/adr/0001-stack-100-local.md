# ADR 0001 — Stack 100 % local em vez de Supabase + Vercel

- **Data:** 2026-04-21
- **Estado:** Aceite
- **Decide:** Gonçalo Duarte (CEO Sustain)

## Contexto

O [SPEC.md](../../SPEC.md) original (secção 4) propunha:

- Frontend/API em **Vercel**
- Base de dados e auth em **Supabase (Postgres)**
- Ficheiros em **Supabase Storage**

Durante a discussão de arranque, o CEO exigiu **custo fixo zero** e que a
aplicação corra no próprio PC, com acesso à internet apenas para a API
de IA (Anthropic). Razão citada: *"Supabase tem muitas limitações — se
não for de preço é de espaço."*

## Decisão

Abandonar Supabase e Vercel. Adoptar stack 100 % local:

| Camada | Decisão |
|---|---|
| DB | **SQLite** (ficheiro `data/sustain.db`) com **Drizzle ORM** |
| Storage | Filesystem local (`data/uploads/`) |
| Auth | **Auth.js v5** com Credentials provider (JWT, sem adapter) |
| Host | Next.js corre no PC do CEO (`npm run start` ou serviço Windows) |
| IA | Claude Sonnet 4.6 via Anthropic API (pay-per-use, Fase 5) |

Além disso:

- **Dinheiro** guardado em `INTEGER` cêntimos (evita bugs floating-point).
- **Percentagens** em basis points (23 % → 2300).
- **UUIDs** gerados em aplicação (`crypto.randomUUID()`).
- Totais de linhas de orçamento calculados em código TS (em vez de generated
  columns) para manter o schema simples e testável.
- Versão Next.js atualizada para **16** (create-next-app mais recente em
  2026-04-21 entrega 16.2.4; o SPEC pedia 15, mas 16 é backward compatible
  nas features usadas pelo SPEC).
- `middleware.ts` renomeado para `proxy.ts` (convenção Next.js 16).

## Consequências

### Positivas
- **Custo fixo: 0 €.** Apenas custo variável = chamadas Anthropic na Fase 5.
- Sem dependência de serviços externos. Dados ficam sempre na máquina do CEO.
- Sem limites de espaço, bandwidth ou tempo de inatividade.
- Schema simples, tipos TypeScript gerados pelo Drizzle.

### Negativas (assumidas e documentadas)
- **Acesso mobile em obra** (SPEC §13) **fica fora de âmbito.** A app só é
  acessível no PC do CEO e via rede local. Expor à internet exigiria
  Cloudflare Tunnel ou equivalente — adiado para futura decisão.
- **Multi-utilizador v2** (SPEC §3) exigirá migração de SQLite → Postgres.
  Drizzle permite trocar driver com mudança mínima de código, mas não é
  "zero refactoring" como o SPEC prometia. Estimativa: 1-2 dias.
- **RLS** (SPEC §5.2) não existe em SQLite. Segurança por utilizador tem de
  ser aplicada na camada de queries. Na v1 single-user é irrelevante.
- **Backups são da responsabilidade do utilizador.** Recomendação: Task
  Scheduler a copiar `data/sustain.db` para Google Drive/OneDrive diariamente
  (a configurar em fase posterior).
- **Resiliência:** crash do disco = perda de dados. Depende do plano de
  backup acima.

## Alternativas consideradas

1. **Supabase Free** — rejeitada: pausa após 7 dias inativo, 500 MB DB,
   1 GB storage. Inaceitável para uso profissional.
2. **Supabase Self-hosted via Docker** — rejeitada: mais pesada e complexa
   do que o necessário para um single-user.
3. **Supabase Cloud Pro (25 $/mês)** — rejeitada pelo requisito
   "custo zero".
