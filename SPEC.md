# Sustain Orçamentos — Especificação Técnica

**Versão:** 1.0
**Data:** Abril 2026
**Autor:** Gonçalo Duarte (responsável Sustain) | Briefing técnico preparado via Claude

---

## 1. Contexto de Negócio

A **Sustain Remodelações** é uma empresa portuguesa especializada em remodelações de interiores e exteriores, com posicionamento moderno e personalizado ("O ambiente certo transforma-te. As pessoas certas elevam-te.").

Atualmente, os orçamentos são preparados manualmente em Excel, com preços calculados à sensibilidade e sem histórico estruturado de rentabilidade. Isto gera três problemas:

1. **Tempo excessivo** por orçamento (horas a dias).
2. **Inconsistência de preços** entre obras semelhantes.
3. **Falta de visibilidade** sobre rentabilidade real por obra e por tipo de trabalho.

Esta ferramenta é uma **plataforma web de apoio à orçamentação**, que combina análise por IA (Claude Sonnet 4.6) com uma base de dados própria de preços e histórico, para:

- Gerar orçamentos profissionais em minutos.
- Identificar riscos técnicos automaticamente a partir de fotos e projetos.
- Construir ao longo do tempo uma base de conhecimento (preços praticados, rentabilidade, padrões de execução).

O utilizador inicial é o **CEO da Sustain** (Gonçalo Duarte). A plataforma deve estar pronta para multi-utilizador no futuro, sem refactoring de base.

---

## 2. Dados da Empresa

**Identificação**
- Nome comercial: SUSTAIN (Sustain Remodelações)
- Morada: Rua Fernando Almeida, Nº 21, 4470-288 Vermoim, Portugal
- Telefone: +351 912 514 048
- Email: info@sustain.pt
- Website: https://sustain.pt
- Instagram: @sustain_remodelacoes
- Responsável: Gonçalo Duarte

> **NIF ainda não fornecido** — deixar placeholder `{{NIF_SUSTAIN}}` em toda a UI e documentos exportados, documentado em ficheiro `.env.example`.

**Identidade e linguagem**
- Slogan principal: *"Transforme o seu espaço. Transforme a sua vida."*
- Tom: moderno, funcional, personalizado, próximo.
- O PDF de orçamento deve refletir esta identidade — limpo, espaçado, tipografia moderna sans-serif.

**Condições comerciais padrão**
- IVA: 23%
- Plano de pagamento: 40% início / 40% meio da obra / 20% conclusão
- Validade do orçamento: 30 dias
- Garantia: 5 anos sobre mão-de-obra (conforme legislação portuguesa em vigor)

---

## 3. Objetivo e Âmbito do MVP

### Objetivo
Entregar uma ferramenta web funcional em que o utilizador:
1. Cria uma obra.
2. Faz upload de fotos, MTQ, e projetos de especialidades.
3. Recebe da IA uma proposta de lista de trabalhos + riscos técnicos.
4. Revê e edita numa grelha estilo Excel.
5. Aplica preços da tabela Sustain (ou aceita sugestões da IA para itens sem referência).
6. Exporta PDF branded para o cliente + Excel editável interno.
7. Mantém histórico de todas as obras e orçamentos.

### Fora do âmbito do MVP (planeado para v2)
- Dashboard de rentabilidade com gráficos.
- Seguimento de execução de obra (fases, progresso).
- Link público para cliente aprovar orçamento.
- Integração com contabilidade.
- Multi-utilizador com perfis (admin, orçamentista, gestor de obra).

**Princípio:** o schema de base de dados já contempla a v2, para evitar refactoring futuro.

---

## 4. Stack Técnica

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Next.js API Routes (Route Handlers) |
| Base de Dados | Supabase (Postgres) |
| Storage | Supabase Storage (fotos, PDFs, Excels originais) |
| Auth | Supabase Auth (email + password) |
| IA | Claude Sonnet 4.6 via API oficial Anthropic (`claude-sonnet-4-5` ou equivalente mais recente) |
| PDF | `@react-pdf/renderer` (render server-side) |
| Excel | `exceljs` |
| Validação | `zod` |
| Forms | `react-hook-form` + `zod` |
| Tabelas editáveis | `@tanstack/react-table` |
| Deploy | Vercel (frontend + API) + Supabase Cloud (DB/Storage) |
| Gestão de estado | React Server Components + `zustand` apenas onde fizer sentido |

