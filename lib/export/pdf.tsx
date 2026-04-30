import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { Fragment } from "react";

import { formatCents, formatIsoDate, formatPercentageBps } from "@/lib/format";

import type { OrcamentoExportData } from "./load-orcamento";

/**
 * Cores (ver SPEC §9):
 *   texto     #1a1a1a
 *   acento    #2c3e50
 *   linhas    #e0e0e0
 *   categoria #f5f5f5
 *
 * Tipografia: Helvetica (built-in do @react-pdf). Se quisermos Inter no
 * futuro podemos usar Font.register com TTFs em /public.
 */

const COLORS = {
  text: "#1a1a1a",
  accent: "#2c3e50",
  line: "#e0e0e0",
  categoryBg: "#f5f5f5",
  muted: "#6b7280",
};

Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 72,
    paddingHorizontal: 40,
    fontSize: 9,
    color: COLORS.text,
    fontFamily: "Helvetica",
    lineHeight: 1.4,
  },

  header: {
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  brand: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: COLORS.accent,
    letterSpacing: 1,
  },
  slogan: {
    fontSize: 9,
    fontFamily: "Helvetica-Oblique",
    color: COLORS.muted,
    marginTop: 4,
  },
  contactLine: {
    fontSize: 9,
    color: COLORS.muted,
    marginTop: 6,
  },

  orcamentoTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: COLORS.accent,
    marginBottom: 10,
    letterSpacing: 1,
  },
  idBlock: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 0,
    marginBottom: 16,
  },
  idRow: {
    flexDirection: "row",
    width: "50%",
    marginBottom: 4,
  },
  idLabel: {
    width: 80,
    color: COLORS.muted,
    fontFamily: "Helvetica-Bold",
  },
  idValue: {
    flex: 1,
  },

  table: {
    marginTop: 6,
    marginBottom: 10,
  },
  theadRow: {
    flexDirection: "row",
    backgroundColor: COLORS.accent,
    color: "#ffffff",
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  th: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: "#ffffff",
  },
  categoryRow: {
    flexDirection: "row",
    backgroundColor: COLORS.categoryBg,
    paddingVertical: 5,
    paddingHorizontal: 4,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  categoryText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: COLORS.accent,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  tbodyRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.line,
  },
  col_num: { width: "5%", fontSize: 8, color: COLORS.muted },
  col_desc: { width: "52%", fontSize: 9 },
  col_un: { width: "8%", fontSize: 9, textAlign: "center" },
  col_qtd: { width: "9%", fontSize: 9, textAlign: "right" },
  col_preco: { width: "12%", fontSize: 9, textAlign: "right" },
  col_total: {
    width: "14%",
    fontSize: 9,
    textAlign: "right",
    fontFamily: "Helvetica-Bold",
  },

  totals: {
    marginTop: 14,
    alignSelf: "flex-end",
    width: "45%",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.line,
  },
  totalRowHighlight: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 6,
    marginTop: 4,
    backgroundColor: COLORS.accent,
    color: "#ffffff",
  },
  totalLabel: { fontFamily: "Helvetica-Bold", fontSize: 10 },
  totalValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    textAlign: "right",
  },
  totalLabelHighlight: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    color: "#ffffff",
  },
  totalValueHighlight: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    color: "#ffffff",
    textAlign: "right",
  },

  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: COLORS.accent,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  condicaoItem: {
    flexDirection: "row",
    marginBottom: 3,
    fontSize: 9,
  },
  bullet: {
    width: 10,
    fontFamily: "Helvetica-Bold",
  },
  observacao: {
    fontSize: 9,
    color: COLORS.text,
  },

  signaturesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 36,
    gap: 30,
  },
  signatureBox: {
    flex: 1,
    alignItems: "center",
  },
  signatureLine: {
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: COLORS.text,
    marginBottom: 4,
    paddingTop: 30,
  },
  signatureLabel: {
    fontSize: 8,
    color: COLORS.muted,
  },
  signatureDate: {
    marginTop: 18,
    fontSize: 9,
    textAlign: "center",
  },

  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    paddingTop: 8,
    fontSize: 7,
    color: COLORS.muted,
    textAlign: "center",
  },
  pageNumber: {
    position: "absolute",
    bottom: 10,
    right: 40,
    fontSize: 7,
    color: COLORS.muted,
  },
});

