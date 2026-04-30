import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/lib/db";
import {
  clientes,
  ficheirosObra,
  linhasOrcamento,
  obras,
  orcamentos,
  riscosIdentificados,
} from "@/lib/db/schema";
import {
  formatCents,
  formatDateTime,
  formatIsoDate,
  labelForEstadoObra,
  labelForTipoObra,
} from "@/lib/format";
import {
  REGIONAL_PRICE_FACTOR_BPS,
  labelForDistrito,
  type Distrito,
} from "@/lib/data/portugal-locations";
import {
  ANO_CONSTRUCAO_OPCOES,
  DIVISAO_LABELS,
  ELEVADOR_OPCOES,
  ESTADO_INSTALACAO_OPCOES,
  HABITADO_DURANTE_OBRA_OPCOES,
  NIVEL_ACABAMENTOS_OPCOES,
  PISO_OPCOES,
  PRIORIDADE_OPCOES,
  TIPOLOGIA_IMOVEL_OPCOES,
  tryParseBriefing,
} from "@/lib/data/briefing-obra";

import { createOrcamentoAction } from "./orcamento/actions";
import { FICHEIRO_TIPO_LABELS } from "./ficheiros/tipos";
import { UploadForm } from "./ficheiros/_components/upload-form";
import { DeleteFicheiroButton } from "./ficheiros/_components/file-row";
import { FasesFlowchart } from "./_components/fases-flowchart";
import { SugestoesMateriais } from "./_components/sugestoes-materiais";
import { sugestaoMateriaisResultSchema } from "@/lib/ai/sugestao-materiais";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

const estadoOrcamentoVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  rascunho: "secondary",
  enviado: "default",
  aprovado: "default",
  rejeitado: "destructive",
  substituido: "outline",
};

const estadoOrcamentoLabel: Record<string, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
  substituido: "Substituído",
};

