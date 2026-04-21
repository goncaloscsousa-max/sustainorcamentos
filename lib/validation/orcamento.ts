import { z } from "zod";

import {
  moneyCents,
  moneyCentsOptional,
  optionalText,
  percentageBps,
  positiveDecimal,
} from "./shared";

const unidade = z.enum(["m²", "m³", "ml", "un", "h", "vg"]);
const origem = z.enum(["tabela", "ia_sugestao", "manual"]);
const estadoOrcamento = z.enum([
  "rascunho",
  "enviado",
  "aprovado",
  "rejeitado",
  "substituido",
]);

/** Linha editável no cliente. totals recalculados no servidor. */
export const linhaOrcamentoSchema = z.object({
  categoria: z.string().trim().min(1, "Categoria obrigatória"),
  descricao: z.string().trim().min(1, "Descrição obrigatória"),
  unidade,
  quantidade: positiveDecimal,
  precoClienteUnitCents: moneyCents,
  custoInternoUnitCents: moneyCentsOptional,
  origem,
  tabelaPrecoId: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.string().uuid().nullable(),
  ),
  notas: optionalText,
});

export const orcamentoHeaderSchema = z.object({
  estado: estadoOrcamento,
  dataEmissao: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data de emissão inválida"),
  validadeDias: z.coerce.number().int().positive("Validade tem de ser > 0"),
  ivaPercentagemBps: percentageBps,
  condicoesPagamento: z.string().trim().min(1, "Condições obrigatórias"),
  observacoes: optionalText,
});

export const saveOrcamentoSchema = z.object({
  header: orcamentoHeaderSchema,
  linhas: z.array(linhaOrcamentoSchema),
});

export type LinhaOrcamentoInput = z.infer<typeof linhaOrcamentoSchema>;
export type OrcamentoHeaderInput = z.infer<typeof orcamentoHeaderSchema>;
export type SaveOrcamentoInput = z.infer<typeof saveOrcamentoSchema>;
