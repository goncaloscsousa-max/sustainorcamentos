"use server";

import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { tabelaPrecos } from "@/lib/db/schema";
import {
  tabelaPrecoSchema,
  type TabelaPrecoInput,
} from "@/lib/validation/tabela-preco";
import { requireUser } from "@/lib/auth/require-user";

export type ImportCommitResult =
  | { ok: true; inserted: number; updated: number }
  | { ok: false; error: string };

export async function commitImportAction(
  rows: TabelaPrecoInput[],
): Promise<ImportCommitResult> {
  try {
    await requireUser();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Não autenticado." };
  }

  // Re-validar defensivamente no servidor — o cliente pode mentir.
  const validated: TabelaPrecoInput[] = [];
  for (const row of rows) {
    const parsed = tabelaPrecoSchema.safeParse(row);
    if (!parsed.success) {
      return {
        ok: false,
        error: `Linha inválida (${row.codigo ?? "sem código"}): ${parsed.error.issues[0].message}`,
      };
    }
    validated.push(parsed.data);
  }

  let inserted = 0;
  let updated = 0;

  try {
    for (const r of validated) {
      const res = await db
        .insert(tabelaPrecos)
        .values(r)
        .onConflictDoUpdate({
          target: tabelaPrecos.codigo,
          set: {
            categoria: r.categoria,
            descricao: r.descricao,
            unidade: r.unidade,
            precoClienteBaseCents: r.precoClienteBaseCents,
            custoInternoBaseCents: r.custoInternoBaseCents,
            rendimentoDiario: r.rendimentoDiario,
            observacoes: r.observacoes,
            ativo: r.ativo,
            updatedAt: sql`(unixepoch() * 1000)`,
          },
        })
        .returning({
          id: tabelaPrecos.id,
          createdAt: tabelaPrecos.createdAt,
          updatedAt: tabelaPrecos.updatedAt,
        });

      const row = res[0];
      if (row && row.createdAt.getTime() === row.updatedAt.getTime()) {
        inserted++;
      } else {
        updated++;
      }
    }
  } catch (err) {
    console.error("[tabelaPrecos.import]", err);
    return { ok: false, error: "Erro ao gravar itens na base de dados." };
  }

  revalidatePath("/tabela-precos");
  return { ok: true, inserted, updated };
}