**Variáveis de ambiente (`.env.example`):**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
NIF_SUSTAIN=
```

---

## 5. Modelo de Dados (Supabase / Postgres)

### 5.1 Tabelas

```sql
-- Utilizadores (complementa auth.users do Supabase)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  role text not null default 'admin' check (role in ('admin', 'orcamentista', 'gestor')),
  created_at timestamptz default now()
);

-- Clientes
create table clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  nif text,
  email text,
  telefone text,
  morada text,
  notas text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Obras
create table obras (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id) on delete restrict,
  referencia text unique not null, -- ex: "SUS-2026-001"
  titulo text not null,            -- ex: "Remodelação integral T2 Cedofeita"
  morada_obra text not null,
  tipo text not null check (tipo in (
    'remodelacao_total', 'remodelacao_parcial', 'cozinha', 'wc',
    'exterior', 'comercial', 'outro'
  )),
  estado text not null default 'orcamentado' check (estado in (
    'orcamentado', 'adjudicado', 'em_execucao', 'concluido', 'perdido', 'cancelado'
  )),
  data_visita date,
  data_inicio_prevista date,
  data_conclusao_prevista date,
  notas text,
  criado_por uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Orçamentos (uma obra pode ter várias versões)
create table orcamentos (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references obras(id) on delete cascade,
  versao int not null default 1,
  estado text not null default 'rascunho' check (estado in (
    'rascunho', 'enviado', 'aprovado', 'rejeitado', 'substituido'
  )),
  data_emissao date default current_date,
  validade_dias int default 30,
  iva_percentagem numeric(5,2) default 23,
  subtotal numeric(12,2) default 0,
  iva_total numeric(12,2) default 0,
  total numeric(12,2) default 0,
  custo_interno_total numeric(12,2) default 0,
  margem_teorica_percentagem numeric(5,2) default 0,
  condicoes_pagamento text default '40% início / 40% meio de obra / 20% conclusão',
  observacoes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(obra_id, versao)
);

-- Linhas de orçamento
create table linhas_orcamento (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references orcamentos(id) on delete cascade,
  categoria text not null,          -- ver lista em secção 6
  ordem int not null,               -- para ordenação dentro da categoria
  descricao text not null,
  unidade text not null,            -- m², m³, ml, un, h, vg
  quantidade numeric(12,3) not null,
  preco_cliente_unit numeric(12,2) not null,  -- o que vai no orçamento
  custo_interno_unit numeric(12,2),           -- custo estimado (MO + material)
  total_cliente numeric(12,2) generated always as (quantidade * preco_cliente_unit) stored,
  total_custo_interno numeric(12,2) generated always as (quantidade * coalesce(custo_interno_unit, 0)) stored,
  origem text check (origem in ('tabela', 'ia_sugestao', 'manual')),
  tabela_preco_id uuid references tabela_precos(id),
  notas text,
  created_at timestamptz default now()
);

