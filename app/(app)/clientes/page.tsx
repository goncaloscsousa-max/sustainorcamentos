import Link from "next/link";
import { desc } from "drizzle-orm";

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
import { clientes } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const rows = await db
    .select()
    .from(clientes)
    .orderBy(desc(clientes.createdAt));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-medium tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            Base de clientes da Sustain Remodelações.
          </p>
        </div>
        <Button asChild>
          <Link href="/clientes/novo">Novo cliente</Link>
        </Button>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Ainda não há clientes registados.
          </p>
          <Button asChild className="mt-4" variant="secondary">
            <Link href="/clientes/novo">Registar o primeiro cliente</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>NIF</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefone</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id} className="cursor-pointer">
                  <TableCell className="font-medium">
                    <Link
                      href={`/clientes/${c.id}`}
                      className="hover:underline"
                    >
                      {c.nome}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.nif ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.email ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.telefone ?? "—"}
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
