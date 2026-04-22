"use server";

import { revalidatePath } from "next/cache";
import { asc, eq, max } from "drizzle-orm";

import { auth } from "@/auth";
import { analisarObra } from "@/lib/ai/analise-obra";
import { sugerirPreco } from "@/lib/ai/sugestao-preco";
import { db } from "@/lib/db";
import {
  analisesIA,
  ficheirosObra,
  linhasOrcamento,
  obras,
  orcamentos,
  riscosIdentificados,
} from "@/lib/db/schema";
import { readUpload } from "@/lib/uploads/storage";
import { xlsxToText } from "@/lib/uploads/xlsx-to-text";
import { labelForTipoObra } from "@/lib/format";

const MAX_IMAGES_PER_ANALYSIS = 8;
const MAX_PDFS_PER_ANALYSIS = 3;

type ImageMime = "image/jpeg" | "image/png" | "image/webp";

function imageMime(mime: string | null | undefined): ImageMime | null {
  if (!mime) return null;
  const m = mime.toLowerCase();
  if (m === "image/jpeg" || m === "image/jpg") return "image/jpeg";
  if (m === "image/png") return "image/png";
  if (m === "image/webp") return "image/webp";
  return null;
}

export type AnaliseOutcomeUI =
  | {
      ok: true;
      trabalhosAdicionados: number;
      riscosAdicionados: number;
      observacoesGerais: string;
      custoEstimadoCents: number;
      tokensInput: number;
      tokensOutput: number;
    }
  | { ok: false; error: string };

/**
 * Corre a análise IA sobre a obra e aplica os resultados ao orçamento atual:
 *  - cria linhas em `linhas_orcamento` (origem: 'ia_sugestao', preço 0)
 *  - cria riscos em `riscos_identificados`
 *  - regista em `analises_ia` (tokens, custo, output raw)
 */
