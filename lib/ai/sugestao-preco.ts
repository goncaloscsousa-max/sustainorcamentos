import { z } from "zod";

import { anthropic, DEFAULT_MODEL, estimarCustoCents } from "./client";
import { SYSTEM_SUGESTAO_PRECO } from "./prompts/sugestao-preco";

export const sugestaoPrecoSchema = z.object({
  preco_cliente_eur: z.number().nonnegative(),
  custo_interno_eur: z.number().nonnegative(),
  justificacao: z.string().default(""),
  confianca: z.enum(["alta", "media", "baixa"]).default("media"),
});

export type SugestaoPrecoResult = z.infer<typeof sugestaoPrecoSchema>;

export type SugestaoPrecoInput = {
  descricao: string;
  unidade: string;
  categoria?: string | null;
  quantidade?: number | null;
};

export type SugestaoPrecoOutcome = {
  parsed: SugestaoPrecoResult;
  precoClienteCents: number;
  custoInternoCents: number;
  raw: string;
  tokensInput: number;
  tokensOutput: number;
  custoEstimadoCents: number;
};

function extractJson(text: string): string {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  if (fenced) return fenced[1].trim();
  return trimmed;
}

export async function sugerirPreco(
  input: SugestaoPrecoInput,
): Promise<SugestaoPrecoOutcome> {
  const client = anthropic();

  const userText =
    `Descrição do trabalho: ${input.descricao}\n` +
    `Unidade: ${input.unidade}\n` +
    (input.categoria ? `Categoria: ${input.categoria}\n` : "") +
    (input.quantidade != null ? `Quantidade: ${input.quantidade}\n` : "") +
    `\nDevolve o JSON com o preço por ${input.unidade}.`;

  const response = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 500,
    system: SYSTEM_SUGESTAO_PRECO,
    messages: [{ role: "user", content: userText }],
  });

  const raw = response.content
    .filter(
      (b): b is Extract<(typeof response.content)[number], { type: "text" }> =>
        b.type === "text",
    )
    .map((b) => b.text)
    .join("\n");

  let parsed: SugestaoPrecoResult;
  try {
    const json = JSON.parse(extractJson(raw));
    parsed = sugestaoPrecoSchema.parse(json);
  } catch (err) {
    throw new Error(
      `Resposta da IA para sugestão de preço inválida: ${
        err instanceof Error ? err.message : String(err)
      }. Raw: ${raw.slice(0, 200)}`,
    );
  }

  return {
    parsed,
    precoClienteCents: Math.round(parsed.preco_cliente_eur * 100),
    custoInternoCents: Math.round(parsed.custo_interno_eur * 100),
    raw,
    tokensInput: response.usage.input_tokens,
    tokensOutput: response.usage.output_tokens,
    custoEstimadoCents: estimarCustoCents(
      response.usage.input_tokens,
      response.usage.output_tokens,
    ),
  };
}
