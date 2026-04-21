import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { tabelaPrecos } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/format";

import { updateTabelaPrecoAction } from "../actions";
import { TabelaPrecoForm } from "../_components/tabela-preco-form";
import { DeleteTabelaPrecoButton } from "./_components/delete-tabela-preco-button";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function EditarTabelaPrecoPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;

  const item = await db.query.tabelaPrecos.findFirst({
    where: eq(tabelaPrecos.id, id),
  });
  if (!item) notFound();

  const boundAction = updateTabelaPrecoAction.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Link
          href="/tabela-precos"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Voltar à tabela
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs text-muted-foreground">
              {item.codigo}
            </p>
            <h1 className="text-2xl font-medium tracking-tight">
              {item.descricao}
            </h1>
            <p className="text-xs text-muted-foreground">
              Criado em {formatDateTime(item.createdAt)} · última alteração{" "}
              {formatDateTime(item.updatedAt)}
            </p>
          </div>
          <DeleteTabelaPrecoButton id={item.id} codigo={item.codigo} />
        </div>
      </header>

      <div className="max-w-3xl">
        <TabelaPrecoForm
          action={boundAction}
          item={item}
          submitLabel="Guardar alterações"
        />
      </div>
    </div>
  );
}
