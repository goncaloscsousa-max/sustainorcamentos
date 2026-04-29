import Database from "better-sqlite3";
import path from "node:path";

const DB_PATH =
  process.env.DATABASE_PATH ??
  path.join(process.cwd(), "data", "sustain.db");

const db = new Database(DB_PATH);

const res = db
  .prepare(
    `UPDATE linhas_orcamento
     SET notas = TRIM(
       REPLACE(
         REPLACE(
           REPLACE(notas, ' · confiança alta', ''),
           ' · confiança media', ''
         ),
         ' · confiança baixa', ''
       )
     )
     WHERE notas LIKE '% · confiança %'`,
  )
  .run();

console.log(`[fix-notas-confianca] ${res.changes} linhas atualizadas.`);
db.close();
