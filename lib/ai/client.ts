import fs from "node:fs";
import path from "node:path";

import Anthropic from "@anthropic-ai/sdk";

/**
 * Cliente Anthropic partilhado.
 *
 * - A chave vive em `ANTHROPIC_API_KEY` (.env).
 * - Modelo default: Claude Sonnet 4.6 (mais recente em Abril 2026).
 *   Se precisares de experimentar outro, passa `model` explícito.
 */

// cache-busted ao hot-reload (v2)
let _client: Anthropic | null = null;

function readKeyFromDotenv(): string | null {
  try {
    const p = path.resolve(process.cwd(), ".env");
    const txt = fs.readFileSync(p, "utf8");
    for (const raw of txt.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      if (key !== "ANTHROPIC_API_KEY") continue;
      let val = line.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      return val || null;
    }
  } catch {
    // ignorado
  }
  return null;
}

function getClient(): Anthropic {
  if (_client) return _client;
  let apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    // No Windows, uma env var do sistema vazia sobrescreve o .env —
    // lemos o ficheiro diretamente como fallback.
    apiKey = readKeyFromDotenv() ?? undefined;
  }
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY não está definida no .env. Adiciona-a antes de usar funcionalidades de IA.",
    );
  }
  _client = new Anthropic({ apiKey });
  return _client;
}

export const DEFAULT_MODEL = "claude-sonnet-4-6";

export function anthropic(): Anthropic {
  return getClient();
}

/**
 * Preço estimado (€ cêntimos) por tokens. Valores de referência em Abril 2026
 * para Sonnet 4.6 — apenas para tracking interno, não para faturar.
 *
 *   input:  $3 por 1M tokens
 *   output: $15 por 1M tokens
 *   1 USD ≈ 0,92 EUR (aproximação estável)
 */
export function estimarCustoCents(
  inputTokens: number,
  outputTokens: number,
): number {
  const usdInput = (inputTokens / 1_000_000) * 3;
  const usdOutput = (outputTokens / 1_000_000) * 15;
  const eur = (usdInput + usdOutput) * 0.92;
  return Math.round(eur * 100);
}
