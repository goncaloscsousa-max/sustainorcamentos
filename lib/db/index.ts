import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "node:path";
import fs from "node:fs";

const DB_PATH =
  process.env.DATABASE_PATH ??
  path.join(process.cwd(), "data", "sustain.db");

const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
// Espera até 5 s antes de lançar SQLITE_BUSY se a DB estiver bloqueada por
// outro writer (ex.: backup online, migration concorrente).
sqlite.pragma("busy_timeout = 5000");

export const db = drizzle(sqlite, { schema });
export { schema };
