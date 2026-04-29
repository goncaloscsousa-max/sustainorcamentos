import { z } from "zod";

import { anthropic, DEFAULT_MODEL, estimarCustoCents } from "./client";
import { SYSTEM_SUGESTAO_MATERIAIS } from "./prompts/sugestao-materiais";

/* ---------------------------------------------------------------------- */
/*                                schemas                                  */
/* ---------------------------------------------------------------------- */

export const sugestaoMaterialSchema = z.object({
  divisao: z.string().min(1),
  item: z.string().min(1),
  opcao_media: z.string().default(""),
  opcao_premium: z.string().default(""),
  unidade: z.string().default("un"),
  preco_min_eur: z.number().nonnegative().default(0),
  preco_max_eur: z.number().nonnegative().default(0),
  justificacao: z.string().default(""),
});

export const sugestaoMateriaisResultSchema = z.object({
  sugestoes: z.array(sugestaoMaterialSchema).default([]),
  observacoes: z.string().default(""),
});

export type SugestaoMaterial = z.infer<typeof sugestaoMaterialSchema>;
export type SugestaoMateriaisResult = z.infer<typeof sugestaoMateriaisResultSchema>;

export type SugestaoMateriaisOutcome = {
  parsed: SugestaoMateriaisResult;
  raw: string;
  tokensInput: number;
  tokensOutput: number;
  custoEstimadoCents: number;
};

function extractJson(text: string): string {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  if (fenced) return fenced[1].trim();
  const openOnly = /^```(?:json)?\s*([\s\S]*)$/i.exec(trimmed);
  if (openOnly) return openOnly[1].replace(/```[\s\S]*$/i, "").trim();
  return trimmed;
}

/* ---------------------------------------------------------------------- */
/*                                   API                                   */
/* ---------------------------------------------------------------------- */

export type SugestaoMateriaisInput = {
  briefingTexto: string;
  regiaoContexto?: string | null;
  trabalhosResumo?: string | null;
};

export async function sugerirMateriais(
  input: SugestaoMateriaisInput,
): Promise<SugestaoMateriaisOutcome> {
  const client = anthropic();

  const userText = [
    input.briefingTexto,
    input.regiaoContexto ? `\n\n${input.regiaoContexto}` : null,
    input.trabalhosResumo
      ? `\n\nTrabalhos já propostos no orçamento:\n${input.trabalhosResumo}`
      : null,
    "\n\nDevolve o JSON conforme o schema.",
  ]
    .filter(Boolean)
    .join("");

  const response = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 6000,
    system: SYSTEM_SUGESTAO_MATERIAIS,
    messages: [{ role: "user", content: [{ type: "text", text: userText }] }],
  });

  const textBlocks = response.content.filter(
    (b): b is Extract<(typeof response.content)[number], { type: "text" }> =>
      b.type === "text",
  );
  const raw = textBlocks.map((b) => b.text).join("\n");

  let parsed: SugestaoMateriaisResult;
  try {
    parsed = sugestaoMateriaisResultSchema.parse(JSON.parse(extractJson(raw)));
  } catch (err) {
    throw new Error(
      `Resposta da IA (sugestão de materiais) não é JSON válido. Raw: ${raw.slice(0, 400)}…\nErro: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  return {
    parsed,
    raw,
    tokensInput: response.usage.input_tokens,
    tokensOutput: response.usage.output_tokens,
    custoEstimadoCents: estimarCustoCents(
      response.usage.input_tokens,
      response.usage.output_tokens,
    ),
  };
}
