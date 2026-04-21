"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { linhasOrcamento, obras, orcamentos } from "@/lib/db/schema";
import {
  saveOrcamentoSchema,
  type SaveOrcamentoInput,
} from "@/lib/validation/orcamento";

/**
 * Totais calculados em TS (convenção em ADR 0001).
 * Tudo em cêntimos. Margem em basis points.
 */
function computeTotals(
  linhas: SaveOrcamentoInput["linhas"],
  ivaBps: number,
) {
  let subtotalCents = 0;
  let custoInternoTotalCents = 0;

  const linhasCalc = linhas.map((l) => {
    const totalClienteCents = Math.round(
      l.quantidade * l.precoClienteUnitCents,
    );
    const totalCustoInternoCents =
      l.custoInternoUnitCents == null
        ? 0
        : Math.round(l.quantidade * l.custoInternoUnitCents);
    subtotalCents += totalClienteCents;
    custoInternoTotalCents += totalCustoInternoCents;
    return {
      ...l,
      totalClienteCents,
      totalCustoInternoCents,
    };
  });

  const ivaTotalCents = Math.round((subtotalCents * ivaBps) / 10000);
  const totalCents = subtotalCents + ivaTotalCents;
  const margemTeoricaBps =
    subtotalCents > 0
      ? Math.round(
          ((subtotalCents - custoInternoTotalCents) / subtotalCents) * 10000,
        )
      : 0;

  return {
    linhas: linhasCalc,
    subtotalCents,
    ivaTotalCents,
    totalCents,
    custoInternoTotalCents,
    margemTeoricaBps,
  };
}

export async function createOrcamentoAction(obraId: string): Promise<void> {
  const obra = await db.query.obras.findFirst({ where: eq(obras.id, obraId) });
  if (!obra) throw new Error("Obra não encontrada.");

  const last = await db
    .select({ versao: orcamentos.versao })
    .from(orcamentos)
    .where(eq(orcamentos.obraId, obraId))
    .orderBy(desc(orcamentos.versao))
    .limit(1);

  const nextVersao = (last[0]?.versao ?? 0) + 1;

  let newId: string;
  try {
    const [row] = await db
      .insert(orcamentos)
      .values({ obraId, versao: nextVersao })
      .returning({ id: orcamentos.id });
    newId = row.id;
  } catch (err) {
    console.error("[orcamento.create]", err);
    throw new Error("Não foi possível criar o orçamento.");
  }

  revalidatePath(`/obras/${obraId}`);
  redirect(`/obras/${obraId}/orcamento/${newId}`);
}

export type SaveOrcamentoResult =
  | { ok: true; success: string }
  | { ok: false; error: string };

export async function saveOrcamentoAction(
  orcamentoId: string,
  input: unknown,
): Promise<SaveOrcamentoResult> {
  const parsed = saveOrcamentoSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: `${first.path.map(String).join(".") || "input"}: ${first.message}`,
    };
  }

  const existing = await db.query.orcamentos.findFirst({
    where: eq(orcamentos.id, orcamentoId),
  });
  if (!existing) return { ok: false, error: "Orçamento não encontrado." };

  const totals = computeTotals(
    parsed.data.linhas,
    parsed.data.header.ivaPercentagemBps,
  );

  try {
    db.transaction((tx) => {
      tx.delete(linhasOrcamento)
        .where(eq(linhasOrcamento.orcamentoId, orcamentoId))
        .run();

      if (totals.linhas.length > 0) {
        tx.insert(linhasOrcamento)
          .values(
            totals.linhas.map((l, i) => ({
              orcamentoId,
              categoria: l.categoria,
              ordem: i,
              descricao: l.descricao,
              unidade: l.unidade,
              quantidade: l.quantidade,
              precoClienteUnitCents: l.precoClienteUnitCents,
              custoInternoUnitCents: l.custoInternoUnitCents,
              totalClienteCents: l.totalClienteCents,
              totalCustoInternoCents: l.totalCustoInternoCents,
              origem: l.origem,
              tabelaPrecoId: l.tabelaPrecoId,
              notas: l.notas,
            })),
          )
          .run();
      }

      tx.update(orcamentos)
        .set({
          estado: parsed.data.header.estado,
          dataEmissao: parsed.data.header.dataEmissao,
          validadeDias: parsed.data.header.validadeDias,
          ivaPercentagemBps: parsed.data.header.ivaPercentagemBps,
          condicoesPagamento: parsed.data.header.condicoesPagamento,
          observacoes: parsed.data.header.observacoes,
          subtotalCents: totals.subtotalCents,
          ivaTotalCents: totals.ivaTotalCents,
          totalCents: totals.totalCents,
          custoInternoTotalCents: totals.custoInternoTotalCents,
          margemTeoricaBps: totals.margemTeoricaBps,
        })
        .where(eq(orcamentos.id, orcamentoId))
        .run();
    });
  } catch (err) {
    console.error("[orcamento.save]", err);
    return { ok: false, error: "Erro a gravar orçamento." };
  }

  revalidatePath(`/obras/${existing.obraId}`);
  revalidatePath(`/obras/${existing.obraId}/orcamento/${orcamentoId}`);
  return { ok: true, success: "Orçamento guardado." };
}

