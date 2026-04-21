import Link from "next/link";
import { and, desc, eq, like, or } from "drizzle-orm";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/lib/db";
import { tabelaPrecos } from "@/lib/db/schema";
import { CATEGORIA_OPTIONS, formatCents } from "@/lib/format";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string; categoria?: string }>;

export default async function TabelaPrecosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q, categoria } = await searchParams;

  const conditions = [];
  if (q) {
    const pattern = `%${q}%`;
    conditions.push(
      or(
        like(tabelaPrecos.codigo, pattern),
        like(tabelaPrecos.descricao, pattern),
      ),
    );
  }
  if (categoria) conditions.push(eq(tabelaPrecos.categoria, categoria));

  const rows = await db
    .select()
    .from(tabelaPrecos)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(tabelaPrecos.createdAt));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-medium tracking-tight">
            Tabela de preços
          </h1>
          <p className="text-sm text-muted-foreground">
            Referência interna de preços para reutilizar em orçamentos.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary">
            <Link href="/tabela-precos/importar">Importar CSV</Link>
          </Button>
          <Button asChild>
            <Link href="/tabela-precos/novo">Novo item</Link>
          </Button>
        </div>
      </header>

      <form
        className="flex flex-wrap items-end gap-3 rounded-md border p-4"
        action="/tabela-precos"
      >
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="q"
            className="text-xs uppercase tracking-wider text-muted-foreground"
          >
            Pesquisar código ou descrição
          </label>
          <Input
            id="q"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Ex.: DEM, pintura..."
            className="w-72"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="categoria"
            className="text-xs uppercase tracking-wider text-muted-foreground"
          >
            Categoria
          </label>
          <select
            id="categoria"
            name="categoria"
            defaultValue={categoria ?? ""}
            className="h-9 min-w-56 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="">Todas</option>
            {CATEGORIA_OPTIONS.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <Button type="submit" variant="secondary" size="sm">
          Filtrar
        </Button>
        {q || categoria ? (
          <Button asChild variant="ghost" size="sm">
            <Link href="/tabela-precos">Limpar</Link>
          </Button>
        ) : null}
      </form>

      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Sem itens {q || categoria ? "para estes filtros" : "na tabela"}.
          </p>
          {!q && !categoria ? (
            <div className="mt-4 flex justify-center gap-2">
              <Button asChild variant="secondary">
                <Link href="/tabela-precos/importar">Importar CSV</Link>
              </Button>
              <Button asChild>
                <Link href="/tabela-precos/novo">Criar item</Link>
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Un.</TableHead>
                <TableHead className="text-right">Preço cliente</TableHead>
                <TableHead className="text-right">Custo interno</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">
                    <Link
                      href={`/tabela-precos/${p.id}`}
                      className="hover:underline"
                    >
                      {p.codigo}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-md truncate">
                    {p.descricao}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.categoria}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.unidade}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatCents(p.precoClienteBaseCents)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                    {formatCents(p.custoInternoBaseCents)}
                  </TableCell>
                  <TableCell>
                    {p.ativo ? (
                      <Badge variant="secondary">Ativo</Badge>
                    ) : (
                      <Badge variant="outline">Inativo</Badge>
                    )}
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
