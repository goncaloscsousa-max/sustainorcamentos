import { ChevronRight, ClipboardList, FileSignature, Hammer, PackageCheck } from "lucide-react";

import { formatCents } from "@/lib/format";
import {
  buildFasesFromLinhas,
  estimarDuracoesSemanas,
  type Fase,
  type FaseEnvelope,
} from "@/lib/data/fases-execucao";
import type { LinhaOrcamento } from "@/lib/db/schema";

type Props = {
  linhasOrcamentoMaisRecente: LinhaOrcamento[];
  estadoObra: string;
  prazoDesejadoSemanas: number | null;
};

const ENVELOPE_ICONS: Record<FaseEnvelope, typeof Hammer> = {
  visita: ClipboardList,
  adjudicacao: FileSignature,
  vistoria_final: ClipboardList,
  entrega: PackageCheck,
};

export function FasesFlowchart({
  linhasOrcamentoMaisRecente,
  estadoObra,
  prazoDesejadoSemanas,
}: Props) {
  const fases = buildFasesFromLinhas(linhasOrcamentoMaisRecente, estadoObra);
  const duracoes = estimarDuracoesSemanas(fases, prazoDesejadoSemanas);
  const temOrcamento = linhasOrcamentoMaisRecente.length > 0;

  return (
    <section className="rounded-md border">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold">Fluxograma de execução</h2>
          <p className="text-sm text-muted-foreground">
            {temOrcamento
              ? "Sequência canónica das fases, derivada das categorias do orçamento mais recente."
              : "Modelo padrão Sustain. Cria um orçamento para ver fases reais com pesos e trabalhos chave."}
          </p>
        </div>
        {prazoDesejadoSemanas != null && temOrcamento ? (
          <div className="rounded-md bg-muted px-3 py-1 text-xs text-muted-foreground">
            Prazo estimado: <span className="font-mono">{prazoDesejadoSemanas} sem.</span>
          </div>
        ) : null}
      </header>

      <div className="overflow-x-auto">
        <ol className="flex min-w-max items-stretch gap-2 p-4">
          {fases.map((f, i) => (
            <li key={faseKey(f, i)} className="flex items-stretch">
              <FaseCard fase={f} semanas={duracoes.get(f) ?? null} />
              {i < fases.length - 1 ? (
                <ChevronRight
                  aria-hidden
                  className="mx-1 size-5 shrink-0 self-center text-muted-foreground/50"
                />
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function faseKey(fase: Fase, i: number): string {
  return fase.kind === "envelope" ? `e:${fase.envelope}:${i}` : `c:${fase.categoria}`;
}

function FaseCard({
  fase,
  semanas,
}: {
  fase: Fase;
  semanas: number | null;
}) {
  if (fase.kind === "envelope") {
    const Icon = ENVELOPE_ICONS[fase.envelope];
    return (
      <article className="flex w-44 flex-col gap-2 rounded-md border border-dashed bg-muted/30 px-3 py-3 text-sm">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Envelope
          </span>
        </div>
        <p className="text-sm font-medium leading-snug">{fase.label}</p>
        {semanas != null ? (
          <span className="font-mono text-xs text-muted-foreground">
            ≈ {formatSemanas(semanas)}
          </span>
        ) : null}
      </article>
    );
  }

  const tem = fase.trabalhos.length > 0;
  return (
    <article
      className={`flex w-60 flex-col gap-2 rounded-md border px-3 py-3 text-sm ${
        tem ? "bg-card" : "border-dashed bg-muted/20 opacity-70"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Fase {fase.ordemCanonica}
        </span>
        {fase.pesoBps > 0 ? (
          <span className="font-mono text-xs text-primary">
            {(fase.pesoBps / 100).toFixed(1)} %
          </span>
        ) : null}
      </div>
      <p className="text-sm font-semibold leading-snug">{fase.categoria}</p>
      {tem ? (
        <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
          {fase.trabalhos.map((t, i) => (
            <li key={i} className="line-clamp-1" title={t.descricao}>
              {t.descricao}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs italic text-muted-foreground">
          Sem trabalhos no orçamento.
        </p>
      )}
      <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-xs">
        {semanas != null ? (
          <span className="font-mono text-muted-foreground">
            ≈ {formatSemanas(semanas)}
          </span>
        ) : (
          <span />
        )}
        {fase.totalClienteCents > 0 ? (
          <span className="font-mono tabular-nums">
            {formatCents(fase.totalClienteCents)}
          </span>
        ) : null}
      </div>
    </article>
  );
}

function formatSemanas(s: number): string {
  if (s < 1) return `${(s * 7).toFixed(0)}d`;
  if (s === Math.floor(s)) return `${s} sem.`;
  return `${s.toFixed(1)} sem.`;
}
