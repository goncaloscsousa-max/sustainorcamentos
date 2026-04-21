import { z } from "zod";

import {
  moneyCents,
  moneyCentsOptional,
  optionalText,
} from "./shared";

const unidade = z.enum(["m²", "m³", "ml", "un", "h", "vg"]);

export const tabelaPrecoSchema = z.object({
  codigo: z
    .string()
    .trim()
    .min(2, "Código obrigatório")
    .regex(/^[A-Z0-9-]+$/i, "Só letras, números e '-'"),
  categoria: z.string().trim().min(1, "Categoria obrigatória"),
  descricao: z.string().trim().min(3, "Descrição obrigatória"),
  unidade,
  precoClienteBaseCents: moneyCents,
  custoInternoBaseCents: moneyCentsOptional,
  rendimentoDiario: z.preprocess(
    (v) => (v === "" || v == null ? null : Number(v)),
    z.number().positive("Tem de ser > 0").nullable(),
  ),
  observacoes: optionalText,
  ativo: z.preprocess(
    (v) => v === "true" || v === true || v === "on",
    z.boolean(),
  ),
});

export type TabelaPrecoInput = z.infer<typeof tabelaPrecoSchema>;
