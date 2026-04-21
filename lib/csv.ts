/**
 * Parser CSV mínimo (RFC 4180 básico). Suporta:
 *  - Separador `,` ou `;` (auto-detetado pela linha de cabeçalho).
 *  - Campos entre aspas duplas, com `""` para escapar aspas.
 *  - Linhas vazias ignoradas.
 *
 * Não suporta newlines dentro de campos entre aspas (limitação aceite para o MVP).
 */

export function parseCsv(raw: string): string[][] {
  const trimmed = raw.replace(/^\uFEFF/, ""); // BOM
  const lines = trimmed.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return [];

  const delimiter = detectDelimiter(lines[0]);
  return lines.map((line) => parseLine(line, delimiter));
}

function detectDelimiter(headerLine: string): string {
  const semis = (headerLine.match(/;/g) ?? []).length;
  const commas = (headerLine.match(/,/g) ?? []).length;
  return semis > commas ? ";" : ",";
}

function parseLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}
