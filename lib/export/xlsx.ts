import ExcelJS from "exceljs";

import type { OrcamentoExportData } from "./load-orcamento";

/**
 * Gera um Excel editável do orçamento.
 *
 * Layout:
 *  - Cabeçalho com dados da empresa + bloco de identificação do orçamento
 *  - Tabela agrupada por categoria (cabeçalho por categoria em negrito, fundo suave)
 *  - Totais à direita em baixo, com TOTAL destacado
 *  - Condições gerais em bloco separado
 *
 * Notas:
 *  - Valores monetários são escritos em EUROS (float), com formato `pt-PT` EUR.
 *  - Folha é editável — o utilizador interno pode ajustar quantidades/preços.
 *  - Não usamos fórmulas de soma automática (fonte da verdade é a app);
 *    o Excel é um snapshot, não um motor.
 */

const CENTS_TO_EUR = (c: number | null | undefined) => (c == null ? null : c / 100);

const COLORS = {
  accentHex: "FF2C3E50",
  whiteHex: "FFFFFFFF",
  categoryBgHex: "FFF5F5F5",
  lineHex: "FFE0E0E0",
};

const MONEY_FMT = '#,##0.00 "€"';
const QTY_FMT = "#,##0.###";

export async function generateOrcamentoXLSX(
  data: OrcamentoExportData,
): Promise<Buffer> {
  const { orcamento, obra, cliente, linhasPorCategoria, empresa } = data;

  const wb = new ExcelJS.Workbook();
  wb.creator = empresa.nome;
  wb.created = new Date();

  const ws = wb.addWorksheet("Orçamento", {
    pageSetup: {
      paperSize: 9, // A4
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.5,
        right: 0.5,
        top: 0.6,
        bottom: 0.6,
        header: 0.3,
        footer: 0.3,
      },
    },
  });

  ws.columns = [
    { key: "num", width: 6 },
    { key: "desc", width: 48 },
    { key: "un", width: 8 },
    { key: "qtd", width: 10 },
    { key: "preco", width: 14 },
    { key: "total", width: 14 },
  ];

  let row = 1;

  // ------------------------------------------------------------------
  // Cabeçalho empresa
  // ------------------------------------------------------------------
  ws.mergeCells(row, 1, row, 6);
  const brandCell = ws.getCell(row, 1);
  brandCell.value = empresa.nome;
  brandCell.font = { name: "Calibri", size: 18, bold: true, color: { argb: COLORS.accentHex } };
  brandCell.alignment = { vertical: "middle" };
  ws.getRow(row).height = 28;
  row += 1;

  ws.mergeCells(row, 1, row, 6);
  ws.getCell(row, 1).value = empresa.slogan;
  ws.getCell(row, 1).font = { italic: true, color: { argb: "FF6B7280" }, size: 10 };
  row += 1;

  ws.mergeCells(row, 1, row, 6);
  ws.getCell(row, 1).value = `${empresa.email}  |  ${empresa.telefone}  |  ${empresa.website}`;
  ws.getCell(row, 1).font = { color: { argb: "FF6B7280" }, size: 10 };
  row += 2; // linha em branco

  // ------------------------------------------------------------------
  // ORÇAMENTO title + bloco identificação
  // ------------------------------------------------------------------
  ws.mergeCells(row, 1, row, 6);
  ws.getCell(row, 1).value = "ORÇAMENTO";
  ws.getCell(row, 1).font = { bold: true, size: 14, color: { argb: COLORS.accentHex } };
  row += 2;

  const idPairs: [string, string][] = [
    ["Cliente", cliente.nome],
    ["Ref.", `${obra.referencia} · v${orcamento.versao}`],
    ["Obra", obra.titulo],
    ["Data", orcamento.dataEmissao],
    ["Morada obra", obra.moradaObra],
    ["Validade", `${orcamento.validadeDias} dias`],
  ];
  if (cliente.nif) idPairs.push(["NIF cliente", cliente.nif]);

  for (let i = 0; i < idPairs.length; i += 2) {
    const [l1, v1] = idPairs[i];
    const pair2 = idPairs[i + 1];
    ws.getCell(row, 1).value = `${l1}:`;
    ws.getCell(row, 1).font = { bold: true, color: { argb: "FF6B7280" }, size: 10 };
    ws.mergeCells(row, 2, row, 3);
    ws.getCell(row, 2).value = v1;
    if (pair2) {
      const [l2, v2] = pair2;
      ws.getCell(row, 4).value = `${l2}:`;
      ws.getCell(row, 4).font = { bold: true, color: { argb: "FF6B7280" }, size: 10 };
      ws.mergeCells(row, 5, row, 6);
      ws.getCell(row, 5).value = v2;
    }
    row += 1;
  }
  row += 1;

  // ------------------------------------------------------------------
  // Cabeçalho da tabela
  // ------------------------------------------------------------------
  const headerRow = ws.getRow(row);
  headerRow.values = [
    "#",
    "Descrição do Serviço",
    "Un.",
    "Qtd.",
    "Preço Unit. (€)",
    "Total (€)",
  ];
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: COLORS.whiteHex }, size: 10 };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLORS.accentHex },
    };
    cell.border = {
      top: { style: "thin", color: { argb: COLORS.lineHex } },
      bottom: { style: "thin", color: { argb: COLORS.lineHex } },
      left: { style: "thin", color: { argb: COLORS.lineHex } },
      right: { style: "thin", color: { argb: COLORS.lineHex } },
    };
  });
  headerRow.height = 22;
  row += 1;

  // ------------------------------------------------------------------
  // Linhas agrupadas por categoria
  // ------------------------------------------------------------------
  let lineNumber = 0;
  linhasPorCategoria.forEach((grupo, gi) => {
    // Linha de categoria (merged)
    ws.mergeCells(row, 1, row, 6);
    const catCell = ws.getCell(row, 1);
    catCell.value = `${gi + 1}. ${grupo.categoria.toUpperCase()}`;
    catCell.font = { bold: true, color: { argb: COLORS.accentHex }, size: 10 };
    catCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLORS.categoryBgHex },
    };
    catCell.alignment = { vertical: "middle" };
    ws.getRow(row).height = 20;
    row += 1;

    for (const linha of grupo.linhas) {
      lineNumber += 1;
      const r = ws.getRow(row);
      r.values = [
        lineNumber,
        linha.notas ? `${linha.descricao}\n${linha.notas}` : linha.descricao,
        linha.unidade,
        linha.quantidade,
        CENTS_TO_EUR(linha.precoClienteUnitCents),
        CENTS_TO_EUR(linha.totalClienteCents),
      ];
      r.getCell(1).alignment = { horizontal: "center", vertical: "top" };
      r.getCell(2).alignment = { wrapText: true, vertical: "top" };
      r.getCell(3).alignment = { horizontal: "center", vertical: "top" };
      r.getCell(4).alignment = { horizontal: "right", vertical: "top" };
      r.getCell(4).numFmt = QTY_FMT;
      r.getCell(5).alignment = { horizontal: "right", vertical: "top" };
      r.getCell(5).numFmt = MONEY_FMT;
      r.getCell(6).alignment = { horizontal: "right", vertical: "top" };
      r.getCell(6).numFmt = MONEY_FMT;
      r.getCell(6).font = { bold: true };
      r.eachCell((cell) => {
        cell.border = {
          bottom: { style: "hair", color: { argb: COLORS.lineHex } },
        };
      });
      row += 1;
    }
  });

  row += 1;

  // ------------------------------------------------------------------
  // Totais (coluna à direita)
  // ------------------------------------------------------------------
  const writeTotalRow = (
    label: string,
    valueEur: number | null,
    highlight = false,
  ) => {
    ws.mergeCells(row, 4, row, 5);
    const labelCell = ws.getCell(row, 4);
    labelCell.value = label;
    const valueCell = ws.getCell(row, 6);
    valueCell.value = valueEur;
    valueCell.numFmt = MONEY_FMT;

    if (highlight) {
      labelCell.font = { bold: true, size: 12, color: { argb: COLORS.whiteHex } };
      labelCell.alignment = { horizontal: "right", vertical: "middle" };
      valueCell.font = { bold: true, size: 12, color: { argb: COLORS.whiteHex } };
      valueCell.alignment = { horizontal: "right", vertical: "middle" };
      const fill: ExcelJS.FillPattern = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: COLORS.accentHex },
      };
      labelCell.fill = fill;
      valueCell.fill = fill;
      ws.getRow(row).height = 24;
    } else {
      labelCell.font = { bold: true };
      labelCell.alignment = { horizontal: "right", vertical: "middle" };
      valueCell.font = { bold: true };
      valueCell.alignment = { horizontal: "right", vertical: "middle" };
      const border: ExcelJS.Border = {
        style: "thin",
        color: { argb: COLORS.lineHex },
      };
      labelCell.border = { top: border };
      valueCell.border = { top: border };
    }
    row += 1;
  };

  const ivaLabel = `IVA (${(orcamento.ivaPercentagemBps / 100).toLocaleString(
    "pt-PT",
    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  )}%)`;

  writeTotalRow("SUBTOTAL (s/ IVA)", CENTS_TO_EUR(orcamento.subtotalCents));
  writeTotalRow(ivaLabel, CENTS_TO_EUR(orcamento.ivaTotalCents));
  writeTotalRow("TOTAL (c/ IVA)", CENTS_TO_EUR(orcamento.totalCents), true);

  row += 2;

  // ------------------------------------------------------------------
  // Condições Gerais
  // ------------------------------------------------------------------
  ws.mergeCells(row, 1, row, 6);
  ws.getCell(row, 1).value = "CONDIÇÕES GERAIS";
  ws.getCell(row, 1).font = { bold: true, color: { argb: COLORS.accentHex }, size: 11 };
  row += 1;

  const condicoes = [
    "Orçamento válido por 30 dias a partir da data de emissão.",
    "Pagamento: 40% no início dos trabalhos, 40% a meio da obra, 20% na conclusão.",
    "Prazo estimado de execução: a definir após adjudicação.",
    "Materiais incluídos conforme especificado. Alterações sujeitas a revisão de preço.",
    "Garantia de 5 anos sobre mão de obra (conforme legislação em vigor).",
    "Valores sujeitos a confirmação após visita técnica ao local.",
  ];
  for (const c of condicoes) {
    ws.mergeCells(row, 1, row, 6);
    ws.getCell(row, 1).value = `•  ${c}`;
    ws.getCell(row, 1).alignment = { wrapText: true, vertical: "top" };
    ws.getCell(row, 1).font = { size: 10 };
    row += 1;
  }

  if (orcamento.observacoes) {
    row += 1;
    ws.mergeCells(row, 1, row, 6);
    ws.getCell(row, 1).value = "OBSERVAÇÕES";
    ws.getCell(row, 1).font = { bold: true, color: { argb: COLORS.accentHex }, size: 11 };
    row += 1;
    ws.mergeCells(row, 1, row, 6);
    ws.getCell(row, 1).value = orcamento.observacoes;
    ws.getCell(row, 1).alignment = { wrapText: true, vertical: "top" };
    ws.getCell(row, 1).font = { size: 10 };
    row += 1;
  }

  row += 2;

  // ------------------------------------------------------------------
  // Rodapé
  // ------------------------------------------------------------------
  ws.mergeCells(row, 1, row, 6);
  ws.getCell(row, 1).value = `${empresa.nome}  |  ${empresa.email}  |  ${empresa.telefone}`;
  ws.getCell(row, 1).font = { size: 9, color: { argb: "FF6B7280" } };
  ws.getCell(row, 1).alignment = { horizontal: "center" };
  row += 1;

  ws.mergeCells(row, 1, row, 6);
  ws.getCell(row, 1).value = `${empresa.morada}, ${empresa.codigoPostal} ${empresa.localidade}  |  NIF: ${empresa.nif}`;
  ws.getCell(row, 1).font = { size: 9, color: { argb: "FF6B7280" } };
  ws.getCell(row, 1).alignment = { horizontal: "center" };

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
