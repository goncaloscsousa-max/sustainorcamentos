import Link from "next/link";

import { db } from "@/lib/db";
import { clientes } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";

import { createObraAction } from "../actions";
import { ObraForm } from "../_components/obra-form";

export const dynamic = "force-dynamic";

export default async function NovaObraPage() {
  const clientesList = await db
    .select({ id: clientes.id, nome: clientes.nome })
    .from(clientes)
    .orderBy(clientes.nome);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Link
          href="/obras"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Voltar a obras
        </Link>
        <h1 className="text-2xl font-medium tracking-tight">Nova obra</h1>
      </header>

      {clientesList.length === 0 ? (
        <div className="max-w-2xl rounded-md border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Para criar uma obra é preciso ter pelo menos um cliente registado.
          </p>
          <Button asChild className="mt-4" variant="secondary">
            <Link href="/clientes/novo">Registar cliente</Link>
          </Button>
        </div>
      ) : (
        <div className="max-w-3xl">
          <ObraForm
            action={createObraAction}
            clientes={clientesList}
            submitLabel="Criar obra"
          />
        </div>
      )}
    </div>
  );
}
