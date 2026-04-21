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

## Fase 2 — CRUD base ✅ *(código concluído a 2026-04-21)*

### Feito

- [x] Componentes shadcn adicionais: `table`, `select`, `textarea`, `badge`,
      `dropdown-menu`, `popover`, `separator`, `dialog`, `alert-dialog`
- [x] Helpers de formatação pt-PT (`lib/format.ts`): `formatCents`, parsing de
      strings euro PT, datas ISO, enums de tipo/estado de obra, unidades,
      categorias
- [x] Schemas Zod partilhados (`lib/validation/shared.ts`): `optionalText`,
      `moneyCents`, `moneyCentsOptional`, `percentageBps`, `emptyToNull`
- [x] Tipo `ActionState` e helper `zodIssuesToFieldErrors` para server actions
      com `useActionState`
- [x] **Clientes**: lista, criar, editar, apagar — com validação, toasts,
      confirmação AlertDialog. Apagar falha com mensagem clara se cliente
      tiver obras (FK restrict).
- [x] **Obras**: lista com filtros (estado + cliente), criar com geração
      automática de referência no formato `SUS-YYYY-NNN`, detalhe com edição
      completa (inclui alteração de estado), badges de estado, apagar com
      cascata a orçamentos/riscos/ficheiros
- [x] **Tabela de preços**: lista com pesquisa (código ou descrição) e filtro
      por categoria, criar, editar (inclui toggle ativo/inativo), apagar
- [x] **Importação CSV** da tabela de preços: parser client-side,
      pré-visualização linha a linha com validação Zod, upsert por código
      (item existente é atualizado), feedback ao utilizador
- [x] `tsc --noEmit`, `eslint` e `next build` passam sem erros

### Decisões

- Guardamos preços em cêntimos (INTEGER) e aceitamos input em formato PT
  (`1.234,56`) ou US (`1234.56`).
- Referência de obra é gerada contando obras do ano em curso com prefixo
  `SUS-YYYY-`. Race condition teórica aceite para single-tenant local.
- CSV: upsert por `codigo` — re-importar o mesmo ficheiro atualiza em vez de
  duplicar. Cabeçalhos normalizados (aceita acentos e variações).

### Pendente para teste manual do utilizador (antes do OK da Fase 2)

- [ ] Criar um cliente e ver na lista
- [ ] Editar esse cliente e apagar (verificar toast e redirect)
- [ ] Criar uma obra ligada ao cliente, confirmar referência `SUS-2026-001`
- [ ] Filtrar obras por estado e por cliente
- [ ] Editar estado da obra (ex.: `orcamentado` → `adjudicado`)
- [ ] Criar item na tabela de preços com preço `150,00` e confirmar formatação
- [ ] Importar CSV: testar com ficheiro válido e com erros deliberados
- [ ] Apagar cliente com obras associadas (deve bloquear com mensagem clara)

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
