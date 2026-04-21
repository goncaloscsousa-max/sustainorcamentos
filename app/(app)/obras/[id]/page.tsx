import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { clientes, obras } from "@/lib/db/schema";
import {
  formatDateTime,
  labelForEstadoObra,
} from "@/lib/format";

import { updateObraAction } from "../actions";
import { ObraForm } from "../_components/obra-form";
import { DeleteObraButton } from "./_components/delete-obra-button";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function EditarObraPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;

  const obra = await db.query.obras.findFirst({
    where: eq(obras.id, id),
  });
  if (!obra) notFound();

  const clientesList = await db
    .select({ id: clientes.id, nome: clientes.nome })
    .from(clientes)
    .orderBy(clientes.nome);

  const boundAction = updateObraAction.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
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
            </div>
            <h1 className="text-2xl font-medium tracking-tight">
              {obra.titulo}
            </h1>
            <p className="text-xs text-muted-foreground">
              Criada em {formatDateTime(obra.createdAt)} · última alteração{" "}
              {formatDateTime(obra.updatedAt)}
            </p>
          </div>
          <DeleteObraButton id={obra.id} referencia={obra.referencia} />
        </div>
      </header>

      <div className="max-w-3xl">
        <ObraForm
          action={boundAction}
          clientes={clientesList}
          obra={obra}
          includeEstado
          submitLabel="Guardar alterações"
        />
      </div>
    </div>
  );
}
