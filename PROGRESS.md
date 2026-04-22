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

## Fase 3 — Orçamento manual ✅ *(código concluído a 2026-04-21)*

### Feito

- [x] **Dashboard de obra** (`/obras/[id]`): mostra dados do cliente, datas,
      notas e lista de orçamentos com subtotal, total e margem por versão.
      Edição da obra movida para `/obras/[id]/editar`.
- [x] **Criar orçamento**: server action `createOrcamentoAction` gera nova
      versão (v1, v2, ...) e redireciona para o editor.
- [x] **Editor de orçamento** (`/obras/[id]/orcamento/[orcamentoId]`):
  - Metadata editável: estado, data emissão, validade, IVA%,
    condições de pagamento, observações.
  - Grelha editável com colunas: categoria, descrição, unidade,
    quantidade, € cliente, € custo interno, total €, origem
    (tabela/IA/manual), mover ↑↓, apagar.
  - Autocomplete para adicionar linhas da tabela de preços
    (pesquisa por código ou descrição, debounced 200ms, só itens ativos).
  - Botão "Linha manual" para adicionar linha vazia.
  - Totais em tempo real: subtotal, custo interno, IVA, margem teórica %,
    total c/ IVA (sticky no fundo do ecrã).
  - Guardar: server action valida com Zod, recalcula totais em cêntimos
    no servidor (dupla defesa), persiste em transação.
- [x] **Versões**: botão "Duplicar versão" copia todas as linhas para v+1,
      estado `rascunho`. Ação "Apagar" apaga só aquela versão.
- [x] Schema Zod `saveOrcamentoSchema` para header + linhas.
- [x] `tsc`, `eslint`, `next build` limpos.

### Decisões

- **Sem TanStack Table** apesar do SPEC o mencionar. A grelha é totalmente
  editável e não precisa de sort/filter/pagination (features principais do
  TanStack Table). Uma `<table>` com inputs controlados e estado React é mais
  simples e mais rápida de iterar. A dependência fica instalada para Fase 6
  se quisermos adicionar drag-to-reorder ou selection.
- Totais calculados no cliente (render) e recalculados no servidor (save) —
  fonte da verdade é o servidor. O cliente calcula só para feedback visual.
- Gravar substitui todas as linhas do orçamento (delete + insert em
  transação). Evita lógica complexa de diff e mantém `ordem` alinhada com
  a posição atual na UI.
- "Nova versão" duplica tudo (metadata + linhas). A versão anterior fica
  inalterada — serve de histórico.

### Pendente para teste manual (antes do OK da Fase 3)

- [ ] Abrir uma obra e criar o primeiro orçamento (v1)
- [ ] Adicionar 2-3 linhas da tabela de preços pelo autocomplete
- [ ] Adicionar 1 linha manual, editar quantidade e preço, ver totais
- [ ] Confirmar que subtotal + IVA + total batem certo
- [ ] Guardar, recarregar a página, verificar que tudo persiste
- [ ] Duplicar versão → v2 aparece como rascunho com as mesmas linhas
- [ ] Apagar v2 (a v1 mantém-se)

---

## Fase 4 — Export ✅ *(código concluído a 2026-04-21)*

### Feito

- [x] Dependências instaladas: `@react-pdf/renderer`, `exceljs`, `lucide-react`
- [x] **Data loader partilhado** (`lib/export/load-orcamento.ts`):
      carrega `orcamento + obra + cliente + linhas` e agrupa linhas por
      categoria (mantendo a `ordem` dentro de cada categoria). Junta dados
      fixos da empresa + `NIF_SUSTAIN` do `.env` (cai para `{{NIF_SUSTAIN}}`
      se vazio, conforme SPEC §2).
- [x] **PDF** (`lib/export/pdf.tsx`): template A4 em `@react-pdf/renderer`
      que segue SPEC §9 — cabeçalho "SUSTAIN REMODELAÇÕES" + slogan + linha
      de contactos, bloco ORÇAMENTO com cliente/ref/obra/data/morada/
      validade/NIF, tabela `# / Descrição / Un / Qtd / Preço unit / Total`
      agrupada por categoria numerada em maiúsculas, totais à direita
      (subtotal, IVA, TOTAL destacado com fundo `#2c3e50`), Condições
      Gerais (6 bullets padrão), assinaturas, rodapé fixo com morada + NIF,
      paginação `n / N`. Paleta do SPEC respeitada.
- [x] **Excel** (`lib/export/xlsx.ts`): workbook editável com `exceljs`,
      layout equivalente ao PDF, valores monetários guardados como float
      em EUR com formato `pt-PT`, TOTAL destacado, condições e observações
      em bloco. Página A4 portrait, fit-to-width.