export async function duplicateOrcamentoAction(
  orcamentoId: string,
): Promise<void> {
  const existing = await db.query.orcamentos.findFirst({
    where: eq(orcamentos.id, orcamentoId),
    with: { linhas: true },
  });
  if (!existing) throw new Error("Orçamento não encontrado.");

  const last = await db
    .select({ versao: orcamentos.versao })
    .from(orcamentos)
    .where(eq(orcamentos.obraId, existing.obraId))
    .orderBy(desc(orcamentos.versao))
    .limit(1);

  const nextVersao = (last[0]?.versao ?? existing.versao) + 1;

  let newId: string;
  try {
    newId = db.transaction((tx) => {
      const [novo] = tx
        .insert(orcamentos)
        .values({
          obraId: existing.obraId,
          versao: nextVersao,
          estado: "rascunho",
          validadeDias: existing.validadeDias,
          ivaPercentagemBps: existing.ivaPercentagemBps,
          condicoesPagamento: existing.condicoesPagamento,
          observacoes: existing.observacoes,
          subtotalCents: existing.subtotalCents,
          ivaTotalCents: existing.ivaTotalCents,
          totalCents: existing.totalCents,
          custoInternoTotalCents: existing.custoInternoTotalCents,
          margemTeoricaBps: existing.margemTeoricaBps,
        })
        .returning({ id: orcamentos.id })
        .all();

      if (existing.linhas.length > 0) {
        tx.insert(linhasOrcamento)
          .values(
            existing.linhas.map((l) => ({
              orcamentoId: novo.id,
              categoria: l.categoria,
              ordem: l.ordem,
              descricao: l.descricao,
              unidade: l.unidade,
              quantidade: l.quantidade,
              precoClienteUnitCents: l.precoClienteUnitCents,
              custoInternoUnitCents: l.custoInternoUnitCents,
              totalClienteCents: l.totalClienteCents,
              totalCustoInternoCents: l.totalCustoInternoCents,
              origem: l.origem,
              tabelaPrecoId: l.tabelaPrecoId,
              notas: l.notas,
            })),
          )
          .run();
      }
      return novo.id;
    });
  } catch (err) {
    console.error("[orcamento.duplicate]", err);
    throw new Error("Não foi possível duplicar o orçamento.");
  }

  revalidatePath(`/obras/${existing.obraId}`);
  redirect(`/obras/${existing.obraId}/orcamento/${newId}`);
}

export async function deleteOrcamentoAction(
  orcamentoId: string,
): Promise<void> {
  const existing = await db.query.orcamentos.findFirst({
    where: eq(orcamentos.id, orcamentoId),
  });
  if (!existing) throw new Error("Orçamento não encontrado.");

  try {
    await db.delete(orcamentos).where(eq(orcamentos.id, orcamentoId));
  } catch (err) {
    console.error("[orcamento.delete]", err);
    throw new Error("Não foi possível apagar o orçamento.");
  }
  revalidatePath(`/obras/${existing.obraId}`);
  redirect(`/obras/${existing.obraId}`);
}
