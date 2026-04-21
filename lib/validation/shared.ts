import { z } from "zod";

/** Converte string vazia ou whitespace em `null`. */
export function emptyToNull(v: unknown): unknown {
  if (typeof v !== "string") return v;
  const trimmed = v.trim();
  return trimmed === "" ? null : trimmed;
}

/** `null | string` opcional (FormData strings vazias → null). */
export const optionalText = z.preprocess(emptyToNull, z.string().nullable());

/** Número inteiro não negativo (para quantidades inteiras). */
export const nonNegativeInt = z.coerce
  .number({ error: "Valor numérico inválido" })
  .int("Tem de ser inteiro")
  .nonnegative("Tem de ser ≥ 0");

/** Número positivo decimal (quantidades com decimais). */
export const positiveDecimal = z.coerce
  .number({ error: "Valor numérico inválido" })
  .positive("Tem de ser > 0");

/** Converte uma string PT-style ("1.234,56" ou "1234.56") em número (euros, não cêntimos). */
export function parseEuroString(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  if (typeof raw !== "string") return Number(raw);
  const cleaned = raw.replace(/\s|€/g, "").trim();
  if (!cleaned) return null;

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");
  let normalized: string;
  if (hasComma && hasDot) {
    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");
    normalized =
      lastComma > lastDot
        ? cleaned.replace(/\./g, "").replace(",", ".")
        : cleaned.replace(/,/g, "");
  } else if (hasComma) {
    normalized = cleaned.replace(",", ".");
  } else {
    normalized = cleaned;
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/** Aceita string PT (1.234,56 ou 1234.56) e devolve INTEGER cêntimos. */
export const moneyCents = z
  .preprocess((v) => {
    const n = parseEuroString(v);
    return n == null ? undefined : Math.round(n * 100);
  }, z.number({ error: "Valor em euros inválido" }).int().nonnegative("Tem de ser ≥ 0"));

/** Opcional (null se vazio). */
export const moneyCentsOptional = z.preprocess(
  (v) => {
    if (v === "" || v == null) return null;
    const n = parseEuroString(v);
    return n == null ? undefined : Math.round(n * 100);
  },
  z.number().int().nonnegative("Tem de ser ≥ 0").nullable(),
);

/** Aceita string "23,00" ou "23" e devolve basis points (2300). */
export const percentageBps = z.preprocess(
  (v) => {
    if (v === "" || v == null) return undefined;
    const n = parseEuroString(v);
    return n == null ? undefined : Math.round(n * 100);
  },
  z
    .number({ error: "Percentagem inválida" })
    .int()
    .min(0, "Tem de ser ≥ 0"),
);
