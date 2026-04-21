/**
 * Formatação e parsing em PT-PT.
 *
 * Convenções internas (ver docs/adr/0001):
 * - Dinheiro guardado em INTEGER cêntimos.
 * - Percentagens guardadas em INTEGER basis points (2300 = 23,00 %).
 * - Datas de calendário guardadas em TEXT ISO (YYYY-MM-DD).
 */

const eurFormatter = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat("pt-PT", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/* -------------------------------- dinheiro ------------------------------- */

export function formatCents(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return eurFormatter.format(cents / 100);
}

/** Aceita "1234,56", "1.234,56", "1234.56", "1,234.56". Devolve cêntimos ou null. */
export function parseCentsInput(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/\s|€/g, "").trim();
  if (!cleaned) return null;

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");

  let normalized: string;
  if (hasComma && hasDot) {
    // última ocorrência = separador decimal; a outra = milhares
    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");
    if (lastComma > lastDot) {
      normalized = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = cleaned.replace(/,/g, "");
    }
  } else if (hasComma) {
    normalized = cleaned.replace(",", ".");
  } else {
    normalized = cleaned;
  }

  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

/* ------------------------------ percentagens ----------------------------- */

export function formatPercentageBps(bps: number | null | undefined): string {
  if (bps == null) return "—";
  return `${percentFormatter.format(bps / 100)} %`;
}

export function parsePercentageInput(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/\s|%/g, "").replace(",", ".").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

/* ---------------------------------- datas -------------------------------- */

export function formatIsoDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return dateFormatter.format(d);
}

export function formatDateTime(
  value: Date | number | string | null | undefined,
): string {
  if (value == null) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return dateTimeFormatter.format(d);
}

export function toYYYYMMDD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/* --------------------------------- enums --------------------------------- */

export const TIPO_OBRA_OPTIONS = [
  { value: "remodelacao_total", label: "Remodelação total" },
  { value: "remodelacao_parcial", label: "Remodelação parcial" },
  { value: "cozinha", label: "Cozinha" },
  { value: "wc", label: "WC" },
  { value: "exterior", label: "Exterior" },
  { value: "comercial", label: "Comercial" },
  { value: "outro", label: "Outro" },
] as const;

export const ESTADO_OBRA_OPTIONS = [
  { value: "orcamentado", label: "Orçamentado" },
  { value: "adjudicado", label: "Adjudicado" },
  { value: "em_execucao", label: "Em execução" },
  { value: "concluido", label: "Concluído" },
  { value: "perdido", label: "Perdido" },
  { value: "cancelado", label: "Cancelado" },
] as const;

export const UNIDADE_OPTIONS = [
  { value: "m²", label: "m²" },
  { value: "m³", label: "m³" },
  { value: "ml", label: "ml" },
  { value: "un", label: "un" },
  { value: "h", label: "h" },
  { value: "vg", label: "vg" },
] as const;

export const CATEGORIA_OPTIONS = [
  "Demolições e Preparação",
  "Instalações Elétricas",
  "Canalização",
  "Revestimentos",
  "Carpintaria e Acabamentos",
  "Pichelaria / AVAC",
  "Tetos Falsos e Isolamentos",
  "Trabalhos Exteriores / Impermeabilizações",
] as const;

export function labelForTipoObra(value: string): string {
  return TIPO_OBRA_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function labelForEstadoObra(value: string): string {
  return ESTADO_OBRA_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
