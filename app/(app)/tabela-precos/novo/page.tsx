import Link from "next/link";

import { createTabelaPrecoAction } from "../actions";
import { TabelaPrecoForm } from "../_components/tabela-preco-form";

export default function NovoTabelaPrecoPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Link
          href="/tabela-precos"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Voltar à tabela
        </Link>
        <h1 className="text-2xl font-medium tracking-tight">
          Novo item de tabela
        </h1>
      </header>

      <div className="max-w-3xl">
        <TabelaPrecoForm
          action={createTabelaPrecoAction}
          submitLabel="Criar item"
        />
      </div>
    </div>
  );
}
