"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCents } from "@/lib/format";

import {
  searchTabelaPrecosAction,
  type SearchResult,
} from "../search-action";

type Props = {
  onSelect: (row: SearchResult) => void;
};

export function TabelaSearch({ onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search — clearing when query is too short happens async via timeout
  useEffect(() => {
    const handle = setTimeout(() => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }
      startTransition(async () => {
        const rows = await searchTabelaPrecosAction(query);
        setResults(rows);
        setOpen(true);
      });
    }, 200);
    return () => clearTimeout(handle);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function handlePick(row: SearchResult) {
    onSelect(row);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  return (
    <div className="relative flex flex-col gap-2" ref={containerRef}>
      <Label htmlFor="tabela-search">Adicionar da tabela de preços</Label>
      <Input
        id="tabela-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Pesquisar por código ou descrição (mín. 2 carateres)..."
      />

      {open && (query.trim().length >= 2) ? (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-96 overflow-y-auto rounded-md border bg-popover shadow-md">
          {isPending && results.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">A procurar...</div>
          ) : results.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">
              Sem resultados para “{query}”.
            </div>
          ) : (
            <ul className="divide-y">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => handlePick(r)}
                    className="flex w-full items-start justify-between gap-4 p-3 text-left hover:bg-accent"
                  >
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          {r.codigo}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {r.categoria}
                        </span>
                      </div>
                      <span className="text-sm">{r.descricao}</span>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      <span className="font-mono text-sm tabular-nums">
                        {formatCents(r.precoClienteBaseCents)} / {r.unidade}
                      </span>
                      {r.custoInternoBaseCents != null ? (
                        <span className="font-mono text-xs tabular-nums text-muted-foreground">
                          custo {formatCents(r.custoInternoBaseCents)}
                        </span>
                      ) : null}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
