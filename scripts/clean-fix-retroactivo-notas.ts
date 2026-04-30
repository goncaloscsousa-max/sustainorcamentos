/**
 * Remove qualquer linha "[FIX RETROACTIVO] ..." das `notas` das linhas de
 * orçamento — essas notas eram internas mas estavam a aparecer no editor
 * (e logo na exportação PDF/XLSX), visíveis ao cliente.
 *
 * Uso:
 *   tsx scripts/clean-fix-retroactivo-notas.ts            # DRY RUN
 *   tsx scripts/clean-fix-retroactivo-notas.ts --apply    # aplica
 */

import Database from "better-sqlite3";
import path from "node:path";

const DB_PATH =
  process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "sustain.db");
const APPLY = process.argv.includes("--apply");

type Row = { id: string; notas: string | null };

const sqlite = new Database(DB_PATH, { readonly: !APPLY });

const rows = sqlite
  .prepare<[], Row>(
    `SELECT id, notas FROM linhas_orcamento
      WHERE notas IS NOT NULL AND notas LIKE '%[FIX RETROACTIVO]%'`,
  )
  .all();

console.log(`[clean] modo: ${APPLY ? "APPLY" : "DRY RUN"} — DB: ${DB_PATH}`);
console.log(`[clean] linhas com [FIX RETROACTIVO] nas notas: ${rows.length}`);

function strip(notas: string): string {
  // Remove qualquer linha que CONTENHA "[FIX RETROACTIVO]" (ignora prefixos
  // e sufixos). Depois colapsa newlines em excesso e faz trim.
  return notas
    .split(/\r?\n/)
    .filter((line) => !line.includes("[FIX RETROACTIVO]"))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const updates = rows.map((r) => {
  const cleaned = strip(r.notas ?? "");
  return {
    id: r.id,
    before: r.notas ?? "",
    after: cleaned.length === 0 ? null : cleaned,
  };
});

console.log("\n--- preview (primeiras 5) ---");
for (const u of updates.slice(0, 5)) {
  console.log(`\n[${u.id.slice(0, 8)}]`);
  console.log("  ANTES :", JSON.stringify(u.before));
  console.log("  DEPOIS:", JSON.stringify(u.after));
}

if (!APPLY) {
  console.log(
    "\n[clean] DRY RUN — nada gravado. Para aplicar:\n  tsx scripts/clean-fix-retroactivo-notas.ts --apply",
  );
  sqlite.close();
  process.exit(0);
}

const stmt = sqlite.prepare(`UPDATE linhas_orcamento SET notas = ? WHERE id = ?`);
const tx = sqlite.transaction(() => {
  for (const u of updates) stmt.run(u.after, u.id);
});
tx();

console.log(`[clean] APLICADO: ${updates.length} linhas limpas.`);
sqlite.close();