- [x] **API routes** protegidas por `auth()` (o proxy não cobre `/api`):
  - `GET /api/export/pdf/[orcamentoId]` → PDF inline
    (`Content-Disposition: inline`) com filename `SUS-YYYY-NNN_vN.pdf`.
  - `GET /api/export/xlsx/[orcamentoId]` → XLSX como download
    (`attachment`) com filename `SUS-YYYY-NNN_vN.xlsx`.
  - Ambas `runtime = "nodejs"`, `dynamic = "force-dynamic"`, devolvem 401
    se não autenticadas e 404 se o orçamento não existir.
- [x] **Botões no editor** (`_components/export-buttons.tsx`): dois
      botões `outline` com ícones `FileDown` e `FileSpreadsheet` ao lado
      das ações "Duplicar versão / Apagar". PDF abre em nova tab; Excel
      descarrega.
- [x] `tsc`, `eslint` (incluindo nova regra `react-hooks/immutability`
      do React 19) e `next build` passam sem erros.

### Decisões

- **Snapshot, não motor**: o Excel não tem fórmulas de soma automática
  — a fonte da verdade é a app. Quem quiser editar valores no Excel
  tem de ajustar o total manualmente (ou reimportar — fora de âmbito v1).
- **Numeração global** das linhas (1…N) calculada sem mutação via
  `groupOffsets` (evita a regra `react-hooks/immutability` do React 19).
  Alternativa descartada: `let counter` mutado no render.
- **Dados da empresa hardcoded** em `load-orcamento.ts` (morada,
  telefone, email, etc. — só há uma Sustain). Apenas o NIF vem do
  `.env` porque ainda não foi fornecido. Quando chegar, basta
  preencher `NIF_SUSTAIN` no `.env` — sem redeploy nem migração.
- **Auth nas API routes**: proxy exclui `/api` do matcher, por isso
  cada route chama `await auth()` explicitamente.
- **Ficheiro `.tsx` para a route do PDF**: a route usa JSX
  (`<OrcamentoPDF data={data} />`), logo `route.tsx` em vez de `.ts`.

### Pendente para teste manual (antes do OK da Fase 4)

- [ ] Abrir um orçamento com várias categorias e clicar em **PDF** →
      deve abrir em nova tab com o template Sustain
- [ ] Confirmar que totais (subtotal / IVA / total) batem com os da UI
- [ ] Clicar em **Excel** → descarrega `.xlsx`, abre em Excel/Numbers,
      valores editáveis, formato `€` pt-PT correto
- [ ] Confirmar que categorias aparecem numeradas (1., 2., …) em
      maiúsculas, em ambos os exports
- [ ] Confirmar que o rodapé mostra `NIF: {{NIF_SUSTAIN}}` (placeholder)
      até o NIF real ser colocado no `.env`
- [ ] Testar com orçamento vazio (sem linhas) — deve exportar com tabela
      vazia sem crashar

---

## Fase 5 — Upload e IA ✅ *(código concluído a 2026-04-22)*

### Feito

- [x] Dependências instaladas: `@anthropic-ai/sdk` v0.90.0 + `checkbox`
      (shadcn) para o painel de riscos
- [x] **Storage local** (`lib/uploads/storage.ts`): raiz configurável via
      `UPLOADS_ROOT` (default `data/uploads/`, gitignored), path
      `{obraId}/{uuid}_{filename}`, filename sanitizado, MIME whitelist
      por extensão (jpg/jpeg/png/webp/pdf/xlsx), limite 20 MB, helpers
      `saveUpload` / `readUpload` / `deleteUpload`.
- [x] **XLSX → texto** (`lib/uploads/xlsx-to-text.ts`): extrai MTQ do
      Excel do cliente para passar como texto à IA (em vez de binário).
- [x] **Upload UI** na página da obra: formulário multi-file com select
      de tipo (8 tipos: foto/mtq/projeto 3D/elétrico/hidráulico/carpintaria/
      avac/outro), progresso + resumo do que entrou e do que foi
      ignorado, tabela de ficheiros com link para abrir/descarregar e
      botão apagar com AlertDialog. API route `/api/ficheiros/[id]`
      serve o ficheiro (inline para imagens/PDF, attachment para o
      resto) com `auth()` explícito.
- [x] **AI client** (`lib/ai/client.ts`): singleton lazy com
      `ANTHROPIC_API_KEY`, modelo default `claude-sonnet-4-6`,
      `estimarCustoCents()` a $3/M input + $15/M output @ 0.92 USD→EUR.