-- Tabela de preços Sustain (referência permanente)
create table tabela_precos (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,      -- ex: "DEM-001"
  categoria text not null,
  descricao text not null,
  unidade text not null,
  preco_cliente_base numeric(12,2) not null,
  custo_interno_base numeric(12,2),
  rendimento_diario numeric(10,2), -- ex: 15 m²/dia (opcional)
  observacoes text,
  ativo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Riscos identificados pela IA
create table riscos_identificados (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references orcamentos(id) on delete cascade,
  descricao text not null,
  severidade text not null check (severidade in ('baixa', 'media', 'alta')),
  impacto_estimado text,            -- descritivo do impacto potencial
  custo_adicional_estimado numeric(12,2), -- opcional
  recomendacao text,
  fonte text,                       -- ex: "foto 3", "projeto elétrico p.4"
  resolvido boolean default false,
  created_at timestamptz default now()
);

-- Ficheiros associados à obra
create table ficheiros_obra (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references obras(id) on delete cascade,
  tipo text not null check (tipo in (
    'foto_estado_atual', 'mtq', 'projeto_3d',
    'projeto_eletricidade', 'projeto_hidraulica', 'projeto_carpintaria',
    'projeto_avac', 'outro'
  )),
  nome_original text not null,
  storage_path text not null,       -- caminho no Supabase Storage
  mime_type text,
  tamanho_bytes bigint,
  uploaded_at timestamptz default now()
);

-- Análises IA realizadas (para histórico e debug)
create table analises_ia (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references orcamentos(id) on delete cascade,
  tipo text not null check (tipo in ('extracao_trabalhos', 'riscos', 'sugestao_preco')),
  input_resumo text,                -- resumo do que foi enviado à IA
  output_raw jsonb,                 -- resposta estruturada da IA
  tokens_input int,
  tokens_output int,
  custo_estimado numeric(10,4),
  created_at timestamptz default now()
);

-- Execução de obra (preparado para v2, apenas estrutura)
create table execucao_obra (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid unique not null references obras(id) on delete cascade,
  data_inicio_real date,
  data_conclusao_real date,
  custo_real_total numeric(12,2),
  faturacao_real_total numeric(12,2),
  margem_real_percentagem numeric(5,2),
  notas text,
  updated_at timestamptz default now()
);
```

### 5.2 Policies (RLS)
- Ativar RLS em todas as tabelas.
- Na v1 (single-user): policy simples permitindo tudo ao utilizador autenticado.
- Preparar comentários no SQL com as policies v2 (por role) para ativação futura.

### 5.3 Storage (Supabase)
Bucket único `obras` com estrutura de pastas:
```
obras/
  {obra_id}/
    fotos/
    mtq/
    projetos/
    exports/
```

---

## 6. Categorias de Trabalho (Base)

Estas são as categorias iniciais. O sistema permite acrescentar mais através da tabela de preços.

1. Demolições e Preparação
2. Instalações Elétricas
3. Canalização
4. Revestimentos
5. Carpintaria e Acabamentos
6. Pichelaria / AVAC
7. Tetos Falsos e Isolamentos
8. Trabalhos Exteriores / Impermeabilizações

---

## 7. Fluxo Funcional

### Passo 1 — Nova Obra
Formulário com: cliente (seleção ou criação inline), referência (auto-gerada `SUS-{ANO}-{NNN}`), título, morada, tipo, notas.

### Passo 2 — Upload
Drop zone por categoria de ficheiro. Aceita: JPG, PNG, HEIC (fotos); PDF, XLSX (MTQ, projetos). Máx 20 MB/ficheiro. Preview imediato das fotos.

### Passo 3 — Análise IA
Botão "Analisar com IA". Progresso visível. Claude Sonnet 4.6 recebe:
- Fotos (como blocos `image`).
- PDFs e Excels convertidos em texto + (se necessário) imagens das páginas relevantes.
- Prompt de sistema (ver secção 8).

Output estruturado em JSON com:
- `trabalhos_propostos[]` — agrupados por categoria, com descrição, unidade, quantidade sugerida, confiança.
- `riscos[]` — descrição, severidade, fonte, recomendação, custo adicional estimado.
- `observacoes_gerais` — string.

### Passo 4 — Revisão Editável
Grelha estilo Excel (TanStack Table) com colunas: Categoria, Descrição, Un., Qtd., Preço Cliente, Custo Interno, Total Cliente, Margem %, Origem (badge), Ações.

- Edição inline.
- Adicionar linha (modal com autocomplete à tabela de preços).
- Duplicar, eliminar, reordenar linhas.
- Categorias como agrupamentos colapsáveis.

Painel lateral com riscos identificados, cada um com toggle "Resolvido".

### Passo 5 — Preços
Ao adicionar uma linha, o sistema pesquisa primeiro na `tabela_precos` (fuzzy match por descrição + unidade). Se não encontrar, botão "Pedir sugestão à IA" — Claude devolve preço estimado para o mercado português com justificação, que o utilizador aceita ou edita.

Preços editados manualmente na grelha podem ser "gravados" à tabela_precos com um botão (evolução incremental da base).

### Passo 6 — Margem e Condições
Painel lateral fixo com:
- Subtotal, IVA (editável), Total.
- Custo interno total, margem teórica em € e %.
- Condições de pagamento (editável, default pré-preenchido).
- Validade (default 30d).
- Observações (texto livre).

### Passo 7 — Export
Dois botões:
- **"Exportar PDF"** — render via `@react-pdf/renderer` seguindo o template visual da Sustain (ver secção 9). Guarda cópia em `obras/{id}/exports/`.
- **"Exportar Excel"** — gera XLSX com `exceljs` replicando o layout do ficheiro de referência do utilizador (cabeçalho, tabela, subtotal, condições, assinaturas).

Ambos ficam acessíveis depois no ecrã da obra.

---

## 8. Prompt de Sistema para Claude (análise de obra)

Guardar em `lib/ai/prompts/analise-obra.ts`.

```
És um orçamentista sénior de remodelações em Portugal, a trabalhar para a empresa Sustain Remodelações. Recebes inputs de uma obra (fotos do estado atual, mapa de trabalhos e quantidades fornecido pelo cliente, projetos de especialidades) e devolves uma análise técnica estruturada.

A tua resposta deve ser SEMPRE um objeto JSON válido com este schema:

{
  "trabalhos_propostos": [
    {
      "categoria": "Demolições e Preparação" | "Instalações Elétricas" | "Canalização" | "Revestimentos" | "Carpintaria e Acabamentos" | "Pichelaria / AVAC" | "Tetos Falsos e Isolamentos" | "Trabalhos Exteriores / Impermeabilizações",
      "descricao": "string (linguagem técnica mas clara)",
      "unidade": "m²" | "m³" | "ml" | "un" | "h" | "vg",
      "quantidade_sugerida": number,
      "confianca": "alta" | "media" | "baixa",
      "justificacao": "string (breve, explica de onde vem a quantidade)"
    }
  ],
  "riscos": [
    {
      "descricao": "string",
      "severidade": "baixa" | "media" | "alta",
      "fonte": "string (ex: 'foto 3', 'projeto elétrico p.2')",
      "impacto_estimado": "string",
      "custo_adicional_estimado_eur": number | null,
      "recomendacao": "string"
    }
  ],
  "observacoes_gerais": "string"
}

Regras:
- Identifica apenas riscos TÉCNICOS DE EXECUÇÃO (infiltrações, estrutura, instalações não conformes, humidade, amianto, etc.). Não abordes riscos legais nem de orçamento.
- Quando a quantidade não for claramente visível, assinala confianca="baixa" e explica na justificação.
- Agrupa trabalhos pela categoria mais apropriada.
- Usa linguagem técnica portuguesa (europeia). Não inventes materiais específicos de marca.
- NÃO incluas preços nem valores € nos trabalhos propostos — só a estrutura de trabalho e quantidades. Os preços são calculados à parte.
- Se um input não for interpretável, regista-o em observacoes_gerais.

Responde APENAS com o JSON, sem texto antes ou depois, sem markdown, sem blocos de código.
```

---

## 9. Template Visual do PDF

Replicar a estrutura do ficheiro Excel atual do utilizador:

**Cabeçalho** (com logótipo quando fornecido — placeholder até lá):
- "SUSTAIN REMODELAÇÕES" — título grande, sans-serif moderna (ex: Inter, Montserrat)
- Slogan em itálico: "Transforme o seu espaço. Transforme a sua vida."
- Linha de contactos: `info@sustain.pt  |  +351 912 514 048`

**Bloco identificação do orçamento**
- Título: ORÇAMENTO
- Cliente / Morada da obra / Data / Validade / Ref. Orçamento

**Tabela de trabalhos**
Colunas: `#`, Descrição do Serviço, Unidade, Qtd., Preço Unit. (€), Total (€)
Agrupada por categoria com cabeçalhos numerados (1. DEMOLIÇÕES E PREPARAÇÃO, etc.), em negrito.

**Totais**
- SUBTOTAL (s/ IVA)
- IVA (23%)
- TOTAL (c/ IVA) — destacado

**Condições Gerais** — bloco padrão (parametrizável):
- Orçamento válido por 30 dias a partir da data de emissão.
- Pagamento: 40% no início dos trabalhos, 40% a meio da obra, 20% na conclusão.
- Prazo estimado de execução: a definir após adjudicação.
- Materiais incluídos conforme especificado. Alterações sujeitas a revisão de preço.
- Garantia de 5 anos sobre mão de obra (conforme legislação em vigor).
- Valores sujeitos a confirmação após visita técnica ao local.

**Assinaturas**
- Pela Sustain Remodelações | O Cliente
- Data: ___/___/______

**Rodapé**
- `SUSTAIN REMODELAÇÕES  |  info@sustain.pt  |  +351 912 514 048`
- `Rua Fernando Almeida, Nº 21, 4470-288 Vermoim  |  NIF: {{NIF_SUSTAIN}}`

**Paleta** (a aplicar com moderação):
- Texto principal: `#1a1a1a`
- Acento: `#2c3e50` (azul escuro sóbrio, profissional)
- Linhas e separadores: `#e0e0e0`
- Categorias (fundo): `#f5f5f5`

---

## 10. Estrutura de Pastas Sugerida

```
sustain-orcamentos/
  app/
    (auth)/login/
    (app)/
      obras/
        page.tsx                  # listagem
        nova/page.tsx             # criar obra
        [id]/
          page.tsx                # dashboard da obra
          orcamento/[orcamentoId]/page.tsx  # editor
      clientes/
      tabela-precos/
      configuracoes/
    api/
      ia/analise/route.ts
      ia/sugestao-preco/route.ts
      export/pdf/[orcamentoId]/route.ts
      export/xlsx/[orcamentoId]/route.ts
  components/
    ui/                            # shadcn
    obra/
    orcamento/
    pdf/                           # componentes @react-pdf
  lib/
    supabase/
    ai/
      client.ts
      prompts/
    export/
      pdf.tsx
      xlsx.ts
    validation/                   # zod schemas
  public/
    logo-sustain.png              # substituir quando fornecido
  supabase/
    migrations/
    seed.sql                      # tabela de preços inicial (a popular)
```

---

## 11. Fases de Implementação

O Claude Code deve construir por fases, cada uma testável e funcional.

### Fase 1 — Fundação (sessão inicial)
- Inicialização Next.js + TypeScript + Tailwind + shadcn/ui
- Integração Supabase (migrations, client)
- Auth (login/logout)
- Layout base + navegação
- Tabelas criadas via migrations SQL

### Fase 2 — CRUD base
- Clientes (lista, criar, editar)
- Obras (lista, criar, detalhe)
- Tabela de preços (lista, importar CSV, editar)

### Fase 3 — Orçamento manual
- Editor de orçamento (grelha editável)
- Adicionar linhas da tabela de preços
- Cálculo de totais em tempo real
- Guardar versões

### Fase 4 — Export
- Export PDF com template visual Sustain
- Export Excel replicando layout atual

### Fase 5 — Upload e IA
- Upload de fotos e documentos para Supabase Storage
- Integração Claude API (análise de obra)
- Aplicação dos resultados ao orçamento (linhas + riscos)
- Sugestão de preços por IA

### Fase 6 — Polimento
- Filtros na listagem de obras
- Duplicar orçamento para novo
- Badges de estado
- Pequenos refinamentos visuais

---

## 12. Critérios de Aceitação

A plataforma está pronta quando:

1. Utilizador autenticado consegue criar obra, fazer upload de 5+ fotos e 1 PDF, pedir análise IA e ver proposta de trabalhos.
2. Utilizador consegue editar livremente a grelha de trabalhos, ajustar preços, e exportar PDF.
3. O PDF exportado é indistinguível (em qualidade visual) do template Excel atual.
4. O Excel exportado abre corretamente em Excel e LibreOffice com fórmulas de subtotal/IVA/total.
5. Todas as obras ficam listadas com filtro por estado e cliente.
6. A tabela de preços pode ser importada via CSV e editada na UI.
7. Não há chaves de API, credenciais nem NIF hardcoded — tudo via `.env`.
8. O RLS do Supabase está ativo e testado.

---

## 13. Qualidade de Código

- TypeScript estrito (`strict: true`).
- Validação com `zod` em todos os inputs de API.
- Erros tratados (nunca `console.log` em produção; usar sistema de notificações UI).
- Componentes server-first por defeito; client components só quando necessário.
- Mobile-responsive (o utilizador irá usar em portátil mas também em obra via telemóvel).
- Sem dependências desnecessárias — privilegiar o que já está em shadcn e Next.js.

---

## 14. O que NÃO fazer

- Não implementar multi-tenancy complexo na v1.
- Não criar sistema de roles granulares na v1 (basta `admin` por enquanto).
- Não criar dashboards de analytics na v1.
- Não integrar com sistemas externos (contabilidade, CRM) na v1.
- Não criar sistema de notificações email na v1.
- Não inventar features não listadas neste documento sem pedir clarificação.

---

## 15. Contacto para Dúvidas

Gonçalo Duarte — info@sustain.pt — +351 912 514 048

Sempre que houver ambiguidade ou decisão técnica com impacto no produto, o Claude Code deve **parar e perguntar** antes de avançar.
