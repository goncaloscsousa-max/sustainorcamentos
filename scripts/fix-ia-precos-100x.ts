/**
 * Divide por 100 preços IA que vieram obviamente inflacionados (> 500 €/unid).
 * Aplica também aos totais_cliente/custo_interno das linhas e recalcula os
 * totais do orçamento.
 */
import Database from "better-sqlite3";
import path from "node:path";

const DB_PATH =
  process.env.DATABASE_PATH ??
  path.join(process.cwd(), "data", "sustain.db");

const db = new Database(DB_PATH);
db.pragma("foreign_keys = ON");

type Linha = {
  id: string;
  orcamento_id: string;
  quantidade: number;
  preco_cliente_unit_cents: number;
  custo_interno_unit_cents: number | null;
  origem: string;
};

const rows = db
  .prepare<[], Linha>(
    `SELECT id, orcamento_id, quantidade, preco_cliente_unit_cents,
            custo_interno_unit_cents, origem
     FROM linhas_orcamento
     WHERE origem = 'ia_sugestao'
       AND preco_cliente_unit_cents > 50000`,
  )
  .all();

console.log(`[fix-ia-precos] ${rows.length} linhas IA com preço > 500 €.`);

const upd = db.prepare(`
  UPDATE linhas_orcamento
  SET preco_cliente_unit_cents = ?,
      custo_interno_unit_cents = ?,
      total_cliente_cents = ?,
      total_custo_interno_cents = ?
  WHERE id = ?
`);

const touchedOrcamentos = new Set<string>();

const tx = db.transaction((rows: Linha[]) => {
  for (const r of rows) {
    const newPreco = Math.round(r.preco_cliente_unit_cents / 100);
    const newCusto =
      r.custo_interno_unit_cents == null
        ? null
        : Math.round(r.custo_interno_unit_cents / 100);
    const newTotal = Math.round(r.quantidade * newPreco);
    const newTotalCusto =
      newCusto == null ? 0 : Math.round(r.quantidade * newCusto);
    upd.run(newPreco, newCusto, newTotal, newTotalCusto, r.id);
    touchedOrcamentos.add(r.orcamento_id);
  }
});
tx(rows);

console.log(`[fix-ia-precos] orçamentos afetados: ${touchedOrcamentos.size}`);

const selOrc = db.prepare<[string], { iva_percentagem_bps: number }>(
  `SELECT iva_percentagem_bps FROM orcamentos WHERE id = ?`,
);
const selLin = db.prepare<[string], {
  q: number;
  p: number;
  c: number | null;
}>(
  `SELECT quantidade AS q, preco_cliente_unit_cents AS p,
          custo_interno_unit_cents AS c
   FROM linhas_orcamento WHERE orcamento_id = ?`,
);
const updOrc = db.prepare(
  `UPDATE orcamentos
   SET subtotal_cents = ?, iva_total_cents = ?, total_cents = ?,
       custo_interno_total_cents = ?, margem_teorica_bps = ?
   WHERE id = ?`,
);

const tx2 = db.transaction((ids: string[]) => {
  for (const id of ids) {
    const orc = selOrc.get(id);
    if (!orc) continue;
    const linhas = selLin.all(id);
    let subtotal = 0;
    let custoInterno = 0;
    for (const l of linhas) {
      subtotal += Math.round(l.q * l.p);
      if (l.c != null) custoInterno += Math.round(l.q * l.c);
    }
    const iva = Math.round((subtotal * orc.iva_percentagem_bps) / 10000);
    const total = subtotal + iva;
    const margemBps =
      subtotal > 0
        ? Math.round(((subtotal - custoInterno) / subtotal) * 10000)
        : 0;
    updOrc.run(subtotal, iva, total, custoInterno, margemBps, id);
    console.log(
      `  ${id.slice(0, 8)}: subtotal ${subtotal}c  iva ${iva}c  total ${total}c  margem ${margemBps}bps`,
    );
  }
});
tx2([...touchedOrcamentos]);

console.log("[fix-ia-precos] OK");
db.close();
