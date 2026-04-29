import type { LinhaOrcamento } from "@/lib/db/schema";

/**
 * Fluxograma de execução de uma obra de remodelação.
 *
 * Modelo simples: derivamos as fases das `categorias` das linhas do
 * orçamento mais recente, ordenadas pela sequência canónica de execução
 * (não pela ordem em que aparecem no orçamento). Acrescentamos fases
 * envelope (Visita, Adjudicação, Vistoria, Entrega) que existem
 * independentemente do que está no orçamento.
 */

export type FaseEnvelope =
  | "visita"
  | "adjudicacao"
  | "vistoria_final"
  | "entrega";

export type FaseDerivada = {
  kind: "categoria";
  categoria: string;
  ordemCanonica: number;
  trabalhos: Array<{ descricao: string; totalClienteCents: number }>;
  totalClienteCents: number;
  totalCustoInternoCents: number;
  pesoBps: number; // peso da fase no subtotal do orçamento (basis points)
};

export type FaseEnvelopeItem = {
  kind: "envelope";
  envelope: FaseEnvelope;
  label: string;
};

export type Fase = FaseDerivada | FaseEnvelopeItem;

/**
 * Sequência canónica de execução de uma remodelação completa.
 * Posições mais baixas = primeiro no calendário de obra.
 */
export const SEQUENCIA_CANONICA: Record<string, number> = {
  "Demolições e Preparação": 1,
  "Instalações Elétricas": 2,
  "Canalização": 3,
  "Pichelaria / AVAC": 4,
  "Tetos Falsos e Isolamentos": 5,
  "Revestimentos": 6,
  "Carpintaria e Acabamentos": 7,
  "Trabalhos Exteriores / Impermeabilizações": 8,
};

const ENVELOPE_LABELS: Record<FaseEnvelope, string> = {
  visita: "Visita técnica",
  adjudicacao: "Adjudicação",
  vistoria_final: "Vistoria final",
  entrega: "Entrega ao cliente",
};

/**
 * Constrói a lista de fases para mostrar no fluxograma da obra.
 * - Se não houver orçamento, mostra só as 8 fases canónicas vazias para o
 *   utilizador ter uma noção do que aí vem.
 * - Se houver orçamento, mostra apenas as fases que têm linhas.
 * - Acrescenta fases envelope no início e fim conforme o estado da obra.
 */
export function buildFasesFromLinhas(
  linhas: LinhaOrcamento[],
  estadoObra: string,
): Fase[] {
  const fases: Fase[] = [];

  // Envelope inicial — sempre Visita técnica
  fases.push({ kind: "envelope", envelope: "visita", label: ENVELOPE_LABELS.visita });

  // Adjudicação só faz sentido após o "orcamentado"
  const adjudicada = ["adjudicado", "em_execucao", "concluido"].includes(estadoObra);
  if (adjudicada || estadoObra === "orcamentado") {
    fases.push({
      kind: "envelope",
      envelope: "adjudicacao",
      label: ENVELOPE_LABELS.adjudicacao,
    });
  }

  // Fases derivadas das categorias com linhas
  if (linhas.length === 0) {
    // Sem orçamento ainda — mostra as 8 fases canónicas vazias
    const ordenadas = Object.entries(SEQUENCIA_CANONICA).sort(
      ([, a], [, b]) => a - b,
    );
    for (const [categoria, ordemCanonica] of ordenadas) {
      fases.push({
        kind: "categoria",
        categoria,
        ordemCanonica,
        trabalhos: [],
        totalClienteCents: 0,
        totalCustoInternoCents: 0,
        pesoBps: 0,
      });
    }
  } else {
    // Agrupa linhas por categoria
    const subtotalGeralCents = linhas.reduce(
      (acc, l) => acc + l.totalClienteCents,
      0,
    );
    const porCategoria = new Map<string, LinhaOrcamento[]>();
    for (const l of linhas) {
      const arr = porCategoria.get(l.categoria) ?? [];
      arr.push(l);
      porCategoria.set(l.categoria, arr);
    }

    const derivadas: FaseDerivada[] = [];
    for (const [categoria, group] of porCategoria) {
      const totalClienteCents = group.reduce(
        (a, l) => a + l.totalClienteCents,
        0,
      );
      const totalCustoInternoCents = group.reduce(
        (a, l) => a + l.totalCustoInternoCents,
        0,
      );
      const trabalhosOrdenados = [...group]
        .sort((a, b) => b.totalClienteCents - a.totalClienteCents)
        .slice(0, 3)
        .map((l) => ({
          descricao: l.descricao,
          totalClienteCents: l.totalClienteCents,
        }));
      derivadas.push({
        kind: "categoria",
        categoria,
        ordemCanonica: SEQUENCIA_CANONICA[categoria] ?? 99,
        trabalhos: trabalhosOrdenados,
        totalClienteCents,
        totalCustoInternoCents,
        pesoBps:
          subtotalGeralCents > 0
            ? Math.round((totalClienteCents / subtotalGeralCents) * 10000)
            : 0,
      });
    }
    derivadas.sort((a, b) => a.ordemCanonica - b.ordemCanonica);
    fases.push(...derivadas);
  }

  // Envelope final
  fases.push({
    kind: "envelope",
    envelope: "vistoria_final",
    label: ENVELOPE_LABELS.vistoria_final,
  });
  fases.push({
    kind: "envelope",
    envelope: "entrega",
    label: ENVELOPE_LABELS.entrega,
  });

  return fases;
}

/**
 * Distribui um prazo total (em semanas) pelas fases derivadas, proporcional
 * ao peso de cada fase no orçamento. Envelopes recebem 0.5–1 semana cada.
 * Devolve um Map fase->semanas (numero arredondado a 0.5).
 */
export function estimarDuracoesSemanas(
  fases: Fase[],
  prazoTotalSemanas: number | null,
): Map<Fase, number | null> {
  const out = new Map<Fase, number | null>();
  if (prazoTotalSemanas == null || prazoTotalSemanas <= 0) {
    for (const f of fases) out.set(f, null);
    return out;
  }

  const envelopes = fases.filter((f) => f.kind === "envelope");
  const derivadas = fases.filter(
    (f): f is FaseDerivada => f.kind === "categoria",
  );

  // Cada envelope = 0.5 semanas. Sobra distribui-se pelas derivadas pelo peso.
  const reservadoEnvelopes = envelopes.length * 0.5;
  const restante = Math.max(prazoTotalSemanas - reservadoEnvelopes, 1);

  for (const e of envelopes) out.set(e, 0.5);

  const somaPesos = derivadas.reduce((a, d) => a + d.pesoBps, 0);
  if (somaPesos === 0) {
    // distribui igualmente
    const each = restante / Math.max(derivadas.length, 1);
    for (const d of derivadas) out.set(d, Math.round(each * 2) / 2);
  } else {
    for (const d of derivadas) {
      const semanas = (d.pesoBps / somaPesos) * restante;
      out.set(d, Math.max(Math.round(semanas * 2) / 2, 0.5));
    }
  }

  return out;
}
