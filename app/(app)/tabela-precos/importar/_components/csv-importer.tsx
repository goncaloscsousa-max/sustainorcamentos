"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { parseCsv } from "@/lib/csv";
import {
  tabelaPrecoSchema,
  type TabelaPrecoInput,
} from "@/lib/validation/tabela-preco";

import { commitImportAction } from "../actions";

type RowStatus =
  | { ok: true; data: TabelaPrecoInput; raw: Record<string, string> }
  | { ok: false; errors: string[]; raw: Record<string, string> };

const HEADER_MAP: Record<string, keyof TabelaPrecoInput> = {
  codigo: "codigo",
  código: "codigo",
  categoria: "categoria",
  descricao: "descricao",
  descrição: "descricao",
  unidade: "unidade",
  "preco_cliente": "precoClienteBaseCents",
  "preço_cliente": "precoClienteBaseCents",
  "preco_cliente_base": "precoClienteBaseCents",
  "preço_cliente_base": "precoClienteBaseCents",
  "custo_interno": "custoInternoBaseCents",
  "custo_interno_base": "custoInternoBaseCents",
  "rendimento_diario": "rendimentoDiario",
  "rendimento_diário": "rendimentoDiario",
  observacoes: "observacoes",
  observações: "observacoes",
  ativo: "ativo",
};

function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");
}

export function CsvImporter() {
  const router = useRouter();
  const [rows, setRows] = useState<RowStatus[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? "");
        const grid = parseCsv(text);
        if (grid.length < 2) {
          toast.error("CSV vazio ou sem linhas de dados.");
          return;
        }

        const header = grid[0].map(normalizeHeader);
        const mapped = header.map((h) => HEADER_MAP[h] ?? null);

        if (!mapped.includes("codigo") || !mapped.includes("descricao")) {
          toast.error(
            "CSV precisa pelo menos de colunas 'codigo' e 'descricao'.",
          );
          return;
        }

        const validated: RowStatus[] = [];
        for (let i = 1; i < grid.length; i++) {
          const line = grid[i];
          const raw: Record<string, string> = {};
          line.forEach((cell, idx) => {
            const key = mapped[idx];
            if (key) raw[key] = cell;
          });

          // Default para ativo se não estiver na CSV
          if (!("ativo" in raw)) raw.ativo = "true";

          const parsed = tabelaPrecoSchema.safeParse(raw);
          if (parsed.success) {
            validated.push({ ok: true, data: parsed.data, raw });
          } else {
            validated.push({
              ok: false,
              errors: parsed.error.issues.map(
                (iss) => `${iss.path.join(".")}: ${iss.message}`,
              ),
              raw,
            });
          }
        }

        setRows(validated);
        setFileName(file.name);
      } catch (err) {
        console.error(err);
        toast.error("Erro a ler CSV.");
      }
    };
    reader.readAsText(file, "utf-8");
  }

  function handleCommit() {
    if (!rows) return;
    const valid = rows.filter((r): r is Extract<RowStatus, { ok: true }> => r.ok);
    if (valid.length === 0) {
      toast.error("Sem linhas válidas para importar.");
      return;
    }

    startTransition(async () => {
      const result = await commitImportAction(valid.map((r) => r.data));
      if (result.ok) {
        toast.success(
          `Importação concluída: ${result.inserted} novos, ${result.updated} atualizados.`,
        );
        router.push("/tabela-precos");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const okCount = rows?.filter((r) => r.ok).length ?? 0;
  const errCount = rows?.filter((r) => !r.ok).length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-md border p-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="csv">Ficheiro CSV</Label>
          <Input
            id="csv"
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <p className="text-xs text-muted-foreground">
            Separador vírgula ou ponto-e-vírgula. Colunas esperadas: codigo,
            categoria, descricao, unidade, preco_cliente, custo_interno,
            rendimento_diario, observacoes, ativo.
          </p>
        </div>
      </div>

      {rows ? (
        <>
          <div className="flex items-center justify-between rounded-md border p-4">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">{fileName}</p>
              <div className="flex gap-2">
                <Badge variant="secondary">{okCount} válidas</Badge>
                {errCount > 0 ? (
                  <Badge variant="destructive">{errCount} com erros</Badge>
                ) : null}
              </div>
            </div>
            <Button
              onClick={handleCommit}
              disabled={isPending || okCount === 0}
            >
              {isPending
                ? "A importar..."
                : `Importar ${okCount} ${okCount === 1 ? "linha" : "linhas"}`}
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Unid.</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-muted-foreground">
                      {i + 2}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {r.raw.codigo ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-md truncate">
                      {r.raw.descricao ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.raw.unidade ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {r.raw.precoClienteBaseCents ?? "—"}
                    </TableCell>
                    <TableCell>
                      {r.ok ? (
                        <Badge variant="secondary">OK</Badge>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <Badge variant="destructive" className="w-fit">
                            Erro
                          </Badge>
                          <span className="text-xs text-destructive">
                            {r.errors.join("; ")}
                          </span>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      ) : null}
    </div>
  );
}