export default async function ObraDashboardPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;

  const obra = await db.query.obras.findFirst({ where: eq(obras.id, id) });
  if (!obra) notFound();

  const [cliente, orcamentosList, ficheiros] = await Promise.all([
    db.query.clientes.findFirst({ where: eq(clientes.id, obra.clienteId) }),
    db
      .select()
      .from(orcamentos)
      .where(eq(orcamentos.obraId, obra.id))
      .orderBy(desc(orcamentos.versao)),
    db
      .select()
      .from(ficheirosObra)
      .where(eq(ficheirosObra.obraId, obra.id))
      .orderBy(asc(ficheirosObra.tipo), asc(ficheirosObra.uploadedAt)),
  ]);

  const orcamentoMaisRecente = orcamentosList[0] ?? null;
  const orcamentoIds = orcamentosList.map((o) => o.id);

  // Linhas do orçamento mais recente (para o fluxograma) + agregação de
  // riscos abertos em todos os orçamentos da obra (para o badge no topo).
  const [linhasMaisRecente, riscosAbertosRows] = await Promise.all([
    orcamentoMaisRecente
      ? db
          .select()
          .from(linhasOrcamento)
          .where(eq(linhasOrcamento.orcamentoId, orcamentoMaisRecente.id))
          .orderBy(asc(linhasOrcamento.ordem))
      : Promise.resolve([]),
    orcamentoIds.length > 0
      ? db
          .select({
            orcamentoId: riscosIdentificados.orcamentoId,
            severidade: riscosIdentificados.severidade,
            n: sql<number>`count(*)`,
          })
          .from(riscosIdentificados)
          .where(
            and(
              inArray(riscosIdentificados.orcamentoId, orcamentoIds),
              eq(riscosIdentificados.resolvido, false),
            ),
          )
          .groupBy(
            riscosIdentificados.orcamentoId,
            riscosIdentificados.severidade,
          )
      : Promise.resolve([] as { orcamentoId: string; severidade: string; n: number }[]),
  ]);

  const riscosAlta = riscosAbertosRows
    .filter((r) => r.severidade === "alta")
    .reduce((a, r) => a + Number(r.n), 0);
  const riscosMedia = riscosAbertosRows
    .filter((r) => r.severidade === "media")
    .reduce((a, r) => a + Number(r.n), 0);
  const riscosBaixa = riscosAbertosRows
    .filter((r) => r.severidade === "baixa")
    .reduce((a, r) => a + Number(r.n), 0);
  const riscosTotal = riscosAlta + riscosMedia + riscosBaixa;
  const orcamentoComMaisRiscos =
    riscosTotal > 0
      ? riscosAbertosRows
          .reduce<Record<string, number>>((acc, r) => {
            acc[r.orcamentoId] = (acc[r.orcamentoId] ?? 0) + Number(r.n);
            return acc;
          }, {})
      : null;
  const orcamentoIdParaRiscos = orcamentoComMaisRiscos
    ? Object.entries(orcamentoComMaisRiscos).sort(
        (a, b) => b[1] - a[1],
      )[0]?.[0] ?? null
    : null;

  // Sugestões de materiais persistidas
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

  const briefingPreenchido = !!obra.briefing;
  const temLinhasOrcamento = linhasMaisRecente.length > 0;
  const podeGerarSugestoes = briefingPreenchido && temLinhasOrcamento;
  const motivoBloqueioSugestoes = !briefingPreenchido
    ? "Preenche primeiro o briefing da obra (Editar obra → 7 secções)."
    : !temLinhasOrcamento
      ? "O orçamento ainda não tem linhas. Corre primeiro \"Analisar com IA\" no orçamento (ou adiciona linhas manualmente) — as sugestões de materiais usam as categorias e quantidades do orçamento como referência."
      : null;

  // Staleness: se o orçamento foi alterado depois de as sugestões terem
  // sido geradas, marca-as como potencialmente desatualizadas.
  const sugestoesDesatualizadas =
    obra.sugestoesMateriaisAtualizadasEm != null &&
    orcamentoMaisRecente != null &&
    orcamentoMaisRecente.updatedAt > obra.sugestoesMateriaisAtualizadasEm;

  const createOrcBound = createOrcamentoAction.bind(null, obra.id);

  function formatBytes(b: number | null | undefined): string {
    if (b == null) return "—";
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1024 / 1024).toFixed(1)} MB`;
  }

  const factorBps = obra.distrito
    ? REGIONAL_PRICE_FACTOR_BPS[obra.distrito as Distrito]
    : null;
  const factorPct = factorBps != null ? (factorBps - 10000) / 100 : null;

  const briefing = tryParseBriefing(obra.briefing);
  const labelOf = (
    opts: readonly { value: string; label: string }[],
    v: string,
  ) => opts.find((o) => o.value === v)?.label ?? v;

  const prazoDesejadoSemanas = briefing?.prazoDesejadoSemanas ?? null;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <Link
          href="/obras"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Voltar a obras
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-muted-foreground">
                {obra.referencia}
              </span>
              <Badge variant="secondary">
                {labelForEstadoObra(obra.estado)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {labelForTipoObra(obra.tipo)}
              </span>
            </div>
            <h1 className="text-2xl font-medium tracking-tight">
              {obra.titulo}
            </h1>
            <p className="text-sm text-muted-foreground">
              {obra.moradaObra}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {riscosTotal > 0 && orcamentoIdParaRiscos ? (
              <Button
                asChild
                variant="outline"
                className="border-amber-300/60 text-amber-700 hover:bg-amber-50 dark:border-amber-700/50 dark:text-amber-400 dark:hover:bg-amber-950/30"
              >
                <Link
                  href={`/obras/${obra.id}/orcamento/${orcamentoIdParaRiscos}`}
                >
                  {riscosTotal} risco{riscosTotal === 1 ? "" : "s"} aberto
                  {riscosTotal === 1 ? "" : "s"}
                  {riscosAlta > 0 ? ` · ${riscosAlta} alta${riscosAlta === 1 ? "" : "s"}` : ""}
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="secondary">
              <Link href={`/obras/${obra.id}/editar`}>Editar obra</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Localização</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            {obra.distrito ? (
              <>
                <span className="font-medium">
                  {obra.cidade ? `${obra.cidade}, ` : ""}
                  {labelForDistrito(obra.distrito)}
                </span>
                {factorPct != null ? (
                  <span className="text-xs text-muted-foreground">
                    Ajuste regional de preços:{" "}
                    <span
                      className={
                        factorPct > 0
                          ? "font-mono text-primary"
                          : factorPct < 0
                            ? "font-mono text-emerald-600"
                            : "font-mono"
                      }
                    >
                      {factorPct > 0 ? "+" : ""}
                      {factorPct.toFixed(1)} %
                    </span>
                  </span>
                ) : null}
              </>
            ) : (
              <span className="text-muted-foreground">
                Sem região definida.{" "}
                <Link
                  href={`/obras/${obra.id}/editar`}
                  className="underline hover:text-primary"
                >
                  Adicionar
                </Link>
              </span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Cliente</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            {cliente ? (
              <>
                <Link
                  href={`/clientes/${cliente.id}`}
                  className="font-medium hover:underline"
                >
                  {cliente.nome}
                </Link>
                {cliente.nif ? (
                  <span className="text-muted-foreground">
                    NIF: {cliente.nif}
                  </span>
                ) : null}
                {cliente.email ? (
                  <span className="text-muted-foreground">{cliente.email}</span>
                ) : null}
                {cliente.telefone ? (
                  <span className="text-muted-foreground">
                    {cliente.telefone}
                  </span>
                ) : null}
              </>
            ) : (
              <span className="text-muted-foreground">
                Cliente não encontrado.
              </span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Datas</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Visita
              </span>
              <span>{formatIsoDate(obra.dataVisita)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Início previsto
              </span>
              <span>{formatIsoDate(obra.dataInicioPrevista)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Conclusão prevista
              </span>
              <span>{formatIsoDate(obra.dataConclusaoPrevista)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Criada
              </span>
              <span>{formatDateTime(obra.createdAt)}</span>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">
            Briefing da obra
          </CardTitle>
          <CardDescription>
            Toda a informação estruturada que vai como contexto à IA.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {briefing ? (
            <div className="grid gap-6 md:grid-cols-2">
              <BriefingBlock title="Âmbito e dimensões">
                <BriefingItem
                  label="Divisões"
                  value={briefing.divisoes
                    .map((d) => {
                      if (d === "outro") {
                        const desc = briefing.divisoesOutroDescricao?.trim();
                        return desc ? `Outro (${desc})` : DIVISAO_LABELS[d];
                      }
                      return DIVISAO_LABELS[d];
                    })
                    .join(", ")}
                />
                <BriefingItem
                  label="Área total"
                  value={`${briefing.areaTotalM2} m²`}
                />
                {briefing.peDireitoM != null ? (
                  <BriefingItem
                    label="Pé-direito"
                    value={`${briefing.peDireitoM} m`}
                  />
                ) : null}
              </BriefingBlock>

              <BriefingBlock title="Imóvel">
                <BriefingItem
                  label="Tipologia"
                  value={labelOf(
                    TIPOLOGIA_IMOVEL_OPCOES,
                    briefing.tipologiaImovel,
                  )}
                />
                <BriefingItem
                  label="Ano construção"
                  value={labelOf(ANO_CONSTRUCAO_OPCOES, briefing.anoConstrucao)}
                />
                <BriefingItem
                  label="Piso"
                  value={labelOf(PISO_OPCOES, briefing.piso)}
                />
                <BriefingItem
                  label="Elevador"
                  value={labelOf(ELEVADOR_OPCOES, briefing.elevador)}
                />
                <BriefingItem
                  label="Habitado durante obra"
                  value={labelOf(
                    HABITADO_DURANTE_OBRA_OPCOES,
                    briefing.habitado,
                  )}
                />
                {briefing.ultimaIntervencao ? (
                  <BriefingItem
                    label="Última intervenção"
                    value={briefing.ultimaIntervencao}
                  />
                ) : null}
              </BriefingBlock>

              <BriefingBlock title="Instalações">
                <BriefingItem
                  label="Elétrica"
                  value={labelOf(
                    ESTADO_INSTALACAO_OPCOES,
                    briefing.estadoEletrica,
                  )}
                />
                <BriefingItem
                  label="Canalização"
                  value={labelOf(
                    ESTADO_INSTALACAO_OPCOES,
                    briefing.estadoCanalizacao,
                  )}
                />
                <BriefingItem
                  label="Saneamento"
                  value={labelOf(
                    ESTADO_INSTALACAO_OPCOES,
                    briefing.estadoSaneamento,
                  )}
                />
                <BriefingItem
                  label="Gás"
                  value={labelOf(ESTADO_INSTALACAO_OPCOES, briefing.estadoGas)}
                />
                <BriefingItem
                  label="AVAC"
                  value={labelOf(ESTADO_INSTALACAO_OPCOES, briefing.estadoAvac)}
                />
              </BriefingBlock>

              <BriefingBlock title="Acabamentos & comerciais">
                <BriefingItem
                  label="Nível"
                  value={labelOf(
                    NIVEL_ACABAMENTOS_OPCOES,
                    briefing.nivelAcabamentos,
                  )}
                />
                {briefing.referenciasMateriais ? (
                  <BriefingItem
                    label="Referências"
                    value={briefing.referenciasMateriais}
                  />
                ) : null}
                {briefing.marcasPreferidas ? (
                  <BriefingItem
                    label="Marcas"
                    value={briefing.marcasPreferidas}
                  />
                ) : null}
                <BriefingItem
                  label="Prioridade"
                  value={labelOf(PRIORIDADE_OPCOES, briefing.prioridade)}
                />
                {briefing.orcamentoAlvoMinEur != null ||
                briefing.orcamentoAlvoMaxEur != null ? (
                  <BriefingItem
                    label="Orçamento alvo"
                    value={`${briefing.orcamentoAlvoMinEur ?? "?"} – ${briefing.orcamentoAlvoMaxEur ?? "?"} €`}
                  />
                ) : null}
                {briefing.prazoDesejadoSemanas != null ? (
                  <BriefingItem
                    label="Prazo desejado"
                    value={`${briefing.prazoDesejadoSemanas} semanas`}
                  />
                ) : null}
                {briefing.outrosOrcamentos ? (
                  <BriefingItem
                    label="Concorrência"
                    value={briefing.outrosOrcamentos}
                  />
                ) : null}
              </BriefingBlock>

              {(briefing.acesso || briefing.restricoesHorario) && (
                <BriefingBlock title="Logística" wide>
                  {briefing.acesso ? (
                    <BriefingItem label="Acesso" value={briefing.acesso} />
                  ) : null}
                  {briefing.restricoesHorario ? (
                    <BriefingItem
                      label="Restrições"
                      value={briefing.restricoesHorario}
                    />
                  ) : null}
                </BriefingBlock>
              )}

              {briefing.problemasConhecidos ? (
                <BriefingBlock title="Problemas conhecidos" wide>
                  <p className="whitespace-pre-wrap text-sm">
                    {briefing.problemasConhecidos}
                  </p>
                </BriefingBlock>
              ) : null}

              <BriefingBlock title="Pedido do cliente (palavras dele)" wide>
                <p className="whitespace-pre-wrap text-sm">
                  {briefing.trabalhoEspecifico}
                </p>
              </BriefingBlock>

              {briefing.notasAdicionais ? (
                <BriefingBlock title="Notas adicionais" wide>
                  <p className="whitespace-pre-wrap text-sm">
                    {briefing.notasAdicionais}
                  </p>
                </BriefingBlock>
              ) : null}
            </div>
          ) : obra.descricao ? (
            <div className="flex flex-col gap-3">
              <p className="rounded-md border border-amber-300/60 bg-amber-50/40 px-3 py-2 text-xs text-amber-800 dark:border-amber-700/40 dark:bg-amber-950/20 dark:text-amber-300">
                Esta obra foi criada antes do briefing estruturado. Edita-a para
                ativar a análise IA com qualidade.
              </p>
              <p className="whitespace-pre-wrap text-sm text-foreground">
                {obra.descricao}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Ainda sem briefing.{" "}
              <Link
                href={`/obras/${obra.id}/editar`}
                className="underline hover:text-primary"
              >
                Edita a obra
              </Link>{" "}
              e responde ao briefing — a IA precisa dele para dar um orçamento
              detalhado.
            </p>
          )}
        </CardContent>
      </Card>

      <FasesFlowchart
        linhasOrcamentoMaisRecente={linhasMaisRecente}
        estadoObra={obra.estado}
        prazoDesejadoSemanas={prazoDesejadoSemanas}
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

      {obra.notas ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Notas internas
            </CardTitle>
            <CardDescription className="whitespace-pre-wrap pt-2">
              {obra.notas}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <section className="flex flex-col gap-3">
        <div className="flex flex-col">
          <h2 className="text-lg font-medium">Ficheiros</h2>
          <p className="text-xs text-muted-foreground">
            Fotos do estado atual, MTQ, projetos de especialidades. Usados como
            input da análise IA.
          </p>
        </div>

        <UploadForm obraId={obra.id} />

        {ficheiros.length === 0 ? (
          <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
            Ainda não há ficheiros carregados.
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Tamanho</TableHead>
                  <TableHead className="text-muted-foreground">Upload</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {ficheiros.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {FICHEIRO_TIPO_LABELS[
                        f.tipo as keyof typeof FICHEIRO_TIPO_LABELS
                      ] ?? f.tipo}
                    </TableCell>
                    <TableCell>
                      <a
                        href={`/api/ficheiros/${f.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {f.nomeOriginal}
                      </a>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">
                      {formatBytes(f.tamanhoBytes)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(f.uploadedAt)}
                    </TableCell>
                    <TableCell>
                      <DeleteFicheiroButton
                        obraId={obra.id}
                        ficheiroId={f.id}
                        nomeOriginal={f.nomeOriginal}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h2 className="text-lg font-medium">Orçamentos</h2>
            <p className="text-xs text-muted-foreground">
              Cada alteração grande cria uma nova versão. Versões anteriores
              ficam acessíveis.
            </p>
          </div>
          <form action={createOrcBound}>
            <Button type="submit">
              {orcamentosList.length === 0
                ? "Criar primeiro orçamento"
                : "Nova versão"}
            </Button>
          </form>
        </div>

        {orcamentosList.length === 0 ? (
          <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
            Ainda não há orçamentos para esta obra.
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Versão</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Emissão</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">Total c/ IVA</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orcamentosList.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">
                      <Link
                        href={`/obras/${obra.id}/orcamento/${o.id}`}
                        className="hover:underline"
                      >
                        v{o.versao}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={estadoOrcamentoVariant[o.estado] ?? "secondary"}
                      >
                        {estadoOrcamentoLabel[o.estado] ?? o.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatIsoDate(o.dataEmissao)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatCents(o.subtotalCents)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums font-medium">
                      {formatCents(o.totalCents)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                      {(o.margemTeoricaBps / 100).toFixed(1)} %
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}

function BriefingBlock({
  title,
  wide,
  children,
}: {
  title: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-2 ${wide ? "md:col-span-2" : ""}`}>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="flex flex-col gap-1.5 rounded-md border bg-background/60 p-3 text-sm">
        {children}
      </div>
    </div>
  );
}

function BriefingItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground sm:w-32 shrink-0">
        {label}
      </span>
      <span className="text-sm leading-snug">{value}</span>
    </div>
  );
}