- [x] **Prompts** (`lib/ai/prompts/*`): `SYSTEM_ANALISE_OBRA` (SPEC §8)
      e `SYSTEM_SUGESTAO_PRECO` — JSON estrito, sem markdown, schemas
      Zod a validar output.
- [x] **Análise de obra** (`lib/ai/analise-obra.ts`): aceita contexto
      + imagens (base64) + PDFs (document blocks) + texto MTQ. Schema
      Zod: `trabalhos_propostos[]`, `riscos[]`, `observacoes_gerais`.
      Limites por análise: 8 imagens + 3 PDFs.
- [x] **Sugestão de preço** (`lib/ai/sugestao-preco.ts`): dada uma
      linha manual (descrição + unidade + categoria + quantidade),
      devolve `preco_cliente_eur`, `custo_interno_eur`, `justificacao`,
      `confianca`.
- [x] **Server actions** (`ia-actions.ts`):
  - `analisarObraAction(orcamentoId)` — puxa ficheiros, chama IA,
    insere linhas (`origem: "ia_sugestao"`, preço 0) e riscos,
    regista em `analises_ia` com tokens + custo em cêntimos.
  - `sugerirPrecoAction({...})` — pede sugestão para linha manual,
    regista no histórico mesmo sem aplicar.
  - `toggleRiscoResolvidoAction` + `deleteRiscoAction`.
- [x] **Botão "Analisar com IA"** no editor (`AnaliseIAButton`):
      `AlertDialog` a avisar que há custo + o output é aplicado ao
      orçamento; só aparece se a obra tem ficheiros carregados.
- [x] **Painel de riscos** (`RiscosPanel`): lista com checkbox
      "resolvido", badge de severidade (baixa/média/alta), custo
      adicional estimado, impacto e recomendação, botão apagar.
- [x] **Botão Sparkles na linha** do editor: pede sugestão de preço
      à IA para uma linha manual, preenche preço cliente + custo
      interno + justificação nas notas automaticamente.
- [x] `tsc`, `eslint` e `next build` passam sem erros.

### Decisões

- **Sem HEIC na v1**: é rejeitado no upload com mensagem clara
  ("converte para JPG"). Adicionar `heic-convert` fica para v2 se
  alguma câmara de iPhone continuar a importar HEIC.
- **Custo controlado**: cap rígido de 8 imagens + 3 PDFs por
  análise. Se houver mais ficheiros, ignoramos os extra (loguear
  e seguir) — user pode apagar os menos relevantes e repetir.
- **Linhas IA entram com preço 0**: o orçamentista ajusta
  manualmente ou chama o botão Sparkles por linha depois. Assim
  a IA nunca "decide" um preço sem revisão.
- **`FICHEIRO_TIPOS` fora do "use server"**: Next 16 rejeita
  exports não-async em ficheiros `"use server"`. Movidos para
  `app/(app)/obras/[id]/ficheiros/tipos.ts`.
- **Auth em `/api/ficheiros/[id]`**: o proxy exclui `/api`, logo
  a route chama `auth()` explicitamente antes de servir o blob.
- **Transação síncrona no better-sqlite3**: `db.transaction(tx => {...})`
  sem `async` (regra já aprendida na Fase 3).

### Pendente para teste manual (antes do OK da Fase 5)

- [ ] Criar `ANTHROPIC_API_KEY` no `.env` local
- [ ] Abrir uma obra, carregar 2-3 fotos + um MTQ (xlsx) + um
      projeto PDF, confirmar que aparecem na lista
- [ ] Apagar um ficheiro e confirmar que desaparece + o blob
      é removido do disco (`data/uploads/`)
- [ ] Abrir o orçamento dessa obra, clicar em **Analisar com IA**,
      confirmar toast com número de trabalhos + riscos + custo
      estimado e que observações gerais aparecem em toast
- [ ] Confirmar que linhas novas aparecem no editor com badge "IA"
      e preço 0 (pronto para ajustar)
- [ ] Confirmar que o painel de riscos apresenta severidade,
      impacto e recomendação; marcar um como resolvido e apagar
      outro
- [ ] Numa linha manual com descrição preenchida, clicar no
      ícone ✨ Sparkles e confirmar que o preço é sugerido + nota
      da IA é adicionada

---

## Fase 6 — Polimento *(pendente)*

- [ ] Filtros na listagem de obras
- [ ] Duplicar orçamento para novo
- [ ] Badges de estado
- [ ] Pequenos refinamentos visuais
