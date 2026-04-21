"use server";

import { and, eq, like, or } from "drizzle-orm";

import { db } from "@/lib/db";
import { tabelaPrecos } from "@/lib/db/schema";

export type SearchResult = {
  id: string;
  codigo: string;
  categoria: string;
  descricao: string;
  unidade: string;
  precoClienteBaseCents: number;
  custoInternoBaseCents: number | null;
};

export async function searchTabelaPrecosAction(
  query: string,
): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const pattern = `%${q}%`;
  const rows = await db
    .select({
      id: tabelaPrecos.id,
      codigo: tabelaPrecos.codigo,
      categoria: tabelaPrecos.categoria,
      descricao: tabelaPrecos.descricao,
      unidade: tabelaPrecos.unidade,
      precoClienteBaseCents: tabelaPrecos.precoClienteBaseCents,
      custoInternoBaseCents: tabelaPrecos.custoInternoBaseCents,
    })
    .from(tabelaPrecos)
    .where(
      and(
        eq(tabelaPrecos.ativo, true),
        or(
          like(tabelaPrecos.codigo, pattern),
          like(tabelaPrecos.descricao, pattern),
        ),
      ),
    )
    .limit(20);

  return rows;
}
