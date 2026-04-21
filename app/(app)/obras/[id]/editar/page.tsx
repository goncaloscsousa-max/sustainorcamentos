import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { clientes, obras } from "@/lib/db/schema";

import { updateObraAction } from "../../actions";
import { ObraForm } from "../../_components/obra-form";
import { DeleteObraButton } from "../_components/delete-obra-button";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function EditarObraPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;

  const obra = await db.query.obras.findFirst({ where: eq(obras.id, id) });
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
          href={`/obras/${obra.id}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Voltar à obra
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs text-muted-foreground">
              {obra.referencia}
            </p>
            <h1 className="text-2xl font-medium tracking-tight">
              Editar obra
            </h1>
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