const CONDICOES_PADRAO = [
  "Orçamento válido por 30 dias a partir da data de emissão.",
  "Pagamento: 40% no início dos trabalhos, 40% a meio da obra, 20% na conclusão.",
  "Prazo estimado de execução: a definir após adjudicação.",
  "Materiais incluídos conforme especificado. Alterações sujeitas a revisão de preço.",
  "Garantia de 5 anos sobre mão de obra (conforme legislação em vigor).",
  "Valores sujeitos a confirmação após visita técnica ao local.",
];

function formatValidade(dataEmissao: string, dias: number): string {
  const base = new Date(dataEmissao);
  if (Number.isNaN(base.getTime())) return `${dias} dias`;
  const fim = new Date(base);
  fim.setDate(base.getDate() + dias);
  return `${dias} dias (até ${formatIsoDate(fim.toISOString().slice(0, 10))})`;
}

export function OrcamentoPDF({ data }: { data: OrcamentoExportData }) {
  const { orcamento, obra, cliente, linhasPorCategoria, empresa } = data;

  const ivaLabel = formatPercentageBps(orcamento.ivaPercentagemBps);

  // Numeração global (1, 2, 3, ...) calculada a partir de offsets acumulados,
  // sem mutação durante o render (regra react-hooks/immutability).
  const groupOffsets = linhasPorCategoria.map((_, i) =>
    linhasPorCategoria
      .slice(0, i)
      .reduce((sum, g) => sum + g.linhas.length, 0),
  );

  return (
    <Document
      title={`${obra.referencia} - v${orcamento.versao}`}
      author={empresa.nome}
      creator={empresa.nome}
    >
      <Page size="A4" style={styles.page}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          <Text style={styles.brand}>{empresa.nome}</Text>
          {empresa.slogan ? (
            <Text style={styles.slogan}>{empresa.slogan}</Text>
          ) : null}
          {[empresa.email, empresa.telefone, empresa.website].filter(Boolean).length > 0 ? (
            <Text style={styles.contactLine}>
              {[empresa.email, empresa.telefone, empresa.website]
                .filter(Boolean)
                .join("  |  ")}
            </Text>
          ) : null}
        </View>

        {/* Bloco identificação */}
        <Text style={styles.orcamentoTitle}>ORÇAMENTO</Text>
        <View style={styles.idBlock}>
          <View style={styles.idRow}>
            <Text style={styles.idLabel}>Cliente:</Text>
            <Text style={styles.idValue}>{cliente.nome}</Text>
          </View>
          <View style={styles.idRow}>
            <Text style={styles.idLabel}>Ref.:</Text>
            <Text style={styles.idValue}>
              {obra.referencia} · v{orcamento.versao}
            </Text>
          </View>
          <View style={styles.idRow}>
            <Text style={styles.idLabel}>Obra:</Text>
            <Text style={styles.idValue}>{obra.titulo}</Text>
          </View>
          <View style={styles.idRow}>
            <Text style={styles.idLabel}>Data:</Text>
            <Text style={styles.idValue}>
              {formatIsoDate(orcamento.dataEmissao)}
            </Text>
          </View>
          <View style={styles.idRow}>
            <Text style={styles.idLabel}>Morada obra:</Text>
            <Text style={styles.idValue}>{obra.moradaObra}</Text>
          </View>
          <View style={styles.idRow}>
            <Text style={styles.idLabel}>Validade:</Text>
            <Text style={styles.idValue}>
              {formatValidade(orcamento.dataEmissao, orcamento.validadeDias)}
            </Text>
          </View>
          {cliente.nif ? (
            <View style={styles.idRow}>
              <Text style={styles.idLabel}>NIF cliente:</Text>
              <Text style={styles.idValue}>{cliente.nif}</Text>
            </View>
          ) : null}
        </View>

        {/* Tabela */}
        <View style={styles.table}>
          <View style={styles.theadRow} fixed>
            <Text style={[styles.col_num, styles.th]}>#</Text>
            <Text style={[styles.col_desc, styles.th]}>Descrição</Text>
            <Text style={[styles.col_un, styles.th]}>Un.</Text>
            <Text style={[styles.col_qtd, styles.th]}>Qtd.</Text>
            <Text style={[styles.col_preco, styles.th]}>Preço unit.</Text>
            <Text style={[styles.col_total, styles.th]}>Total</Text>
          </View>

          {linhasPorCategoria.map((grupo, gi) => (
            <Fragment key={grupo.categoria}>
              <View style={styles.categoryRow} wrap={false}>
                <Text style={styles.categoryText}>
                  {gi + 1}. {grupo.categoria}
                </Text>
              </View>
              {grupo.linhas.map((linha, li) => (
                <View key={linha.id} style={styles.tbodyRow} wrap={false}>
                  <Text style={styles.col_num}>
                    {groupOffsets[gi] + li + 1}
                  </Text>
                  <View style={styles.col_desc}>
                    <Text>{linha.descricao}</Text>
                    {linha.notas ? (
                      <Text style={{ fontSize: 8, color: COLORS.muted }}>
                        {linha.notas}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.col_un}>{linha.unidade}</Text>
                  <Text style={styles.col_qtd}>
                    {linha.quantidade.toLocaleString("pt-PT", {
                      maximumFractionDigits: 3,
                    })}
                  </Text>
                  <Text style={styles.col_preco}>
                    {formatCents(linha.precoClienteUnitCents)}
                  </Text>
                  <Text style={styles.col_total}>
                    {formatCents(linha.totalClienteCents)}
                  </Text>
                </View>
              ))}
            </Fragment>
          ))}
        </View>

        {/* Totais */}
        <View style={styles.totals} wrap={false}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>SUBTOTAL (s/ IVA)</Text>
            <Text style={styles.totalValue}>
              {formatCents(orcamento.subtotalCents)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>IVA ({ivaLabel})</Text>
            <Text style={styles.totalValue}>
              {formatCents(orcamento.ivaTotalCents)}
            </Text>
          </View>
          <View style={styles.totalRowHighlight}>
            <Text style={styles.totalLabelHighlight}>TOTAL (c/ IVA)</Text>
            <Text style={styles.totalValueHighlight}>
              {formatCents(orcamento.totalCents)}
            </Text>
          </View>
        </View>

        {/* Condições Gerais */}
        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>Condições Gerais</Text>
          {CONDICOES_PADRAO.map((c) => (
            <View key={c} style={styles.condicaoItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={{ flex: 1 }}>{c}</Text>
            </View>
          ))}
          {orcamento.condicoesPagamento &&
          orcamento.condicoesPagamento !==
            "40% início / 40% meio de obra / 20% conclusão" ? (
            <View style={styles.condicaoItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={{ flex: 1 }}>
                Condições específicas: {orcamento.condicoesPagamento}
              </Text>
            </View>
          ) : null}
        </View>

        {orcamento.observacoes ? (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Observações</Text>
            <Text style={styles.observacao}>{orcamento.observacoes}</Text>
          </View>
        ) : null}

        {/* Assinaturas */}
        <View style={styles.signaturesRow} wrap={false}>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Pela {empresa.nome}</Text>
          </View>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>O Cliente</Text>
          </View>
        </View>
        <Text style={styles.signatureDate}>Data: ___/___/______</Text>

        {/* Rodapé */}
        <View style={styles.footer} fixed>
          <Text>
            {[empresa.nome, empresa.email, empresa.telefone]
              .filter(Boolean)
              .join("  |  ")}
          </Text>
          <Text>
            {[
              [empresa.morada, [empresa.codigoPostal, empresa.localidade].filter(Boolean).join(" ")]
                .filter(Boolean)
                .join(", "),
              empresa.nif ? `NIF: ${empresa.nif}` : "",
            ]
              .filter(Boolean)
              .join("  |  ")}
          </Text>
        </View>
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) =>
            `${pageNumber} / ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}
