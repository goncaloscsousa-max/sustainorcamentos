"use server";

import { revalidatePath } from "next/cache";
import { asc, desc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  analisesIA,
  ficheirosObra,
  linhasOrcamento,
  obras,
  orcamentos,
} from "@/lib/db/schema";
import { sugerirMateriais } from "@/lib/ai/sugestao-materiais";
import { briefingToPrompt, tryParseBriefing } from "@/lib/data/briefing-obra";
import { buildRegionalContextForAI } from "@/lib/data/portugal-locations";
import { requireUser } from "@/lib/auth/require-user";

export type SugerirMateriaisOutcome =
  | { ok: true; sugestoesCount: number; custoEstimadoCents: number }
  | { ok: false; error: string };

export async function sugerirMateriaisAction(
  obraId: string,
): Promise<SugerirMateriaisOutcome> {
  const runId = crypto.randomUUID().slice(0, 8);
  const log = (event: string, extra?: unknown) =>
    console.log(`[ia.materiais ${runId}] ${event}`, extra ?? "");
  const errorLog = (event: string, extra?: unknown) =>
    console.error(`[ia.materiais ${runId}] ${event}`, extra ?? "");

  try {
    await requireUser();
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Não autenticado.",
    };
  }

  const obra = await db.query.obras.findFirst({ where: eq(obras.id, obraId) });
  if (!obra) return { ok: false, error: "Obra não encontrada." };

  // Defesa em profundidade: o botão na UI também valida estes pré-requisitos,
  // mas validamos aqui para impedir bypass via curl directo à action.
  const briefing = tryParseBriefing(obra.briefing);
  if (!briefing) {
    return {
      ok: false,
      error:
        "Esta obra ainda não tem briefing estruturado preenchido — edita-a primeiro.",
    };
  }

  const [{ count: numFicheiros }] = (await db
    .select({ count: sql<number>`count(*)` })
    .from(ficheirosObra)
    .where(eq(ficheirosObra.obraId, obraId))) as { count: number }[];
  if (Number(numFicheiros) === 0) {
    return {
      ok: false,
      error:
        "Carrega primeiro fotos do estado actual (ou referências) — a IA precisa de inputs visuais para sugerir materiais coerentes.",
    };
  }

  log("start", { obraId });

  // Resumo de trabalhos do orçamento mais recente (se existir)
  const [orc] = await db
    .select()
    .from(orcamentos)
    .where(eq(orcamentos.obraId, obraId))
    .orderBy(desc(orcamentos.versao))
    .limit(1);

  let trabalhosResumo: string | null = null;
  if (orc) {
    const linhas = await db
      .select()
      .from(linhasOrcamento)
      .where(eq(linhasOrcamento.orcamentoId, orc.id))
      .orderBy(asc(linhasOrcamento.ordem));
    if (linhas.length > 0) {
      trabalhosResumo = linhas
        .slice(0, 30)
        .map((l) => `- [${l.categoria}] ${l.descricao} (${l.quantidade} ${l.unidade})`)
        .join("\n");
    }
  }

  const briefingTexto = briefingToPrompt(briefing);
  const regiaoContexto = buildRegionalContextForAI(obra.distrito, obra.cidade);

  let outcome;
  try {
    outcome = await sugerirMateriais({
      briefingTexto,
      regiaoContexto,
      trabalhosResumo,
    });
  } catch (err) {
    // Logamos detalhe completo no servidor (com runId para correlação), mas
    // devolvemos mensagem genérica pt-PT ao utilizador.
    errorLog("anthropic call failed", err);
    return {
      ok: false,
      error:
        "Não foi possível gerar sugestões agora. Tenta de novo dentro de alguns segundos.",
    };
  }

  try {
    await db
      .update(obras)
      .set({
        sugestoesMateriais: JSON.stringify(outcome.parsed),
        sugestoesMateriaisAtualizadasEm: new Date(),
      })
      .where(eq(obras.id, obraId));

    if (orc) {
      await db.insert(analisesIA).values({
        orcamentoId: orc.id,
        tipo: "sugestao_materiais",
        inputResumo: `run:${runId} materiais obra:${obraId} n:${outcome.parsed.sugestoes.length}`,
        outputRaw: outcome.parsed,
        tokensInput: outcome.tokensInput,
        tokensOutput: outcome.tokensOutput,
        custoEstimadoCents: outcome.custoEstimadoCents,
      });
    }
  } catch (err) {
    errorLog("persist failed", err);
    return { ok: false, error: "Erro a guardar sugestões." };
  }

  log("done", {
    sugestoes: outcome.parsed.sugestoes.length,
    custoCents: outcome.custoEstimadoCents,
  });
  revalidatePath(`/obras/${obraId}`);
  return {
    ok: true,
    sugestoesCount: outcome.parsed.sugestoes.length,
    custoEstimadoCents: outcome.custoEstimadoCents,
  };
}
