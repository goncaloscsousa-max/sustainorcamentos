import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";
import fs from "node:fs";

const DB_PATH =
  process.env.DATABASE_PATH ??
  path.join(process.cwd(), "data", "sustain.db");

const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const db = drizzle(sqlite);

console.log(`[migrate] DB: ${DB_PATH}`);
migrate(db, { migrationsFolder: "./lib/db/migrations" });
console.log("[migrate] OK");

sqlite.close();
