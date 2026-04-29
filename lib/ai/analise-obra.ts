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
  preco_cliente_unit_eur: z.number().nonnegative().default(0),
  custo_interno_unit_eur: z.number().nonnegative().default(0),
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
  /**
   * "atual" = fotografia do estado atual da obra (antes).
   * "referencia" = imagem de referência do resultado final pretendido.
   * A distinção é crítica para a IA não confundir target com source.
   */
  kind?: "atual" | "referencia";
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

/**
 * Exception lançada quando a chamada à Anthropic completou (tokens cobrados)
 * mas o output não é utilizável (parse falhou, max_tokens irrecuperável, etc).
 *
 * Carrega o `usage` para o caller poder registar em `analises_ia` o custo
 * mesmo em falha — caso contrário ficamos cegos a falhas IA caras.
 *
 * `publicMessage` é pt-PT user-friendly e pode ser mostrada na UI.
 * `internalDetail` é detalhe técnico só para logs.
 */
export class AnaliseAnthropicError extends Error {
  constructor(
    public readonly publicMessage: string,
    public readonly internalDetail: string,
    public readonly tokensInput: number,
    public readonly tokensOutput: number,
    public readonly custoEstimadoCents: number,
    public readonly stopReason: string | null,
    public readonly rawSnippet: string,
  ) {
    super(`${publicMessage} | ${internalDetail}`);
    this.name = "AnaliseAnthropicError";
  }
}

function extractJson(text: string): string {
  const trimmed = text.trim();
  // Fence completa ```json ... ```
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  if (fenced) return fenced[1].trim();
  // Fence aberta (resposta truncada antes do fecho): tira só o cabeçalho
  const openOnly = /^```(?:json)?\s*([\s\S]*)$/i.exec(trimmed);
  if (openOnly) return openOnly[1].replace(/```[\s\S]*$/i, "").trim();
  return trimmed;
}

/**
 * Tenta reparar um JSON truncado fechando arrays/objetos pendentes.
 * Usado como último recurso quando a resposta da IA foi cortada a meio
 * (stop_reason = max_tokens).
 */
function tryRepairTruncatedJson(text: string): string | null {
  let src = text.trim();
  if (!src.startsWith("{") && !src.startsWith("[")) return null;

  // Corta o último caractere se estiver claramente a meio de um valor
  // (vírgula final, dois pontos, aspas abertas, etc.).
  let inString = false;
  let escape = false;
  const stack: string[] = [];
  let lastSafe = -1;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\" && inString) {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      if (!inString) lastSafe = i;
      continue;
    }
    if (inString) continue;
    if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}") {
      if (stack.pop() !== "{") return null;
      lastSafe = i;
    } else if (ch === "]") {
      if (stack.pop() !== "[") return null;
      lastSafe = i;
    } else if (ch === "," || ch === ":" || /\s/.test(ch)) {
      // ignora
    } else {
      lastSafe = i;
    }
  }

  if (inString) {
    // Corta dentro da string — trunca até ao último ponto seguro fora de string
    src = src.slice(0, lastSafe + 1);
  } else if (lastSafe >= 0 && lastSafe < src.length - 1) {
    src = src.slice(0, lastSafe + 1);
  }

  // Remove vírgulas finais antes de fechar
  src = src.replace(/,\s*$/, "");

  // Fecha brackets/braces abertos
  const stillOpen: string[] = [];
  {
    let inStr = false;
    let esc = false;
    for (const ch of src) {
      if (esc) {
        esc = false;
        continue;
      }
      if (ch === "\\" && inStr) {
        esc = true;
        continue;
      }
      if (ch === '"') {
        inStr = !inStr;
        continue;
      }
      if (inStr) continue;
      if (ch === "{" || ch === "[") stillOpen.push(ch);
      else if (ch === "}" || ch === "]") stillOpen.pop();
    }
  }
  while (stillOpen.length > 0) {
    const open = stillOpen.pop();
    src += open === "{" ? "}" : "]";
  }

  return src;
}

