import { sql, relations } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/sqlite-core";

/**
 * Convenções:
 * - Dinheiro: guardado como INTEGER cêntimos (sufixo `_cents`). Evita erros de vírgula flutuante.
 * - Percentagens: guardadas como INTEGER basis points (sufixo `_bps`). 2300 = 23,00 %.
 * - IDs: UUID v4 gerado em aplicação (`crypto.randomUUID()`).
 * - Timestamps: INTEGER ms desde epoch.
 * - Totais (`total_cliente_cents`, `total_custo_interno_cents`) são calculados na aplicação
 *   em vez de generated columns — simplifica o schema e mantém a lógica testável.
 */

const uuid = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date());

const updatedAt = () =>
  integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date());

/* ---------------------------------------------------------------------- */
/*                      UTILIZADORES (substitui profiles)                 */
/* ---------------------------------------------------------------------- */

export const users = sqliteTable(
  "users",
  {
    id: uuid(),
    nome: text("nome").notNull(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull().default("admin"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check(
      "users_role_check",
      sql`${t.role} IN ('admin', 'orcamentista', 'gestor')`,
    ),
  ],
);

/* ---------------------------------------------------------------------- */
/*                                 CLIENTES                               */
/* ---------------------------------------------------------------------- */

export const clientes = sqliteTable("clientes", {
  id: uuid(),
  nome: text("nome").notNull(),
  nif: text("nif"),
  email: text("email"),
  telefone: text("telefone"),
  morada: text("morada"),
  notas: text("notas"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/* ---------------------------------------------------------------------- */
/*                                  OBRAS                                 */
/* ---------------------------------------------------------------------- */

export const obras = sqliteTable(
  "obras",
  {
    id: uuid(),
    clienteId: text("cliente_id")
      .notNull()
      .references(() => clientes.id, { onDelete: "restrict" }),
    referencia: text("referencia").notNull().unique(),
    titulo: text("titulo").notNull(),
    moradaObra: text("morada_obra").notNull(),
    tipo: text("tipo").notNull(),
    estado: text("estado").notNull().default("orcamentado"),
    dataVisita: text("data_visita"),
    dataInicioPrevista: text("data_inicio_prevista"),
    dataConclusaoPrevista: text("data_conclusao_prevista"),
    distrito: text("distrito"),
    cidade: text("cidade"),
    descricao: text("descricao"),
    briefing: text("briefing"),
    sugestoesMateriais: text("sugestoes_materiais"),
    sugestoesMateriaisAtualizadasEm: integer(
      "sugestoes_materiais_atualizadas_em",
      { mode: "timestamp_ms" },
    ),
    notas: text("notas"),
    criadoPor: text("criado_por").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check(
      "obras_tipo_check",
      sql`${t.tipo} IN ('remodelacao_total', 'remodelacao_parcial', 'cozinha', 'wc', 'exterior', 'comercial', 'outro')`,
    ),
    check(
      "obras_estado_check",
      sql`${t.estado} IN ('orcamentado', 'adjudicado', 'em_execucao', 'concluido', 'perdido', 'cancelado')`,
    ),
    index("obras_cliente_idx").on(t.clienteId),
    index("obras_estado_idx").on(t.estado),
  ],
);

/* ---------------------------------------------------------------------- */
/*                          TABELA DE PREÇOS (SUSTAIN)                    */
/* ---------------------------------------------------------------------- */

export const tabelaPrecos = sqliteTable("tabela_precos", {
  id: uuid(),
  codigo: text("codigo").notNull().unique(),
  categoria: text("categoria").notNull(),
  descricao: text("descricao").notNull(),
  unidade: text("unidade").notNull(),
  precoClienteBaseCents: integer("preco_cliente_base_cents").notNull(),
  custoInternoBaseCents: integer("custo_interno_base_cents"),
  rendimentoDiario: real("rendimento_diario"),
  observacoes: text("observacoes"),
  ativo: integer("ativo", { mode: "boolean" }).notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/* ---------------------------------------------------------------------- */
/*                               ORÇAMENTOS                               */
/* ---------------------------------------------------------------------- */

export const orcamentos = sqliteTable(
  "orcamentos",
  {
    id: uuid(),
    obraId: text("obra_id")
      .notNull()
      .references(() => obras.id, { onDelete: "cascade" }),
    versao: integer("versao").notNull().default(1),
    estado: text("estado").notNull().default("rascunho"),
    dataEmissao: text("data_emissao")
      .notNull()
      .$defaultFn(() => new Date().toISOString().slice(0, 10)),
    validadeDias: integer("validade_dias").notNull().default(30),
    ivaPercentagemBps: integer("iva_percentagem_bps").notNull().default(2300),
    subtotalCents: integer("subtotal_cents").notNull().default(0),
    ivaTotalCents: integer("iva_total_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull().default(0),
    custoInternoTotalCents: integer("custo_interno_total_cents")
      .notNull()
      .default(0),
    margemTeoricaBps: integer("margem_teorica_bps").notNull().default(0),
    margemAlvoBps: integer("margem_alvo_bps"),
    condicoesPagamento: text("condicoes_pagamento")
      .notNull()
      .default("40% início / 40% meio de obra / 20% conclusão"),
    observacoes: text("observacoes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check(
      "orcamentos_estado_check",
      sql`${t.estado} IN ('rascunho', 'enviado', 'aprovado', 'rejeitado', 'substituido')`,
    ),
    uniqueIndex("orcamentos_obra_versao_idx").on(t.obraId, t.versao),
  ],
);

/* ---------------------------------------------------------------------- */
/*                          LINHAS DE ORÇAMENTO                           */
/* ---------------------------------------------------------------------- */

export const linhasOrcamento = sqliteTable(
  "linhas_orcamento",
  {
    id: uuid(),
    orcamentoId: text("orcamento_id")
      .notNull()
      .references(() => orcamentos.id, { onDelete: "cascade" }),
    categoria: text("categoria").notNull(),
    ordem: integer("ordem").notNull(),
    descricao: text("descricao").notNull(),
    unidade: text("unidade").notNull(),
    quantidade: real("quantidade").notNull(),
    precoClienteUnitCents: integer("preco_cliente_unit_cents").notNull(),
    custoInternoUnitCents: integer("custo_interno_unit_cents"),
    totalClienteCents: integer("total_cliente_cents").notNull().default(0),
    totalCustoInternoCents: integer("total_custo_interno_cents")
      .notNull()
      .default(0),
    origem: text("origem").notNull().default("manual"),
    tabelaPrecoId: text("tabela_preco_id").references(() => tabelaPrecos.id, {
      onDelete: "set null",
    }),
    notas: text("notas"),
    createdAt: createdAt(),
  },
  (t) => [
    check(
      "linhas_origem_check",
      sql`${t.origem} IN ('tabela', 'ia_sugestao', 'manual')`,
    ),
    index("linhas_orcamento_idx").on(t.orcamentoId),
  ],
);

/* ---------------------------------------------------------------------- */
/*                           RISCOS IDENTIFICADOS                         */
/* ---------------------------------------------------------------------- */

export const riscosIdentificados = sqliteTable(
  "riscos_identificados",
  {
    id: uuid(),
    orcamentoId: text("orcamento_id")
      .notNull()
      .references(() => orcamentos.id, { onDelete: "cascade" }),
    descricao: text("descricao").notNull(),
    severidade: text("severidade").notNull(),
    impactoEstimado: text("impacto_estimado"),
    custoAdicionalEstimadoCents: integer("custo_adicional_estimado_cents"),
    recomendacao: text("recomendacao"),
    fonte: text("fonte"),
    resolvido: integer("resolvido", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    check(
      "riscos_severidade_check",
      sql`${t.severidade} IN ('baixa', 'media', 'alta')`,
    ),
    index("riscos_orcamento_idx").on(t.orcamentoId),
  ],
);

/* ---------------------------------------------------------------------- */
/*                       FICHEIROS ASSOCIADOS À OBRA                      */
/* ---------------------------------------------------------------------- */

export const ficheirosObra = sqliteTable(
  "ficheiros_obra",
  {
    id: uuid(),
    obraId: text("obra_id")
      .notNull()
      .references(() => obras.id, { onDelete: "cascade" }),
    tipo: text("tipo").notNull(),
    nomeOriginal: text("nome_original").notNull(),
    storagePath: text("storage_path").notNull(),
    mimeType: text("mime_type"),
    tamanhoBytes: integer("tamanho_bytes"),
    uploadedAt: integer("uploaded_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    check(
      "ficheiros_tipo_check",
      sql`${t.tipo} IN ('foto_estado_atual', 'referencia_final', 'mtq', 'projeto_3d', 'projeto_eletricidade', 'projeto_hidraulica', 'projeto_carpintaria', 'projeto_avac', 'outro')`,
    ),
    index("ficheiros_obra_idx").on(t.obraId),
  ],
);

/* ---------------------------------------------------------------------- */
/*                          ANÁLISES IA (histórico)                       */
/* ---------------------------------------------------------------------- */

export const analisesIA = sqliteTable(
  "analises_ia",
  {
    id: uuid(),
    orcamentoId: text("orcamento_id")
      .notNull()
      .references(() => orcamentos.id, { onDelete: "cascade" }),
    tipo: text("tipo").notNull(),
    inputResumo: text("input_resumo"),
    outputRaw: text("output_raw", { mode: "json" }),
    tokensInput: integer("tokens_input"),
    tokensOutput: integer("tokens_output"),
    custoEstimadoCents: integer("custo_estimado_cents"),
    createdAt: createdAt(),
  },
  (t) => [
    check(
      "analises_tipo_check",
      sql`${t.tipo} IN ('extracao_trabalhos', 'riscos', 'sugestao_preco', 'sugestao_materiais')`,
    ),
    index("analises_orcamento_idx").on(t.orcamentoId),
  ],
);

/* ---------------------------------------------------------------------- */
/*                          USO DO CHATBOT (Adriana)                      */
/* ---------------------------------------------------------------------- */

export const chatbotUsage = sqliteTable(
  "chatbot_usage",
  {
    id: uuid(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokensInput: integer("tokens_input").notNull().default(0),
    tokensOutput: integer("tokens_output").notNull().default(0),
    custoEstimadoCents: integer("custo_estimado_cents").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [
    index("chatbot_usage_user_created_idx").on(t.userId, t.createdAt),
  ],
);

/* ---------------------------------------------------------------------- */
/*                     EXECUÇÃO DE OBRA (estrutura v2)                    */
/* ---------------------------------------------------------------------- */

export const execucaoObra = sqliteTable("execucao_obra", {
  id: uuid(),
  obraId: text("obra_id")
    .notNull()
    .unique()
    .references(() => obras.id, { onDelete: "cascade" }),
  dataInicioReal: text("data_inicio_real"),
  dataConclusaoReal: text("data_conclusao_real"),
  custoRealTotalCents: integer("custo_real_total_cents"),
  faturacaoRealTotalCents: integer("faturacao_real_total_cents"),
  margemRealBps: integer("margem_real_bps"),
  notas: text("notas"),
  updatedAt: updatedAt(),
});

/* ---------------------------------------------------------------------- */
/*                                 RELATIONS                              */
/* ---------------------------------------------------------------------- */

export const clientesRelations = relations(clientes, ({ many }) => ({
  obras: many(obras),
}));

export const obrasRelations = relations(obras, ({ one, many }) => ({
  cliente: one(clientes, {
    fields: [obras.clienteId],
    references: [clientes.id],
  }),
  criador: one(users, {
    fields: [obras.criadoPor],
    references: [users.id],
  }),
  orcamentos: many(orcamentos),
  ficheiros: many(ficheirosObra),
  execucao: one(execucaoObra),
}));

export const orcamentosRelations = relations(orcamentos, ({ one, many }) => ({
  obra: one(obras, {
    fields: [orcamentos.obraId],
    references: [obras.id],
  }),
  linhas: many(linhasOrcamento),
  riscos: many(riscosIdentificados),
  analises: many(analisesIA),
}));

export const linhasOrcamentoRelations = relations(linhasOrcamento, ({ one }) => ({
  orcamento: one(orcamentos, {
    fields: [linhasOrcamento.orcamentoId],
    references: [orcamentos.id],
  }),
  tabelaPreco: one(tabelaPrecos, {
    fields: [linhasOrcamento.tabelaPrecoId],
    references: [tabelaPrecos.id],
  }),
}));

export const riscosRelations = relations(riscosIdentificados, ({ one }) => ({
  orcamento: one(orcamentos, {
    fields: [riscosIdentificados.orcamentoId],
    references: [orcamentos.id],
  }),
}));

export const ficheirosRelations = relations(ficheirosObra, ({ one }) => ({
  obra: one(obras, {
    fields: [ficheirosObra.obraId],
    references: [obras.id],
  }),
}));

export const analisesRelations = relations(analisesIA, ({ one }) => ({
  orcamento: one(orcamentos, {
    fields: [analisesIA.orcamentoId],
    references: [orcamentos.id],
  }),
}));

export const execucaoRelations = relations(execucaoObra, ({ one }) => ({
  obra: one(obras, {
    fields: [execucaoObra.obraId],
    references: [obras.id],
  }),
}));

/* ---------------------------------------------------------------------- */
/*                                  TYPES                                 */
/* ---------------------------------------------------------------------- */

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Cliente = typeof clientes.$inferSelect;
export type NewCliente = typeof clientes.$inferInsert;
export type Obra = typeof obras.$inferSelect;
export type NewObra = typeof obras.$inferInsert;
export type TabelaPreco = typeof tabelaPrecos.$inferSelect;
export type NewTabelaPreco = typeof tabelaPrecos.$inferInsert;
export type Orcamento = typeof orcamentos.$inferSelect;
export type NewOrcamento = typeof orcamentos.$inferInsert;
export type LinhaOrcamento = typeof linhasOrcamento.$inferSelect;
export type NewLinhaOrcamento = typeof linhasOrcamento.$inferInsert;
export type RiscoIdentificado = typeof riscosIdentificados.$inferSelect;
export type NewRiscoIdentificado = typeof riscosIdentificados.$inferInsert;
export type FicheiroObra = typeof ficheirosObra.$inferSelect;
export type NewFicheiroObra = typeof ficheirosObra.$inferInsert;
export type AnaliseIA = typeof analisesIA.$inferSelect;
export type NewAnaliseIA = typeof analisesIA.$inferInsert;
