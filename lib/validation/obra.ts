import { z } from "zod";

import { optionalText } from "./shared";

const tipoObra = z.enum([
  "remodelacao_total",
  "remodelacao_parcial",
  "cozinha",
  "wc",
  "exterior",
  "comercial",
  "outro",
]);

const estadoObra = z.enum([
  "orcamentado",
  "adjudicado",
  "em_execucao",
  "concluido",
  "perdido",
  "cancelado",
]);

const optionalDate = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : v),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (usar YYYY-MM-DD)")
    .nullable(),
);

export const obraCreateSchema = z.object({
  clienteId: z.string().uuid({ message: "Escolher um cliente" }),
  titulo: z.string().trim().min(3, "Título obrigatório (mín. 3 caracteres)"),
  moradaObra: z.string().trim().min(3, "Morada da obra obrigatória"),
  tipo: tipoObra,
  dataVisita: optionalDate,
  dataInicioPrevista: optionalDate,
  dataConclusaoPrevista: optionalDate,
  notas: optionalText,
});

export const obraUpdateSchema = obraCreateSchema.extend({
  estado: estadoObra,
});

export type ObraCreateInput = z.infer<typeof obraCreateSchema>;
export type ObraUpdateInput = z.infer<typeof obraUpdateSchema>;
