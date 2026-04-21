import Link from "next/link";

import { createClienteAction } from "../actions";
import { ClienteForm } from "../_components/cliente-form";

export default function NovoClientePage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Link
          href="/clientes"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Voltar a clientes
        </Link>
        <h1 className="text-2xl font-medium tracking-tight">Novo cliente</h1>
      </header>

      <div className="max-w-2xl">
        <ClienteForm action={createClienteAction} submitLabel="Criar cliente" />
      </div>
    </div>
  );
}
