/**
 * Backup atómico da SQLite usando a API `.backup()` do better-sqlite3
 * (que mapeia para o online backup API do SQLite — checkpoint WAL incluído,
 * sem partir leitores/escritores activos).
 *
 * IMPORTANTE: este script NÃO importa `lib/db` deliberadamente — abrir a DB
 * via `lib/db` activaria WAL writers paralelos e isso é exactamente o que
 * queremos evitar durante backup. Aqui abrimos a DB em modo readonly,
 * fazemos `.backup()` para um ficheiro novo, e fechamos.
 *
 * Caminhos via env (com defaults para dev local):
 *   DATABASE_PATH   — ficheiro fonte (default: ./data/sustain.db)
 *   BACKUP_DIR      — destino dos snapshots (default: ./data/backups)
 *
 * Uso:
 *   npm run db:backup
 *
 * Output:
 *   {BACKUP_DIR}/sustain-YYYYMMDD-HHMMSS.db
 */

import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const DB_PATH =
  process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "sustain.db");

const BACKUP_DIR =
  process.env.BACKUP_DIR ?? path.join(process.cwd(), "data", "backups");

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    "-" +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

async function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`[backup] DB fonte não existe: ${DB_PATH}`);
    process.exit(1);
  }

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const target = path.join(BACKUP_DIR, `sustain-${timestamp()}.db`);

  // readonly: NÃO escreve no DB fonte, NÃO activa WAL paralelo.
  // fileMustExist: garante que falhamos cedo se a fonte desapareceu.
  const src = new Database(DB_PATH, { readonly: true, fileMustExist: true });

  try {
    console.log(`[backup] ${DB_PATH} -> ${target}`);
    await src.backup(target);

    const stats = fs.statSync(target);
    const sizeMb = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`[backup] OK (${sizeMb} MB)`);
  } catch (err) {
    console.error("[backup] FALHOU:", err);
    // Limpa ficheiro parcial se ficou para trás.
    if (fs.existsSync(target)) {
      try {
        fs.unlinkSync(target);
      } catch {
        /* ignore */
      }
    }
    process.exit(1);
  } finally {
    src.close();
  }
}

main();
