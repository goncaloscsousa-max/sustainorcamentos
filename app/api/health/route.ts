import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Healthcheck público (SEM autenticação) para systemd, Caddy e monitorização
 * externa. Devolve apenas estado de vida da aplicação + DB. Nada sensível.
 *
 * - 200 OK quando a app está a responder e a DB aceita uma query trivial.
 * - 503 quando a DB está em baixo / inacessível.
 *
 * Nunca devolve detalhe do erro ao cliente; o stack vai apenas para os logs.
 */
export async function GET() {
  try {
    const row = db.get(sql`SELECT 1 as ok`) as { ok?: number } | undefined;
    if (!row || row.ok !== 1) {
      throw new Error("unexpected health probe result");
    }
    return NextResponse.json(
      { ok: true, ts: new Date().toISOString() },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (err) {
    console.error("[health]", err);
    return NextResponse.json(
      { ok: false },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
