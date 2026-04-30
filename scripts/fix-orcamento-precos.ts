/**
 * Re-aplica o sanity check ITERATIVO aos preços de linhas com origem='ia_sugestao'
 * em todos os orçamentos existentes. Usa-se quando o sanity check antigo
 * (uma única divisão) não chegou para apanhar confusões cents/EUR de ×10 000
 * por parte da IA.
 *
 * Para cada linha:
 *   1. Lê preco_cents e custo_cents
 *   2. Converte para EUR (÷ 100)
 *   3. Aplica sanity iterativo (até 3 divisões por 100) com base na unidade
 *   4. Se mudou, actualiza preco/custo/totais da linha + adiciona nota
 *
 * Para cada orçamento que teve linhas tocadas:
 *   - Recomputa subtotal, IVA, total, custo interno e margem teórica
 *
 * Uso:
 *   npm run -- tsx scripts/fix-orcamento-precos.ts            # DRY RUN (default)
 *   npm run -- tsx scripts/fix-orcamento-precos.ts --apply    # aplica
 */

import Database from "better-sqlite3";
import path from "node:path";

const DB_PATH =
  process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "sustain.db");

const APPLY = process.argv.includes("--apply");

const SANITY_THRESHOLD_PER_UNIT_EUR: Record<string, number> = {
  "m²": 500,
  "m³": 1000,
  ml: 250,
  un: 5000,
  vg: 100000,
  h: 200,
};

const MAX_ITER = 3;

function sanityCheckPrecoEur(
  unidade: string,
  valorEur: number,
): { valorAjustadoEur: number; iteracoes: number } {
  const threshold = SANITY_THRESHOLD_PER_UNIT_EUR[unidade] ?? 10000;
  let v = valorEur;
  let iteracoes = 0;
  while (v > threshold && iteracoes < MAX_ITER) {
    v = v / 100;
    iteracoes += 1;
  }
  return { valorAjustadoEur: v, iteracoes };
}

type Linha = {
  id: string;
  orcamento_id: string;
  origem: string;
  unidade: string;
  quantidade: number;
  preco_cliente_unit_cents: number;
  custo_interno_unit_cents: number | null;
  total_cliente_cents: number;
  total_custo_interno_cents: number;
  notas: string | null;
};

type Orcamento = {
  id: string;
  iva_percentagem_bps: number;
};

const sqlite = new Database(DB_PATH, { readonly: !APPLY });
sqlite.pragma("foreign_keys = ON");

const allLinhas = sqlite
  .prepare<[], Linha>(
    `SELECT id, orcamento_id, origem, unidade, quantidade,
            preco_cliente_unit_cents, custo_interno_unit_cents,
            total_cliente_cents, total_custo_interno_cents, notas
       FROM linhas_orcamento
       WHERE origem = 'ia_sugestao'`,
  )
  .all();

console.log(
  `[fix] modo: ${APPLY ? "APPLY" : "DRY RUN"} — DB: ${DB_PATH}`,
);
console.log(`[fix] linhas IA encontradas: ${allLinhas.length}`);

const updates: {
  linhaId: string;
  orcamentoId: string;
  unidade: string;
  qty: number;
  precoOldCents: number;
  precoNewCents: number;
  custoOldCents: number | null;
  custoNewCents: number | null;
  totalOldCents: number;
  totalNewCents: number;
  totalCustoOldCents: number;
  totalCustoNewCents: number;
  notaExtra: string;
}[] = [];

for (const l of allLinhas) {
  const precoEur = l.preco_cliente_unit_cents / 100;
  const custoEur =
    l.custo_interno_unit_cents != null ? l.custo_interno_unit_cents / 100 : 0;

  const ps = sanityCheckPrecoEur(l.unidade, precoEur);
  const cs = sanityCheckPrecoEur(l.unidade, custoEur);

  if (ps.iteracoes === 0 && cs.iteracoes === 0) continue;

  const precoNewCents = Math.round(ps.valorAjustadoEur * 100);
  const custoNewCents =
    l.custo_interno_unit_cents != null
      ? Math.round(cs.valorAjustadoEur * 100)
      : null;
  const totalNewCents = Math.round(l.quantidade * precoNewCents);
  const totalCustoNewCents =
    custoNewCents != null ? Math.round(l.quantidade * custoNewCents) : 0;

  const notas: string[] = [];
  if (ps.iteracoes > 0) {
    notas.push(
      `[FIX RETROACTIVO] preço cliente ajustado de ${precoEur.toFixed(2)} para ${ps.valorAjustadoEur.toFixed(2)} €/${l.unidade} (÷100^${ps.iteracoes}). VERIFICA.`,
    );
  }
  if (cs.iteracoes > 0) {
    notas.push(
      `[FIX RETROACTIVO] custo interno ajustado de ${custoEur.toFixed(2)} para ${cs.valorAjustadoEur.toFixed(2)} €/${l.unidade} (÷100^${cs.iteracoes}).`,
    );
  }

  updates.push({
    linhaId: l.id,
    orcamentoId: l.orcamento_id,
    unidade: l.unidade,
    qty: l.quantidade,
    precoOldCents: l.preco_cliente_unit_cents,
    precoNewCents,
    custoOldCents: l.custo_interno_unit_cents,
    custoNewCents,
    totalOldCents: l.total_cliente_cents,
    totalNewCents,
    totalCustoOldCents: l.total_custo_interno_cents,
    totalCustoNewCents,
    notaExtra: notas.join("\n"),
  });
}