/**
 * Valida se um buffer é um PDF razoável para enviar à Anthropic.
 * - Magic bytes `%PDF-` nos primeiros 8 bytes
 * - Tamanho < 10 MB (limite prático da API para documents)
 */
function isValidPdfForAI(buf: Buffer, maxBytes = 10 * 1024 * 1024): boolean {
  if (buf.byteLength === 0 || buf.byteLength > maxBytes) return false;
  const head = buf.subarray(0, 8).toString("latin1");
  return head.startsWith("%PDF-");
}

async function callAnthropic(
  client: ReturnType<typeof anthropic>,
  input: AnaliseInputs,
  opts: { includePdfs: boolean },
) {
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

  const atuais = input.images.filter((i) => i.kind !== "referencia");
  const referencias = input.images.filter((i) => i.kind === "referencia");

  atuais.forEach((img, i) => {
    content.push({
      type: "text",
      text: `Foto do ESTADO ATUAL da obra ${i + 1}${img.label ? ` — ${img.label}` : ""} (é aquilo que tens de demolir/substituir/preparar):`,
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

  referencias.forEach((img, i) => {
    content.push({
      type: "text",
      text: `Imagem de REFERÊNCIA ${i + 1}${img.label ? ` — ${img.label}` : ""} — como a obra deve ficar no final (acabamentos, paleta, estilo pretendido pelo cliente). NÃO é o estado atual.`,
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

  if (opts.includePdfs) {
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
  }

  content.push({
    type: "text",
    text: "Analisa os inputs acima e devolve o JSON conforme o schema.",
  });

  return client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 16000,
    system: SYSTEM_ANALISE_OBRA,
    messages: [{ role: "user", content }],
  });
}

function isPdfProcessingError(err: unknown): boolean {
  if (err == null || typeof err !== "object") return false;
  const e = err as { status?: number; message?: unknown };
  const msg = typeof e.message === "string" ? e.message.toLowerCase() : "";
  return (
    e.status === 400 &&
    (msg.includes("could not process pdf") || msg.includes("process pdf"))
  );
}

export async function analisarObra(
  input: AnaliseInputs,
): Promise<AnaliseOutcome> {
  const client = anthropic();

  // Filtra PDFs obviamente inválidos antes de pagar a chamada
  const validPdfs = input.pdfs.filter((p) => isValidPdfForAI(p.data));
  const preSkippedLabels = input.pdfs
    .filter((p) => !isValidPdfForAI(p.data))
    .map((p) => p.label || "(sem nome)");

  const filteredInput: AnaliseInputs = { ...input, pdfs: validPdfs };

  let response: Awaited<ReturnType<typeof client.messages.create>>;
  let retriedWithoutPdfs = false;

  try {
    response = await callAnthropic(client, filteredInput, {
      includePdfs: validPdfs.length > 0,
    });
  } catch (err) {
    if (isPdfProcessingError(err) && validPdfs.length > 0) {
      retriedWithoutPdfs = true;
      response = await callAnthropic(client, filteredInput, {
        includePdfs: false,
      });
    } else {
      throw err;
    }
  }

  const textBlocks = response.content.filter(
    (b): b is Extract<(typeof response.content)[number], { type: "text" }> =>
      b.type === "text",
  );
  const raw = textBlocks.map((b) => b.text).join("\n");
  const stopReason = response.stop_reason ?? null;

  // Usage já é conhecido neste ponto — preserva para reportar mesmo em falha
  const tokensInput = response.usage.input_tokens;
  const tokensOutput = response.usage.output_tokens;
  const custoEstimadoCents = estimarCustoCents(tokensInput, tokensOutput);

  const jsonText = extractJson(raw);
  let parsed: AnaliseObraResult;
  let truncatedRepair = false;
  let truncatedReason: "max_tokens" | "json_invalid" | null = null;
  try {
    parsed = analiseObraSchema.parse(JSON.parse(jsonText));
  } catch (errParse) {
    // Tenta reparar JSON truncado/inválido. Funciona tanto para
    // stop_reason='max_tokens' como para JSON malformado por outras razões.
    // Se conseguirmos parsear o reparado, aplica + flag truncatedRepair=true
    // (uma nota é adicionada a observacoes_gerais a avisar o utilizador).
    const repaired = tryRepairTruncatedJson(jsonText);
    if (repaired) {
      try {
        parsed = analiseObraSchema.parse(JSON.parse(repaired));
        truncatedRepair = true;
        truncatedReason =
          stopReason === "max_tokens" ? "max_tokens" : "json_invalid";
      } catch {
        // Repair também falhou — lança AnaliseAnthropicError com usage
        // para o caller registar custo em analises_ia.
        if (stopReason === "max_tokens") {
          throw new AnaliseAnthropicError(
            "A IA atingiu o limite de tokens da resposta e não foi possível recuperar nada parsável. Tenta com menos fotos/PDFs ou divide a obra em fases.",
            `repair failed after max_tokens; raw=${raw.slice(0, 400)}`,
            tokensInput,
            tokensOutput,
            custoEstimadoCents,
            stopReason,
            raw.slice(0, 400),
          );
        }
        throw new AnaliseAnthropicError(
          "A IA devolveu uma resposta que não conseguimos interpretar. Tenta de novo dentro de alguns segundos.",
          `JSON invalid + repair failed: ${errParse instanceof Error ? errParse.message : String(errParse)}; raw=${raw.slice(0, 400)}`,
          tokensInput,
          tokensOutput,
          custoEstimadoCents,
          stopReason,
          raw.slice(0, 400),
        );
      }
    } else {
      if (stopReason === "max_tokens") {
        throw new AnaliseAnthropicError(
          "A IA atingiu o limite de tokens da resposta e o output não tem estrutura recuperável. Tenta com menos fotos/PDFs.",
          `no json structure to repair after max_tokens; raw=${raw.slice(0, 400)}`,
          tokensInput,
          tokensOutput,
          custoEstimadoCents,
          stopReason,
          raw.slice(0, 400),
        );
      }
      throw new AnaliseAnthropicError(
        "A IA devolveu uma resposta inesperada. Tenta de novo.",
        `no json structure; ${errParse instanceof Error ? errParse.message : String(errParse)}; raw=${raw.slice(0, 400)}`,
        tokensInput,
        tokensOutput,
        custoEstimadoCents,
        stopReason,
        raw.slice(0, 400),
      );
    }
  }

  const pdfNotes: string[] = [];
  if (preSkippedLabels.length > 0) {
    pdfNotes.push(
      `PDFs ignorados por serem inválidos ou demasiado grandes (>10 MB): ${preSkippedLabels.join(", ")}.`,
    );
  }
  if (retriedWithoutPdfs) {
    const labels = validPdfs.map((p) => p.label || "(sem nome)");
    pdfNotes.push(
      `A Anthropic não conseguiu processar ${labels.length === 1 ? "o PDF" : "os PDFs"} ${labels.join(", ")} — análise feita apenas com fotos e contexto. Considera reexportar o PDF ou partilhar os dados em texto.`,
    );
  }
  if (truncatedRepair) {
    if (truncatedReason === "max_tokens") {
      pdfNotes.push(
        "Nota: a IA atingiu o limite de tokens — o último trabalho proposto pode estar incompleto. Revê manualmente as últimas linhas e considera dividir esta obra em fases para obter análise mais detalhada.",
      );
    } else {
      pdfNotes.push(
        "Nota: a resposta da IA veio truncada e foi reparada automaticamente — o último item pode estar incompleto. Revê manualmente.",
      );
    }
  }
  if (pdfNotes.length > 0) {
    const prefix = parsed.observacoes_gerais.trim();
    parsed.observacoes_gerais = [prefix, ...pdfNotes]
      .filter(Boolean)
      .join("\n\n");
  }

  return {
    parsed,
    raw,
    tokensInput,
    tokensOutput,
    custoEstimadoCents,
  };
}
