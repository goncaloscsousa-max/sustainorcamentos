# Progresso — Sustain Orçamentos

Acompanhamento do progresso fase a fase conforme [SPEC.md §11](./SPEC.md).

---

## Fase 1 — Fundação ✅ *(concluída a 2026-04-21)*

### Feito

- [x] Next.js 16 + React 19 + TypeScript (`strict`) + Tailwind v4 + App Router
- [x] shadcn/ui inicializado (base `neutral`, Radix)
- [x] Componentes shadcn instalados: `button`, `input`, `label`, `card`, `sonner`
- [x] SQLite + Drizzle ORM + drizzle-kit configurados
- [x] Schema Drizzle com as 10 tabelas do SPEC (`users`, `clientes`, `obras`,
      `tabela_precos`, `orcamentos`, `linhas_orcamento`, `riscos_identificados`,
      `ficheiros_obra`, `analises_ia`, `execucao_obra`)
- [x] Primeira migration (`0000_init.sql`) gerada e aplicada
- [x] Auth.js v5 com Credentials provider (email + password, JWT)
- [x] Proxy (`proxy.ts`) a proteger rotas da app e redireciona para `/login`
- [x] Página `/login` com server action + validação Zod + feedback de erro
- [x] Grupo `(app)` com layout autenticado: header + navegação + botão "Sair"
- [x] Home (`/`) com cards de navegação para Obras / Clientes / Tabela de preços
- [x] Seed script (`npm run db:seed`) cria utilizador admin inicial
- [x] `.env.example` + `.env` dev (gitignored)
- [x] `README.md` com arranque local documentado
- [x] ADR 0001 a registar o desvio Supabase → SQLite local
- [x] `next build` passa sem erros nem warnings
- [x] `tsc --noEmit` passa

### Desvios do SPEC (documentados no ADR 0001)

- Stack: SQLite local + filesystem em vez de Supabase + Vercel.
- Acesso mobile em obra: **fora de âmbito** na v1.
- Next.js 16 em vez de 15 (create-next-app mais recente; backward compatible).
- `middleware.ts` → `proxy.ts` (convenção Next 16).
- Dinheiro em cêntimos e percentagens em bps (em vez de `numeric`).
- Totais calculados em código TS em vez de generated columns.

### Pendente para teste manual do utilizador (antes do OK da Fase 1)

- [ ] Confirmar que `npm run dev` arranca sem erros em <http://localhost:3000>
- [ ] Confirmar que `/login` aparece e aceita credenciais do `.env`
- [ ] Confirmar que após login é redirecionado para `/` com o nome do
      utilizador no header
- [ ] Confirmar que "Sair" funciona
- [ ] Confirmar que aceder a `/` deslogado redireciona para `/login`

### Pendente estrutural (não bloqueia Fase 1, planeado para fases seguintes)

- [ ] `git init` + commit inicial (SPEC: "Git desde o dia 1")
- [ ] Criar repo no GitHub (decisão AFG vs pessoal adiada)
- [ ] Rotas `/obras`, `/clientes`, `/tabela-precos` ainda não existem
      (serão criadas na Fase 2)

---

## Fase 2 — CRUD base *(pendente)*

- [ ] Clientes (lista, criar, editar, eliminar)
- [ ] Obras (lista, criar, detalhe)
- [ ] Tabela de preços (lista, importar CSV, editar)

---

## Fase 3 — Orçamento manual *(pendente)*

- [ ] Editor com grelha editável (TanStack Table)
- [ ] Adicionar linhas da tabela de preços (fuzzy match)
- [ ] Cálculo de totais em tempo real
- [ ] Guardar versões

---

## Fase 4 — Export *(pendente)*

- [ ] PDF com `@react-pdf/renderer` (template Sustain)
- [ ] Excel com `exceljs` (layout actual)

---

## Fase 5 — Upload e IA *(pendente)*

- [ ] Upload de fotos/documentos para `data/uploads/`
- [ ] Integração Anthropic (Claude Sonnet 4.6) para análise de obra
- [ ] Aplicação dos resultados (linhas + riscos) ao orçamento
- [ ] Sugestão de preços por IA

---

## Fase 6 — Polimento *(pendente)*

- [ ] Filtros na listagem de obras
- [ ] Duplicar orçamento para novo
- [ ] Badges de estado
- [ ] Pequenos refinamentos visuais
