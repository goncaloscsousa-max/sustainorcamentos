import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";

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
import { clientes, ficheirosObra, obras, orcamentos } from "@/lib/db/schema";
import {
  formatCents,
  formatDateTime,
  formatIsoDate,
  labelForEstadoObra,
  labelForTipoObra,
} from "@/lib/format";

import { createOrcamentoAction } from "./orcamento/actions";
import { FICHEIRO_TIPO_LABELS } from "./ficheiros/tipos";
import { UploadForm } from "./ficheiros/_components/upload-form";
import { DeleteFicheiroButton } from "./ficheiros/_components/file-row";

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

  const cliente = await db.query.clientes.findFirst({
    where: eq(clientes.id, obra.clienteId),
  });

  const orcamentosList = await db
    .select()
    .from(orcamentos)
    .where(eq(orcamentos.obraId, obra.id))
    .orderBy(desc(orcamentos.versao));

  const ficheiros = await db
    .select()
    .from(ficheirosObra)
    .where(eq(ficheirosObra.obraId, obra.id))
    .orderBy(asc(ficheirosObra.tipo), asc(ficheirosObra.uploadedAt));

  const createOrcBound = createOrcamentoAction.bind(null, obra.id);

  function formatBytes(b: number | null | undefined): string {
    if (b == null) return "—";
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1024 / 1024).toFixed(1)} MB`;
  }

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
          <Button asChild variant="secondary">
            <Link href={`/obras/${obra.id}/editar`}>Editar obra</Link>
          </Button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
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

      {obra.notas ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Notas</CardTitle>
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
