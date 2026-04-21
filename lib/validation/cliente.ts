import { z } from "zod";

import { emptyToNull, optionalText } from "./shared";

export const clienteSchema = z.object({
  nome: z.string().trim().min(2, "Nome obrigatório (mín. 2 caracteres)"),
  nif: z.preprocess(
    emptyToNull,
    z
      .string()
      .regex(/^\d{9}$/, "NIF deve ter 9 dígitos")
      .nullable(),
  ),
  email: z.preprocess(
    emptyToNull,
    z.string().email("Email inválido").nullable(),
  ),
  telefone: optionalText,
  morada: optionalText,
  notas: optionalText,
});

export type ClienteInput = z.infer<typeof clienteSchema>;
