/**
 * Cria o utilizador admin inicial.
 *
 * Uso:
 *   ADMIN_EMAIL=info@sustain.pt ADMIN_PASSWORD='algo-seguro' ADMIN_NOME='Gonçalo Duarte' npm run db:seed
 *
 * Se não forem passadas variáveis, são usados os defaults do .env (carregados manualmente).
 * Se o utilizador já existir, é apenas informado e o script termina sem alterar nada.
 */

import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";

import { db } from "./index";
import { users } from "./schema";

// Carrega .env manualmente (sem dependência extra)
const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    const value = rawValue.replace(/^["']|["']$/g, "");
    process.env[key] = value;
  }
}

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "info@sustain.pt";
  const password = process.env.ADMIN_PASSWORD;
  const nome = process.env.ADMIN_NOME ?? "Gonçalo Duarte";

  if (!password) {
    console.error(
      "[seed] ERRO: define ADMIN_PASSWORD (variável de ambiente ou .env).",
    );
    process.exit(1);
  }

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    console.log(`[seed] Utilizador '${email}' já existe. Nada a fazer.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db.insert(users).values({
    nome,
    email,
    passwordHash,
    role: "admin",
  });

  console.log(`[seed] Utilizador '${email}' criado como 'admin'.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[seed] Falhou:", err);
    process.exit(1);
  });
