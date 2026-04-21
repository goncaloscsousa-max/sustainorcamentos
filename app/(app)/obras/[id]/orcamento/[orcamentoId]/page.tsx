import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import {
  clientes,
  linhasOrcamento,
  obras,
  orcamentos,
} from "@/lib/db/schema";
import { formatDateTime } from "@/lib/format";

import { OrcamentoEditor } from "./_components/orcamento-editor";
import { OrcamentoActions } from "./_components/orcamento-actions";
import { ExportButtons } from "./_components/export-buttons";

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
            <ExportButtons orcamentoId={orcamento.id} />
            <Button asChild variant="ghost">
              <Link href={`/obras/${obra.id}`}>Fechar</Link>
            </Button>
            <OrcamentoActions orcamentoId={orcamento.id} />
          </div>
        </div>
      </header>

      <OrcamentoEditor
        orcamento={orcamento}
        linhas={linhas}
      />
    </div>
  );
}
