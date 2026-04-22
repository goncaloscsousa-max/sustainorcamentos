import { z } from "zod";

import { anthropic, DEFAULT_MODEL, estimarCustoCents } from "./client";
import { SYSTEM_ANALISE_OBRA } from "./prompts/analise-obra";

/* ---------------------------------------------------------------------- */
/*                                schemas                                  */
/* ---------------------------------------------------------------------- */

export const trabalhoPropostoSchema = z.object({
  categoria: z.string().min(1),
  descricao: z.string().min(1),
  unidade: z.string().min(1),
  quantidade_sugerida: z.number().nonnegative(),
  confianca: z.enum(["alta", "media", "baixa"]).default("media"),
  justificacao: z.string().default(""),
});

export const riscoIASchema = z.object({
  descricao: z.string().min(1),
  severidade: z.enum(["baixa", "media", "alta"]).default("media"),
  fonte: z.string().default(""),
  impacto_estimado: z.string().default(""),
  custo_adicional_estimado_eur: z.number().nullable().default(null),
  recomendacao: z.string().default(""),
});

export const analiseObraSchema = z.object({
  trabalhos_propostos: z.array(trabalhoPropostoSchema).default([]),
  riscos: z.array(riscoIASchema).default([]),
  observacoes_gerais: z.string().default(""),
});

export type AnaliseObraResult = z.infer<typeof analiseObraSchema>;
export type TrabalhoProposto = z.infer<typeof trabalhoPropostoSchema>;
export type RiscoIA = z.infer<typeof riscoIASchema>;

/* ---------------------------------------------------------------------- */
/*                                   API                                  */
/* ---------------------------------------------------------------------- */

type ImageInput = {
  mediaType: "image/jpeg" | "image/png" | "image/webp";
  data: Buffer;
  label?: string;
};

type DocumentInput = {
  mediaType: "application/pdf";
  data: Buffer;
  label?: string;
};

export type AnaliseInputs = {
  contextoObra: string;
  images: ImageInput[];
  pdfs: DocumentInput[];
  mtqTexto?: string;
};

export type AnaliseOutcome = {
  parsed: AnaliseObraResult;
  raw: string;
  tokensInput: number;
  tokensOutput: number;
  custoEstimadoCents: number;
};

function extractJson(text: string): string {
  const trimmed = text.trim();
  // Se o modelo acidentalmente embrulhou em markdown:
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  if (fenced) return fenced[1].trim();
  return trimmed;
}

export async function analisarObra(
  input: AnaliseInputs,
): Promise<AnaliseOutcome> {
  const client = anthropic();

  const content: Array<
    | { type: "text"; text: string }
    | {
        type: "image";
        source: {
          type: "base64";
          media_type: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
          data: string;
        };
      }
    | {
        type: "document";
        source: {
          type: "base64";
          media_type: "application/pdf";
          data: string;
        };
      }
  > = [];

  content.push({
    type: "text",
    text: `Contexto da obra:\n${input.contextoObra}`,
  });

  if (input.mtqTexto && input.mtqTexto.trim().length > 0) {
    content.push({
      type: "text",
      text: `Mapa de trabalhos e quantidades (extraído do ficheiro do cliente):\n${input.mtqTexto.trim()}`,
    });
  }

  input.images.forEach((img, i) => {
    content.push({
      type: "text",
      text: `Foto ${i + 1}${img.label ? ` — ${img.label}` : ""}:`,
    });
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: img.mediaType,
        data: img.data.toString("base64"),
      },
    });
  });

  input.pdfs.forEach((pdf, i) => {
    content.push({
      type: "text",
      text: `Documento PDF ${i + 1}${pdf.label ? ` — ${pdf.label}` : ""}:`,
    });
    content.push({
      type: "document",
      source: {
        type: "base64",
        media_type: pdf.mediaType,
        data: pdf.data.toString("base64"),
      },
    });
  });

  content.push({
    type: "text",
    text: "Analisa os inputs acima e devolve o JSON conforme o schema.",
  });

  const response = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 4000,
    system: SYSTEM_ANALISE_OBRA,
    messages: [{ role: "user", content }],
  });

  const textBlocks = response.content.filter(
    (b): b is Extract<(typeof response.content)[number], { type: "text" }> =>
      b.type === "text",
  );
  const raw = textBlocks.map((b) => b.text).join("\n");

  let parsed: AnaliseObraResult;
  try {
    const json = JSON.parse(extractJson(raw));
    parsed = analiseObraSchema.parse(json);
  } catch (err) {
    throw new Error(
      `Resposta da IA não é JSON válido. Raw: ${raw.slice(0, 400)}…\nErro: ${
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