console.log(`[fix] linhas a ajustar: ${updates.length}`);
if (updates.length === 0) {
  console.log("[fix] nada a fazer.");
  sqlite.close();
  process.exit(0);
}

console.log("\n--- preview (primeiras 10) ---");
console.table(
  updates.slice(0, 10).map((u) => ({
    linha: u.linhaId.slice(0, 8),
    unidade: u.unidade,
    qty: u.qty,
    preco_old: (u.precoOldCents / 100).toFixed(2),
    preco_new: (u.precoNewCents / 100).toFixed(2),
    total_old: (u.totalOldCents / 100).toFixed(2),
    total_new: (u.totalNewCents / 100).toFixed(2),
  })),
);

const orcamentosTouched = new Set(updates.map((u) => u.orcamentoId));
console.log(`\n[fix] orçamentos afectados: ${orcamentosTouched.size}`);

if (!APPLY) {
  console.log(
    "\n[fix] DRY RUN — nada gravado. Para aplicar:\n  tsx scripts/fix-orcamento-precos.ts --apply",
  );
  sqlite.close();
  process.exit(0);
}

// --- APPLY ---

const updateLinhaStmt = sqlite.prepare(`
  UPDATE linhas_orcamento
     SET preco_cliente_unit_cents = ?,
         custo_interno_unit_cents = ?,
         total_cliente_cents = ?,
         total_custo_interno_cents = ?,
         notas = COALESCE(notas, '') || ?
   WHERE id = ?
`);

const orcStmt = sqlite.prepare<[string], Orcamento>(
  `SELECT id, iva_percentagem_bps FROM orcamentos WHERE id = ?`,
);

const linhasOfOrcStmt = sqlite.prepare<
  [string],
  {
    quantidade: number;
    preco_cliente_unit_cents: number;
    custo_interno_unit_cents: number | null;
  }
>(
  `SELECT quantidade, preco_cliente_unit_cents, custo_interno_unit_cents
     FROM linhas_orcamento WHERE orcamento_id = ?`,
);

const updateOrcStmt = sqlite.prepare(`
  UPDATE orcamentos
     SET subtotal_cents = ?,
         iva_total_cents = ?,
         total_cents = ?,
         custo_interno_total_cents = ?,
         margem_teorica_bps = ?
   WHERE id = ?
`);

const tx = sqlite.transaction(() => {
  for (const u of updates) {
    updateLinhaStmt.run(
      u.precoNewCents,
      u.custoNewCents,
      u.totalNewCents,
      u.totalCustoNewCents,
      "\n" + u.notaExtra,
      u.linhaId,
    );
  }

  for (const orcId of orcamentosTouched) {
    const orc = orcStmt.get(orcId);
    if (!orc) continue;
    const linhasAtuais = linhasOfOrcStmt.all(orcId);

    let subtotal = 0;
    let custoInterno = 0;
    for (const l of linhasAtuais) {
      subtotal += Math.round(l.quantidade * l.preco_cliente_unit_cents);
      if (l.custo_interno_unit_cents != null) {
        custoInterno += Math.round(
          l.quantidade * l.custo_interno_unit_cents,
        );
      }
    }
    const ivaTotal = Math.round((subtotal * orc.iva_percentagem_bps) / 10000);
    const total = subtotal + ivaTotal;
    const margemBps =
      subtotal > 0
        ? Math.round(((subtotal - custoInterno) / subtotal) * 10000)
        : 0;

    updateOrcStmt.run(subtotal, ivaTotal, total, custoInterno, margemBps, orcId);
  }
});

tx();
console.log(`[fix] APLICADO: ${updates.length} linhas + ${orcamentosTouched.size} orçamentos recomputados.`);
sqlite.close();
