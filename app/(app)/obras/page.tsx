import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/lib/db";
import { clientes, obras } from "@/lib/db/schema";
import {
  ESTADO_OBRA_OPTIONS,
  formatIsoDate,
  labelForEstadoObra,
  labelForTipoObra,
} from "@/lib/format";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ estado?: string; cliente?: string }>;

const estadoVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  orcamentado: "secondary",
  adjudicado: "default",
  em_execucao: "default",
  concluido: "outline",
  perdido: "destructive",
  cancelado: "destructive",
};

export default async function ObrasPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { estado, cliente } = await searchParams;

  const conditions = [];
  if (estado) conditions.push(eq(obras.estado, estado));
  if (cliente) conditions.push(eq(obras.clienteId, cliente));

  const rows = await db
    .select({
      id: obras.id,
      referencia: obras.referencia,
      titulo: obras.titulo,
      estado: obras.estado,
      tipo: obras.tipo,
      dataVisita: obras.dataVisita,
      clienteId: obras.clienteId,
      clienteNome: clientes.nome,
    })
    .from(obras)
    .leftJoin(clientes, eq(obras.clienteId, clientes.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(obras.createdAt));

  const clientesList = await db
    .select({ id: clientes.id, nome: clientes.nome })
    .from(clientes)
    .orderBy(clientes.nome);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-medium tracking-tight">Obras</h1>
          <p className="text-sm text-muted-foreground">
            Obras registadas e respetivo estado de orçamentação.
          </p>
        </div>
        <Button asChild>
          <Link href="/obras/nova">Nova obra</Link>
        </Button>
      </header>

      <form
        className="flex flex-wrap items-end gap-3 rounded-md border p-4"
        action="/obras"
      >
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="estado"
            className="text-xs uppercase tracking-wider text-muted-foreground"
          >
            Estado
          </label>
          <select
            id="estado"
            name="estado"
            defaultValue={estado ?? ""}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="">Todos</option>
            {ESTADO_OBRA_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="cliente"
            className="text-xs uppercase tracking-wider text-muted-foreground"
          >
            Cliente
          </label>
          <select
            id="cliente"
            name="cliente"
            defaultValue={cliente ?? ""}
            className="h-9 min-w-48 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="">Todos</option>
            {clientesList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>

        <Button type="submit" variant="secondary" size="sm">
          Filtrar
        </Button>
        {estado || cliente ? (
          <Button asChild variant="ghost" size="sm">
            <Link href="/obras">Limpar</Link>
          </Button>
        ) : null}
      </form>

      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Sem obras {estado || cliente ? "para estes filtros" : "registadas"}.
          </p>
          {!estado && !cliente ? (
            <Button asChild className="mt-4" variant="secondary">
              <Link href="/obras/nova">Registar a primeira obra</Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referência</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Visita</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">
                    <Link
                      href={`/obras/${o.id}`}
                      className="hover:underline"
                    >
                      {o.referencia}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium">{o.titulo}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {o.clienteNome ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {labelForTipoObra(o.tipo)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={estadoVariant[o.estado] ?? "secondary"}>
                      {labelForEstadoObra(o.estado)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatIsoDate(o.dataVisita)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
