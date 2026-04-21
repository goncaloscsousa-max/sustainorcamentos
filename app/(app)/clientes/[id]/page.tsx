import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { clientes } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/format";

import { updateClienteAction } from "../actions";
import { ClienteForm } from "../_components/cliente-form";
import { DeleteClienteButton } from "./_components/delete-cliente-button";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function EditarClientePage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;

  const cliente = await db.query.clientes.findFirst({
    where: eq(clientes.id, id),
  });

  if (!cliente) notFound();

  const boundAction = updateClienteAction.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Link
          href="/clientes"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Voltar a clientes
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-medium tracking-tight">
              {cliente.nome}
            </h1>
            <p className="text-xs text-muted-foreground">
              Criado em {formatDateTime(cliente.createdAt)} · última alteração{" "}
              {formatDateTime(cliente.updatedAt)}
            </p>
          </div>
          <DeleteClienteButton id={cliente.id} nome={cliente.nome} />
        </div>
      </header>

      <div className="max-w-2xl">
        <ClienteForm
          action={boundAction}
          cliente={cliente}
          submitLabel="Guardar alterações"
        />
      </div>
    </div>
  );
}