export async function analisarObraAction(
  orcamentoId: string,
): Promise<AnaliseOutcomeUI> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Não autenticado." };

  const orcamento = await db.query.orcamentos.findFirst({
    where: eq(orcamentos.id, orcamentoId),
  });
  if (!orcamento) return { ok: false, error: "Orçamento não encontrado." };

  const obra = await db.query.obras.findFirst({
    where: eq(obras.id, orcamento.obraId),
  });
  if (!obra) return { ok: false, error: "Obra não encontrada." };

  const ficheiros = await db
    .select()
    .from(ficheirosObra)
    .where(eq(ficheirosObra.obraId, obra.id))
    .orderBy(asc(ficheirosObra.uploadedAt));

  if (ficheiros.length === 0) {
    return {
      ok: false,
      error: "Sem ficheiros carregados — faz upload de fotos ou MTQ antes.",
    };
  }

  const images: {
    mediaType: ImageMime;
    data: Buffer;
    label?: string;
  }[] = [];
  const pdfs: {
    mediaType: "application/pdf";
    data: Buffer;
    label?: string;
  }[] = [];
  let mtqTexto = "";

  for (const f of ficheiros) {
    if (f.mimeType?.startsWith("image/")) {
      if (images.length >= MAX_IMAGES_PER_ANALYSIS) continue;
      const mt = imageMime(f.mimeType);
      if (!mt) continue;
      try {
        const buf = await readUpload(f.storagePath);
        images.push({ mediaType: mt, data: buf, label: f.nomeOriginal });
      } catch (err) {
        console.error("[ia.readImage]", f.storagePath, err);
      }
    } else if (f.mimeType === "application/pdf") {
      if (pdfs.length >= MAX_PDFS_PER_ANALYSIS) continue;
      try {
        const buf = await readUpload(f.storagePath);
        pdfs.push({
          mediaType: "application/pdf",
          data: buf,
          label: f.nomeOriginal,
        });
      } catch (err) {
        console.error("[ia.readPdf]", f.storagePath, err);
      }
    } else if (
      f.tipo === "mtq" ||
      f.mimeType?.includes("spreadsheet") ||
      f.mimeType === "application/vnd.ms-excel"
    ) {
      try {
        const buf = await readUpload(f.storagePath);
        const texto = await xlsxToText(buf);
        mtqTexto += `\n\n## ${f.nomeOriginal}\n${texto}`;
      } catch (err) {
        console.error("[ia.readXlsx]", f.storagePath, err);
      }
    }
  }

  const contexto = [
    `Obra: ${obra.titulo}`,
    `Tipo: ${labelForTipoObra(obra.tipo)}`,
    `Morada: ${obra.moradaObra}`,
    obra.notas ? `Notas do orçamentista: ${obra.notas}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  let outcome;
  try {
    outcome = await analisarObra({
      contextoObra: contexto,
      images,
      pdfs,
      mtqTexto: mtqTexto.trim() || undefined,
    });
  } catch (err) {
    console.error("[ia.analisarObra]", err);
    const msg = err instanceof Error ? err.message : "Erro a chamar a IA.";
    return { ok: false, error: msg };
  }

  const { parsed } = outcome;

  // Próxima ordem (não sobrescrevemos linhas manuais existentes)
  const [maxRow] = await db
    .select({ m: max(linhasOrcamento.ordem) })
    .from(linhasOrcamento)
    .where(eq(linhasOrcamento.orcamentoId, orcamentoId));
  let nextOrdem = (maxRow?.m ?? -1) + 1;

  try {
    db.transaction((tx) => {
      if (parsed.trabalhos_propostos.length > 0) {
        tx.insert(linhasOrcamento)
          .values(
            parsed.trabalhos_propostos.map((t) => ({
              orcamentoId,
              categoria: t.categoria,
              ordem: nextOrdem++,
              descricao: t.descricao,
              unidade: t.unidade,
              quantidade: t.quantidade_sugerida,
              precoClienteUnitCents: 0,
              custoInternoUnitCents: null,
              totalClienteCents: 0,
              totalCustoInternoCents: 0,
              origem: "ia_sugestao" as const,
              tabelaPrecoId: null,
              notas:
                t.justificacao + (t.confianca ? ` · confiança ${t.confianca}` : ""),
            })),
          )
          .run();
      }

      if (parsed.riscos.length > 0) {
        tx.insert(riscosIdentificados)
          .values(
            parsed.riscos.map((r) => ({
              orcamentoId,
              descricao: r.descricao,
              severidade: r.severidade,
              impactoEstimado: r.impacto_estimado || null,
              custoAdicionalEstimadoCents:
                r.custo_adicional_estimado_eur == null
                  ? null
                  : Math.round(r.custo_adicional_estimado_eur * 100),
              recomendacao: r.recomendacao || null,
              fonte: r.fonte || null,
              resolvido: false,
            })),
          )
          .run();
      }

      tx.insert(analisesIA)
        .values({
          orcamentoId,
          tipo: "extracao_trabalhos",
          inputResumo: `imgs:${images.length} pdfs:${pdfs.length} mtq:${mtqTexto.length > 0 ? "sim" : "não"}`,
          outputRaw: parsed,
          tokensInput: outcome.tokensInput,
          tokensOutput: outcome.tokensOutput,
          custoEstimadoCents: outcome.custoEstimadoCents,
        })
        .run();
    });
  } catch (err) {
    console.error("[ia.applyAnalise]", err);
    return { ok: false, error: "Erro a aplicar resultados da análise." };
  }

  revalidatePath(`/obras/${obra.id}/orcamento/${orcamentoId}`);

  return {
    ok: true,
    trabalhosAdicionados: parsed.trabalhos_propostos.length,
    riscosAdicionados: parsed.riscos.length,
    observacoesGerais: parsed.observacoes_gerais,
    custoEstimadoCents: outcome.custoEstimadoCents,
    tokensInput: outcome.tokensInput,
    tokensOutput: outcome.tokensOutput,
  };
}

export type SugestaoPrecoUI =
  | {
      ok: true;
      precoClienteCents: number;
      custoInternoCents: number;
      justificacao: string;
      confianca: "alta" | "media" | "baixa";
    }
  | { ok: false; error: string };

export async function sugerirPrecoAction(input: {
  descricao: string;
  unidade: string;
  categoria?: string | null;
  quantidade?: number | null;
  orcamentoId: string;
}): Promise<SugestaoPrecoUI> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Não autenticado." };

  if (!input.descricao?.trim()) {
    return { ok: false, error: "Descreve primeiro o trabalho." };
  }
  if (!input.unidade) {
    return { ok: false, error: "Indica a unidade (m², ml, un, ...)." };
  }

  try {
    const out = await sugerirPreco({
      descricao: input.descricao,
      unidade: input.unidade,
      categoria: input.categoria ?? null,
      quantidade: input.quantidade ?? null,
    });

    // Regista no histórico, mesmo sem aplicar (útil para debug + custo)
    try {
      await db.insert(analisesIA).values({
        orcamentoId: input.orcamentoId,
        tipo: "sugestao_preco",
        inputResumo: `${input.descricao.slice(0, 120)} (${input.unidade})`,
        outputRaw: out.parsed,
        tokensInput: out.tokensInput,
        tokensOutput: out.tokensOutput,
        custoEstimadoCents: out.custoEstimadoCents,
      });
    } catch (err) {
      console.error("[ia.sugestao.logging]", err);
    }

    return {
      ok: true,
      precoClienteCents: out.precoClienteCents,
      custoInternoCents: out.custoInternoCents,
      justificacao: out.parsed.justificacao,
      confianca: out.parsed.confianca,
    };
  } catch (err) {
    console.error("[ia.sugerirPreco]", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro a pedir sugestão.",
    };
  }
}

export async function toggleRiscoResolvidoAction(
  riscoId: string,
  resolvido: boolean,
): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const [r] = await db
    .select()
    .from(riscosIdentificados)
    .where(eq(riscosIdentificados.id, riscoId))
    .limit(1);
  if (!r) throw new Error("Risco não encontrado.");

  await db
    .update(riscosIdentificados)
    .set({ resolvido })
    .where(eq(riscosIdentificados.id, riscoId));

  const orc = await db.query.orcamentos.findFirst({
    where: eq(orcamentos.id, r.orcamentoId),
  });
  if (orc) {
    revalidatePath(`/obras/${orc.obraId}/orcamento/${r.orcamentoId}`);
  }
}

export async function deleteRiscoAction(riscoId: string): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const [r] = await db
    .select()
    .from(riscosIdentificados)
    .where(eq(riscosIdentificados.id, riscoId))
    .limit(1);
  if (!r) return;

  await db
    .delete(riscosIdentificados)
    .where(eq(riscosIdentificados.id, riscoId));

  const orc = await db.query.orcamentos.findFirst({
    where: eq(orcamentos.id, r.orcamentoId),
  });
  if (orc) {
    revalidatePath(`/obras/${orc.obraId}/orcamento/${r.orcamentoId}`);
  }
}
