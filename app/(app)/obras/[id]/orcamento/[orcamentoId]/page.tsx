import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq, sql } from "drizzle-orm";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import {
  clientes,
  ficheirosObra,
  linhasOrcamento,
  obras,
  orcamentos,
  riscosIdentificados,
} from "@/lib/db/schema";
import { formatDateTime } from "@/lib/format";
import { tryParseBriefing } from "@/lib/data/briefing-obra";
import { sugestaoMateriaisResultSchema } from "@/lib/ai/sugestao-materiais";

import { OrcamentoEditor } from "./_components/orcamento-editor";
import { OrcamentoActions } from "./_components/orcamento-actions";
import { ExportButtons } from "./_components/export-buttons";
import { AnaliseIAButton } from "./_components/analise-ia-button";
import { RiscosPanel } from "./_components/riscos-panel";
import { FasesFlowchart } from "../../_components/fases-flowchart";
import { SugestoesMateriais } from "../../_components/sugestoes-materiais";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string; orcamentoId: string }>;

const estadoLabel: Record<string, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
  substituido: "Substituído",
};

export default async function OrcamentoEditorPage({
  params,
}: {
  params: Params;
}) {
  const { id: obraId, orcamentoId } = await params;

  const orcamento = await db.query.orcamentos.findFirst({
    where: eq(orcamentos.id, orcamentoId),
  });
  if (!orcamento || orcamento.obraId !== obraId) notFound();

  const obra = await db.query.obras.findFirst({ where: eq(obras.id, obraId) });
  if (!obra) notFound();

  const cliente = await db.query.clientes.findFirst({
    where: eq(clientes.id, obra.clienteId),
  });

  const linhas = await db
    .select()
    .from(linhasOrcamento)
    .where(eq(linhasOrcamento.orcamentoId, orcamentoId))
    .orderBy(asc(linhasOrcamento.ordem));

  const riscos = await db
    .select()
    .from(riscosIdentificados)
    .where(eq(riscosIdentificados.orcamentoId, orcamentoId))
    .orderBy(asc(riscosIdentificados.severidade));

  const [{ count: numFicheiros = 0 } = { count: 0 }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(ficheirosObra)
    .where(eq(ficheirosObra.obraId, obraId));

  // --- Fluxograma + Sugestões: tudo derivado do orçamento ACTUAL (não do
  // mais recente da obra). Faz mais sentido para o utilizador: estás aqui,
  // vês as fases e materiais deste orçamento.
  const briefing = tryParseBriefing(obra.briefing);
  const briefingPreenchido = !!obra.briefing;
  const temLinhas = linhas.length > 0;

  const sugestoesParsed = (() => {
    if (!obra.sugestoesMateriais) return null;
    try {
      return sugestaoMateriaisResultSchema.parse(
        JSON.parse(obra.sugestoesMateriais),
      );
    } catch {
      return null;
    }
  })();

  const podeGerarSugestoes = briefingPreenchido && temLinhas;
  const motivoBloqueioSugestoes = !briefingPreenchido
    ? "Preenche primeiro o briefing da obra (Voltar à obra → Editar)."
    : !temLinhas
      ? "Este orçamento ainda não tem linhas. Corre primeiro \"Analisar com IA\" — as sugestões usam as categorias e quantidades das linhas."
      : null;

  // Stale: sugestões geradas antes da última alteração deste orçamento.
  const sugestoesDesatualizadas =
    obra.sugestoesMateriaisAtualizadasEm != null &&
    orcamento.updatedAt > obra.sugestoesMateriaisAtualizadasEm;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Link
          href={`/obras/${obra.id}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Voltar à obra
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-muted-foreground">
                {obra.referencia}
              </span>
              <Badge variant="secondary">v{orcamento.versao}</Badge>
              <Badge variant="outline">
                {estadoLabel[orcamento.estado] ?? orcamento.estado}
              </Badge>
            </div>
            <h1 className="text-2xl font-medium tracking-tight">
              Orçamento — {obra.titulo}
            </h1>
            {cliente ? (
              <p className="text-sm text-muted-foreground">
                {cliente.nome} · {obra.moradaObra}
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Última alteração {formatDateTime(orcamento.updatedAt)}
            </p>
          </div>
          <div className="flex flex-wrap items-start justify-end gap-2">
            {numFicheiros > 0 ? (
              <AnaliseIAButton orcamentoId={orcamento.id} />
            ) : null}
            <ExportButtons orcamentoId={orcamento.id} />
            <Button asChild variant="ghost">
              <Link href={`/obras/${obra.id}`}>Fechar</Link>
            </Button>
            <OrcamentoActions orcamentoId={orcamento.id} />
          </div>
        </div>
      </header>

      <RiscosPanel riscos={riscos} />

      <FasesFlowchart
        linhasOrcamentoMaisRecente={linhas}
        estadoObra={obra.estado}
        prazoDesejadoSemanas={briefing?.prazoDesejadoSemanas ?? null}
      />

      <SugestoesMateriais
        obraId={obra.id}
        sugestoes={sugestoesParsed?.sugestoes ?? null}
        observacoes={sugestoesParsed?.observacoes ?? null}
        atualizadoEm={obra.sugestoesMateriaisAtualizadasEm ?? null}
        podeGerar={podeGerarSugestoes}
        motivoBloqueio={motivoBloqueioSugestoes}
        desatualizadas={sugestoesDesatualizadas}
      />

      <OrcamentoEditor
        key={`linhas-${linhas.length}`}
        orcamento={orcamento}
        linhas={linhas}
      />
    </div>
  );
}
