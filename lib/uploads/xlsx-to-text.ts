import ExcelJS from "exceljs";

/**
 * Extrai texto de um ficheiro XLSX — usado para alimentar a IA com o MTQ
 * do cliente (mapa de trabalhos e quantidades) quando vem em Excel.
 *
 * Formato: uma linha por célula com coordenada. Mantém-se simples para não
 * inventar estrutura — a IA lê o texto bruto + contexto.
 */
export async function xlsxToText(buffer: Buffer, maxChars = 15000): Promise<string> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(new Uint8Array(buffer).buffer as ArrayBuffer);

  const lines: string[] = [];

  wb.eachSheet((ws) => {
    lines.push(`# Folha: ${ws.name}`);
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const rowValues: string[] = [];
      row.eachCell({ includeEmpty: false }, (cell) => {
        const v = cell.value;
        if (v == null) return;
        let s: string;
        if (typeof v === "object" && v !== null) {
          if ("richText" in v && Array.isArray(v.richText)) {
            s = v.richText.map((r) => r.text).join("");
          } else if ("text" in v) {
            s = String(v.text);
          } else if ("result" in v) {
            s = String(v.result ?? "");
          } else if (v instanceof Date) {
            s = v.toISOString().slice(0, 10);
          } else {
            s = JSON.stringify(v);
          }
        } else {
          s = String(v);
        }
        rowValues.push(s.trim());
      });
      if (rowValues.length > 0) {
        lines.push(`L${rowNumber}: ${rowValues.join(" | ")}`);
      }
    });
    lines.push("");
  });

  const joined = lines.join("\n");
  if (joined.length <= maxChars) return joined;
  return joined.slice(0, maxChars) + "\n… [truncado]";
}
