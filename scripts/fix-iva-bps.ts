import Database from "better-sqlite3";
import path from "node:path";

const DB_PATH =
  process.env.DATABASE_PATH ??
  path.join(process.cwd(), "data", "sustain.db");

const db = new Database(DB_PATH);
db.pragma("foreign_keys = ON");

type Row = {
  id: string;
  versao: number;
  iva_percentagem_bps: number;
  subtotal_cents: number;
  iva_total_cents: number;
  total_cents: number;
};

const rows = db
  .prepare<[], Row>(
    `SELECT id, versao, iva_percentagem_bps, subtotal_cents, iva_total_cents, total_cents
     FROM orcamentos
     WHERE iva_percentagem_bps > 10000`,
  )
  .all();

console.log(`[fix-iva-bps] Encontrados ${rows.length} orçamentos com IVA bps > 10000.`);

const upd = db.prepare(`
  UPDATE orcamentos
  SET iva_percentagem_bps = ?,
      iva_total_cents = ?,
      total_cents = ?
  WHERE id = ?
`);

const tx = db.transaction((rows: Row[]) => {
  for (const r of rows) {
    const newBps = Math.round(r.iva_percentagem_bps / 100);
    const newIvaCents = Math.round((r.subtotal_cents * newBps) / 10000);
    const newTotal = r.subtotal_cents + newIvaCents;
    upd.run(newBps, newIvaCents, newTotal, r.id);
    console.log(
      `  ${r.id.slice(0, 8)} v${r.versao}: bps ${r.iva_percentagem_bps} → ${newBps}, iva ${r.iva_total_cents} → ${newIvaCents}, total ${r.total_cents} → ${newTotal}`,
    );
  }
});

tx(rows);

console.log(`[fix-iva-bps] OK — ${rows.length} orçamentos corrigidos.`);
db.close();
