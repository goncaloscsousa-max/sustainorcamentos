"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCents } from "@/lib/format";
import type { RiscoIdentificado } from "@/lib/db/schema";

import {
  deleteRiscoAction,
  toggleRiscoResolvidoAction,
} from "../ia-actions";

type Props = {
  riscos: RiscoIdentificado[];
};

const severidadeVariant: Record<string, "default" | "secondary" | "destructive"> = {
  baixa: "secondary",
  media: "default",
  alta: "destructive",
};

const severidadeLabel: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

export function RiscosPanel({ riscos }: Props) {
  const [isPending, start] = useTransition();

  function handleToggle(id: string, resolvido: boolean) {
    start(async () => {
      try {
        await toggleRiscoResolvidoAction(id, resolvido);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro.");
      }
    });
  }

  function handleDelete(id: string) {
    start(async () => {
      try {
        await deleteRiscoAction(id);
        toast.success("Risco apagado.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro.");
      }
    });
  }

  if (riscos.length === 0) return null;

  // Ordena: alta → media → baixa, e dentro disso: não-resolvido primeiro
  const ordemSeveridade: Record<string, number> = { alta: 0, media: 1, baixa: 2 };
  const ordenados = [...riscos].sort((a, b) => {
    if (a.resolvido !== b.resolvido) return a.resolvido ? 1 : -1;
    const sa = ordemSeveridade[a.severidade] ?? 9;
    const sb = ordemSeveridade[b.severidade] ?? 9;
    return sa - sb;
  });

  const totalAlta = riscos.filter((r) => r.severidade === "alta" && !r.resolvido).length;
  const totalMedia = riscos.filter((r) => r.severidade === "media" && !r.resolvido).length;
  const totalBaixa = riscos.filter((r) => r.severidade === "baixa" && !r.resolvido).length;
  const totalCustoAdicional = riscos
    .filter((r) => !r.resolvido && r.custoAdicionalEstimadoCents != null)
    .reduce((sum, r) => sum + (r.custoAdicionalEstimadoCents ?? 0), 0);

  return (
    <section className="rounded-md border-2 border-amber-300/60 bg-amber-50/40 dark:border-amber-700/50 dark:bg-amber-950/20">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-amber-300/60 dark:border-amber-700/50 px-5 py-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold">
            Riscos identificados pela IA
          </h2>
          <p className="text-sm text-muted-foreground">
            Antes de assinar com o cliente, valida estes pontos no terreno.
            Marca como resolvido à medida que vais confirmando.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {totalAlta > 0 && (
            <Badge variant="destructive">{totalAlta} alta</Badge>
          )}
          {totalMedia > 0 && (
            <Badge variant="default">{totalMedia} média</Badge>
          )}
          {totalBaixa > 0 && (
            <Badge variant="secondary">{totalBaixa} baixa</Badge>
          )}
          {totalCustoAdicional > 0 && (
            <Badge variant="outline" className="font-mono">
              Risco €: +{formatCents(totalCustoAdicional)}
            </Badge>
          )}
        </div>
      </header>
      <ul className="divide-y divide-amber-200/60 dark:divide-amber-800/40">
        {ordenados.map((r) => (
          <li
            key={r.id}
            className={`flex items-start gap-4 px-5 py-4 ${r.resolvido ? "opacity-50" : ""}`}
          >
            <Checkbox
              className="mt-1.5"
              checked={r.resolvido}
              onCheckedChange={(v) => handleToggle(r.id, v === true)}
              disabled={isPending}
              aria-label="Marcar como resolvido"
            />
            <div className="flex flex-1 flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={severidadeVariant[r.severidade] ?? "default"}>
                  {severidadeLabel[r.severidade] ?? r.severidade}
                </Badge>
                {r.fonte ? (
                  <span className="text-xs text-muted-foreground">
                    Fonte: {r.fonte}
                  </span>
                ) : null}
                {r.custoAdicionalEstimadoCents != null ? (
                  <span className="font-mono text-xs font-medium text-amber-700 dark:text-amber-400">
                    Custo extra estimado: +{formatCents(r.custoAdicionalEstimadoCents)}
                  </span>
                ) : null}
              </div>
              <p
                className={`text-sm leading-relaxed ${r.resolvido ? "line-through" : "font-medium"}`}
              >
                {r.descricao}
              </p>
              {r.impactoEstimado ? (
                <div className="rounded-md border border-amber-200/60 bg-background/60 px-3 py-2 dark:border-amber-800/40">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Impacto se ignorado
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed">
                    {r.impactoEstimado}
                  </p>
                </div>
              ) : null}
              {r.recomendacao ? (
                <div className="rounded-md border border-emerald-200/60 bg-emerald-50/40 px-3 py-2 dark:border-emerald-800/40 dark:bg-emerald-950/20">
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    O que fazer
                  </p>
                  <p className="mt-0.5 whitespace-pre-line text-sm leading-relaxed">
                    {r.recomendacao}
                  </p>
                </div>
              ) : null}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => handleDelete(r.id)}
              disabled={isPending}
              aria-label="Apagar risco"
            >
              <Trash2 aria-hidden className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
