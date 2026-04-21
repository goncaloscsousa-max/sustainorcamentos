import Link from "next/link";

import { CsvImporter } from "./_components/csv-importer";

export default function ImportarCsvPage() {
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
          Importar CSV
        </h1>
        <p className="text-sm text-muted-foreground">
          Pré-visualização local. Nenhuma linha é gravada sem a tua confirmação.
          Itens com o mesmo código são <strong>atualizados</strong>.
        </p>
      </header>

      <div className="max-w-5xl">
        <CsvImporter />
      </div>
    </div>
  );
}
